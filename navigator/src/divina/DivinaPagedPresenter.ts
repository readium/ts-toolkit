import { Page, Publication, ReadingProgression } from "@readium/shared";
import { VisualNavigatorViewport } from "../Navigator.ts";
import { isTypedOMSupported } from "../epub/fxl/FXLPeripherals.ts";
import { DivinaPageManager } from "./DivinaPageManager.ts";
import { DivinaManagerEventKey, DivinaPagedManager, DivinaPeripherals } from "./DivinaPeripherals.ts";
import { DivinaPage, DivinaSpreader } from "./DivinaSpreader.ts";

const UPPER_BOUNDARY = 8; // Unload pages further than this many items away
const LOWER_BOUNDARY = 4; // Load pages within this many items
const OFFSCREEN_LOAD_DELAY = 300; // Delay offscreen loads to avoid janking the slide animation
const SLIDE_FAST = 150;
const SLIDE_SLOW = 500;

export type DivinaPresenterListener = (key: DivinaManagerEventKey, data: unknown) => void;

/**
 * Horizontal paged presenter for Divina publications: a sliding spine of
 * page slots with synthetic spreads, ported from the FXLFramePoolManager
 * slider core but rendering <img> pages instead of iframes.
 *
 * Slot model: in double-page mode every spread occupies exactly two slots
 * (single pages get a double-width slot), so slide indices are always even
 * and always aligned with spread boundaries.
 */
export class DivinaPagedPresenter implements DivinaPagedManager {
    private readonly container: HTMLElement;
    private readonly pub: Publication;
    private readonly spreader: DivinaSpreader;
    private readonly pool: Map<number, DivinaPageManager>;

    public readonly bookElement: HTMLDivElement;
    public readonly spineElement: HTMLDivElement;
    public readonly peripherals: DivinaPeripherals;

    public width = 0;
    public height = 0;
    public currentSlide = 0;
    private transform: number | undefined;
    private spread: boolean;
    private orientationInternal = -1; // Portrait = 1, Landscape = 0, Unknown = -1
    private containerHeightCached: number;
    private destroyed = false;
    private loadTimers: Map<number, number> = new Map();

    public listener: DivinaPresenterListener = () => {};

    constructor(
        container: HTMLElement,
        pub: Publication,
        spreader: DivinaSpreader,
        pool: Map<number, DivinaPageManager>,
        spreads: boolean
    ) {
        this.container = container;
        this.pub = pub;
        this.spreader = spreader;
        this.pool = pool;
        this.spread = spreads;
        this.containerHeightCached = container.clientHeight;

        this.bookElement = document.createElement("div");
        this.bookElement.ariaLabel = "Book";
        this.bookElement.tabIndex = -1;
        this.updateBookStyle(true);

        this.spineElement = document.createElement("div");
        this.spineElement.ariaLabel = "Spine";

        this.bookElement.appendChild(this.spineElement);
        this.container.appendChild(this.bookElement);

        const fragment = document.createDocumentFragment();
        this.spreader.pages.forEach((page) => {
            const pm = this.pool.get(page.index)!;
            pm.setMode("paged");
            pm.wrapper.style.cssFloat = pm.wrapper.style.float = this.rtl ? "right" : "left";
            pm.wrapper.style.contain = "strict";
            fragment.appendChild(pm.wrapper);
        });
        this.spineElement.appendChild(fragment);

        this.updateSpineStyle(false);
        this.updateSlotSizes();

        this.peripherals = new DivinaPeripherals(this);
    }

    public get rtl() {
        return this.pub.metadata.effectiveReadingProgression === ReadingProgression.rtl;
    }

    private get single() {
        return !this.spread || this.portrait;
    }

    public get perPage() {
        return (this.spread && !this.portrait) ? 2 : 1;
    }

    get threshold(): number {
        return 50;
    }

    get portrait(): boolean {
        if(this.orientationInternal === -1) {
            this.orientationInternal = this.containerHeightCached > this.container.clientWidth ? 1 : 0;
        }
        return this.orientationInternal === 1;
    }

    get slength() {
        return this.spreader.pages.length;
    }

    /** Total slot count in the current mode */
    get length() {
        return this.single ? this.slength : this.spreader.slotCount;
    }

    /**
     * The x position of a slot boundary within the spine, snapped to device
     * pixels. Fractional boundaries leave hairline gaps at the spread gutter
     * (the background shows through between the two page images), varying
     * with the window size.
     */
    private slotEdge(slot: number): number {
        const dpr = window.devicePixelRatio || 1;
        return Math.round(slot * (this.width / this.perPage) * dpr) / dpr;
    }

    private get offset() {
        return (this.rtl ? 1 : -1) * this.slotEdge(this.currentSlide);
    }

    get doNotDisturb() {
        return this.peripherals.pan.touchID > 0;
    }

    /** The reading-order index of the first page of the current spread */
    get currentIndex(): number {
        return this.single ?
            Math.max(0, Math.min(this.currentSlide, this.slength - 1)) :
            this.spreader.itemOfSlot(this.currentSlide);
    }

    /** The pages currently (meant to be) visible */
    get currentSpread(): DivinaPage[] {
        if(this.perPage < 2) {
            return [this.spreader.pages[this.currentIndex]];
        }
        return this.spreader.spreadOfItem(this.currentIndex);
    }

    private updateDimensions() {
        this.width = this.bookElement.clientWidth;
        this.height = this.bookElement.clientHeight;
    }

    // Reused typed transform for the per-event zoom/pan write (see the
    // matching note in DivinaPeripherals: mutation beats reallocation)
    private bookScale: CSSScale | null = null;
    private bookTranslate: CSSTranslate | null = null;
    private bookTransform: CSSTransformValue | null = null;

    public updateBookStyle(initial = false) {
        if(initial) {
            const bookStyle = {
                overflow: "hidden",
                direction: this.pub.metadata.effectiveReadingProgression,
                cursor: "",
                height: "100%",
                width: "100%",
                position: "relative",
                outline: "none",
                transition: this.peripherals?.dragState ? "none" : "transform .15s ease-in-out",
                touchAction: "none",
            } as unknown as CSSStyleDeclaration;
            Object.assign(this.bookElement.style, bookStyle);
        }
        const scale = this.peripherals?.scale || 1;
        const translateX = this.peripherals?.pan.translateX || 0;
        const translateY = this.peripherals?.pan.translateY || 0;
        if(isTypedOMSupported()) {
            if(!this.bookTransform) {
                this.bookScale = new CSSScale(1, 1);
                this.bookTranslate = new CSSTranslate(CSS.px(0), CSS.px(0), CSS.px(0));
                this.bookTransform = new CSSTransformValue([this.bookScale, this.bookTranslate]);
            }
            (this.bookScale!.x as CSSUnitValue).value = scale;
            (this.bookScale!.y as CSSUnitValue).value = scale;
            (this.bookTranslate!.x as CSSUnitValue).value = translateX;
            (this.bookTranslate!.y as CSSUnitValue).value = translateY;
            this.bookElement.attributeStyleMap.set("transform", this.bookTransform);
        } else {
            this.bookElement.style.transform = `scale(${scale}) translate3d(${translateX}px, ${translateY}px, 0px)`;
        }
    }

    public updateSpineStyle(animate: boolean, fast = true) {
        this.updateDimensions();
        if(isTypedOMSupported()) {
            this.spineElement.attributeStyleMap.set("transition", new CSSUnparsedValue([animate ? `all ${fast ? SLIDE_FAST : SLIDE_SLOW}ms ease-out` : "all 0ms ease-out"]));
            this.spineElement.attributeStyleMap.set("width", CSS.px(this.slotEdge(this.length)));
            this.spineElement.attributeStyleMap.set("height", CSS.percent(100));
            this.transform !== undefined ? this.spineElement.attributeStyleMap.set("transform", new CSSTransformValue([
                new CSSTranslate(CSS.px(this.transform || 0), CSS.px(0), CSS.px(0))
            ])) : this.spineElement.attributeStyleMap.delete("transform");
            this.spineElement.attributeStyleMap.set("contain", new CSSUnparsedValue(["content"]));
        } else {
            const spineStyle = {
                transition: animate ? `all ${fast ? SLIDE_FAST : SLIDE_SLOW}ms ease-out` : "all 0ms ease-out",
                width: `${this.slotEdge(this.length)}px`,
                height: "100%",
                transform: this.transform !== undefined ? `translate3d(${this.transform}px, 0px, 0px)` : "",
                contain: "content"
            } as unknown as CSSStyleDeclaration;
            Object.assign(this.spineElement.style, spineStyle);
        }
    }

    /**
     * Recompute every slot's width and height. Widths are derived from
     * device-pixel-snapped slot boundaries so adjacent pages of a spread
     * meet exactly at the gutter without subpixel seams.
     */
    private updateSlotSizes() {
        this.updateDimensions();
        const typedOM = isTypedOMSupported();
        this.spreader.pages.forEach((page) => {
            const pm = this.pool.get(page.index)!;
            const span = !this.single && this.spreader.isDouble(page.index) ? 2 : 1;
            const start = this.single ? page.index : this.spreader.slotOfItem(page.index);
            const width = this.slotEdge(start + span) - this.slotEdge(start);
            if(typedOM) {
                pm.wrapper.attributeStyleMap.set("width", CSS.px(width));
                pm.wrapper.attributeStyleMap.set("height", CSS.px(this.height));
            } else {
                pm.wrapper.style.width = `${width}px`;
                pm.wrapper.style.height = `${this.height}px`;
            }
        });
    }

    reAlign(index: number = this.currentSlide) {
        if (index % 2 && !this.single) // Prevent getting out of track
            index++;
        return index;
    }

    /**
     * Moves the spine to the position of the currently active slide.
     * Always commits: the spine transform may have been written directly by
     * the peripherals during a drag (snap-back relies on this), and reading
     * style.transform back for comparison is unreliable under CSS Typed OM.
     */
    slideToCurrent(enableTransition?: boolean, fast = true) {
        this.updateDimensions();
        const commit = (animate: boolean) => {
            this.transform = this.offset;
            this.updateSpineStyle(animate, fast);
            this.deselect();
        };
        if (enableTransition) {
            // Double rAF guarantees the transition fires:
            // https://youtu.be/cCOL7MC4Pl0
            requestAnimationFrame(() => {
                requestAnimationFrame(() => commit(true));
            });
        } else {
            commit(false);
        }
    }

    bounce(rtl = false) {
        requestAnimationFrame(() => {
            this.transform = this.offset + (50 * (rtl ? 1 : -1));
            this.updateSpineStyle(true, true);
            setTimeout(() => {
                if(this.destroyed) return;
                this.transform = this.offset;
                this.updateSpineStyle(true, true);
            }, 100);
        });
    }

    private onChange() {
        this.peripherals.scale = 1;
        this.peripherals.pan.translateX = 0;
        this.peripherals.pan.translateY = 0;
        this.updateBookStyle();
    }

    /**
     * Go to the next spread/page.
     * @returns whether moving forward was possible
     */
    next(): boolean {
        if (this.length <= this.perPage) return false;

        const beforeChange = this.currentSlide;
        this.currentSlide = Math.min(this.currentSlide + this.perPage, this.length - this.perPage);
        this.currentSlide = this.reAlign();

        if (beforeChange !== this.currentSlide) {
            this.slideToCurrent(true);
            this.onChange();
            return true;
        } else {
            this.bounce(this.rtl);
            return false;
        }
    }

    /**
     * Go to the previous spread/page.
     * @returns whether moving backward was possible
     */
    prev(): boolean {
        if (this.length <= this.perPage) return false;

        const beforeChange = this.currentSlide;
        this.currentSlide = this.reAlign(Math.max(this.currentSlide - this.perPage, 0));

        if (beforeChange !== this.currentSlide) {
            this.slideToCurrent(true);
            this.onChange();
            return true;
        } else {
            this.bounce(!this.rtl);
            return false;
        }
    }

    /**
     * Go to the slide showing the given reading order item.
     * @returns whether the slide changed
     */
    /**
     * The slide showing the given item in the current mode: the item index
     * itself in single mode, or the start slot of the item's spread in
     * double-page mode (the item may occupy the spread's second slot).
     */
    private slideForItem(itemIndex: number): number {
        const clamped = Math.max(0, Math.min(itemIndex, this.slength - 1));
        return this.single ?
            clamped :
            this.spreader.slotOfItem(this.spreader.spreadOfItem(clamped)[0].index);
    }

    goToItem(itemIndex: number, animated = true): boolean {
        const target = this.slideForItem(itemIndex);
        if(target === this.currentSlide) return false;
        this.currentSlide = target;
        this.slideToCurrent(animated);
        this.onChange();
        return true;
    }

    /**
     * Loads pages within the load window around the current position,
     * unloads distant ones, and positions the current spread.
     */
    async update(): Promise<void> {
        if(this.destroyed) return;
        const i = this.currentIndex;
        const spread = this.currentSpread;
        const spreadIndexes = new Set(spread.map(p => p.index));

        this.spreader.pages.forEach((page) => {
            const pm = this.pool.get(page.index)!;
            const distance = Math.abs(page.index - i);
            if(distance > UPPER_BOUNDARY) {
                const timer = this.loadTimers.get(page.index);
                if(timer) {
                    clearTimeout(timer);
                    this.loadTimers.delete(page.index);
                }
                pm.unload();
            } else if(distance <= LOWER_BOUNDARY && !spreadIndexes.has(page.index)) {
                // Load offscreen neighbors after a delay so decoding doesn't
                // jank the slide animation
                if(!pm.loaded && !this.loadTimers.has(page.index)) {
                    const timer = window.setTimeout(() => {
                        this.loadTimers.delete(page.index);
                        if(!this.destroyed) pm.load();
                    }, OFFSCREEN_LOAD_DELAY);
                    this.loadTimers.set(page.index, timer);
                }
            }
        });

        // Current spread: load immediately and position against the gutter
        await Promise.all(spread.map((page) => {
            const pm = this.pool.get(page.index)!;
            const timer = this.loadTimers.get(page.index);
            if(timer) {
                clearTimeout(timer);
                this.loadTimers.delete(page.index);
            }
            this.placePage(spread, page);
            return pm.load();
        }));
    }

    /**
     * Fit a page of the current spread within its slot. A lone portrait page
     * with a left/right hint (shifted cover, orphaned spread half) is fitted
     * into its half of the full-spread slot; everything else is fitted to the
     * whole slot and anchored against the gutter (or centered).
     */
    private placePage(spread: DivinaPage[], page: DivinaPage) {
        const pm = this.pool.get(page.index);
        if(!pm) return;
        if(this.perPage > 1 && spread.length === 1 && !page.isLandscape && page.page !== Page.center) {
            pm.fit(page.page, true);
        } else {
            pm.fit(this.spreader.spreadPosition(spread, page, this.perPage));
        }
    }

    /** Union of the current spread's image bounds, used for zoom/pan clamping */
    get currentBounds(): DOMRect {
        const ret = {
            x: 0, y: 0, width: 0, height: 0,
            top: 0, right: 0, bottom: 0, left: 0,
            toJSON() { return this; },
        };
        this.currentSpread.forEach(page => {
            const pm = this.pool.get(page.index);
            if(!pm) return;
            const b = pm.img.getBoundingClientRect();
            ret.x = Math.min(ret.x, b.x);
            ret.y = Math.min(ret.y, b.y);
            ret.width += b.width;
            ret.height = Math.max(ret.height, b.height);
            ret.top = Math.min(ret.top, b.top);
            ret.right = Math.min(ret.right, b.right);
            ret.bottom = Math.min(ret.bottom, b.bottom);
            ret.left = Math.min(ret.left, b.left);
        });
        return ret as DOMRect;
    }

    get viewport(): VisualNavigatorViewport {
        const viewport: VisualNavigatorViewport = {
            readingOrder: [],
            progressions: new Map(),
            positions: null
        };
        const positions: number[] = [];
        this.currentSpread.forEach(page => {
            viewport.readingOrder.push(page.link.href);
            viewport.progressions.set(page.link.href, { start: 0, end: 1 }); // Paged always uses [0,1]
            positions.push(page.number);
        });
        viewport.positions = positions;
        return viewport;
    }

    /**
     * When the container resizes, resize slider components as well
     */
    resizeHandler(slide = true, fast = true) {
        // Capture the current item BEFORE invalidating the orientation cache:
        // currentSlide's domain (item vs slot index) depends on the mode, which
        // may flip with the orientation.
        const item = this.currentIndex;
        this.containerHeightCached = this.container.clientHeight;
        this.orientationInternal = -1;
        this.currentSlide = this.slideForItem(item);

        this.updateSpineStyle(false);
        this.updateSlotSizes();
        if(slide) {
            this.slideToCurrent(!fast, fast);
        }
        // Reposition the current spread against the gutter (perPage may have changed)
        const spread = this.currentSpread;
        spread.forEach((page) => this.placePage(spread, page));
    }

    /** Toggle double-page spreads (from preferences) */
    setSpreads(spreads: boolean) {
        if(this.spread === spreads) return;
        const item = this.currentIndex;
        this.spread = spreads;
        this.currentSlide = this.slideForItem(item);
        requestAnimationFrame(() => {
            if(this.destroyed) return;
            this.resizeHandler(true);
            this.update();
        });
    }

    deselect() {
        this.container.ownerDocument.defaultView?.getSelection()?.removeAllRanges();
    }

    async destroy() {
        this.destroyed = true;
        this.loadTimers.forEach(t => clearTimeout(t));
        this.loadTimers.clear();
        this.peripherals.destroy();
        // The page wrappers belong to the shared pool; detach them without destroying
        this.spineElement.replaceChildren();
        this.bookElement.remove();
    }
}
