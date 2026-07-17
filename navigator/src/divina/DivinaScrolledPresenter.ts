import { ProgressionRange, VisualNavigatorViewport } from "../Navigator.ts";
import { DivinaPageManager } from "./DivinaPageManager.ts";
import { DivinaSpreader } from "./DivinaSpreader.ts";

const UPPER_BOUNDARY = 10; // Unload pages further than this many items away
const LOWER_BOUNDARY = 5; // Load pages within this many items
const SCROLL_STEP_FACTOR = 0.8; // goForward/goBackward scroll this fraction of the viewport
const POSITION_DEBOUNCE = 150; // ms of scroll quiet before reporting the position
const PROGRAMMATIC_SCROLL_TIMEOUT = 1200; // Fallback for browsers without scrollend

export type DivinaScrolledEventKey = "scroll" | "position" | "tap" | "click";
export type DivinaScrolledListener = (key: DivinaScrolledEventKey, data: unknown) => void;

/**
 * Vertical scrolled ("webtoon") presenter for Divina publications: all pages
 * stacked in a native scroll container with no gaps, constrained to a
 * configurable strip width, based on xbreader but improved
 *
 * Page offsets are cached and looked up with binary search so per-frame
 * scroll work stays constant regardless of publication size.
 */
export class DivinaScrolledPresenter {
    private readonly container: HTMLElement;
    private readonly spreader: DivinaSpreader;
    private readonly pool: Map<number, DivinaPageManager>;

    public readonly scrollerElement: HTMLDivElement;
    private stripWidth: number;
    private destroyed = false;
    private scrollRAF = 0;
    private restoreRAF = 0;
    private positionTimer = 0;
    private lastScrollTop = 0;
    /** Position within the strip as a fraction of total strip height (resize retention) */
    private fraction = 0;

    // Cached layout metrics, refreshed on relayout and self-healed on drift
    private pageTops: number[] = [];
    private pageHeights: number[] = [];
    private stripHeightCached = 0;
    private viewportHeightCached = 0;

    // Load-window bookkeeping
    private loadedIndices: Set<number> = new Set();
    private lastWindowIndex = -1;

    // Programmatic scrolling (keyboard nav, goTo, restores): suppresses
    // "scroll" listener emissions and accumulates chained smooth targets
    private programmaticScroll = false;
    private programmaticTimer = 0;
    private scrollTarget: number | null = null;

    public listener: DivinaScrolledListener = () => {};

    constructor(
        container: HTMLElement,
        spreader: DivinaSpreader,
        pool: Map<number, DivinaPageManager>,
        stripWidth: number
    ) {
        this.container = container;
        this.spreader = spreader;
        this.pool = pool;
        this.stripWidth = stripWidth;

        this.scrollerElement = document.createElement("div");
        this.scrollerElement.ariaLabel = "Book";
        this.scrollerElement.tabIndex = -1;
        Object.assign(this.scrollerElement.style, {
            overflowY: "auto",
            overflowX: "hidden",
            height: "100%",
            width: "100%",
            position: "relative",
            outline: "none",
            overscrollBehavior: "contain",
        } as unknown as CSSStyleDeclaration);

        const fragment = document.createDocumentFragment();
        this.spreader.pages.forEach((page) => {
            const pm = this.pool.get(page.index)!;
            pm.setMode("scrolled");
            pm.wrapper.style.removeProperty("contain");
            fragment.appendChild(pm.wrapper);
        });
        this.scrollerElement.appendChild(fragment);
        this.container.appendChild(this.scrollerElement);

        this.applyStripWidth(stripWidth);

        this.scrollerElement.addEventListener("scroll", this.bscrollHandler, { passive: true });
        this.scrollerElement.addEventListener("scrollend", this.bscrollendHandler);
        this.scrollerElement.addEventListener("wheel", this.buserTakeoverHandler, { passive: true });
        this.scrollerElement.addEventListener("mousedown", this.bmousedownHandler);
        this.scrollerElement.addEventListener("mouseup", this.bclickHandler);
        this.scrollerElement.addEventListener("touchend", this.btouchendHandler);
        this.scrollerElement.addEventListener("touchstart", this.btouchstartHandler, { passive: true });
    }

    private readonly bscrollHandler = this.scrollHandler.bind(this);
    private readonly bscrollendHandler = this.scrollendHandler.bind(this);
    private readonly buserTakeoverHandler = this.userTakeoverHandler.bind(this);
    private readonly bmousedownHandler = this.mousedownHandler.bind(this);
    private readonly bclickHandler = this.clickHandler.bind(this);
    private readonly btouchendHandler = this.touchendHandler.bind(this);
    private readonly btouchstartHandler = this.touchstartHandler.bind(this);

    /** Display width of each page in the strip */
    private get displayWidth(): number {
        return Math.max(1, Math.min(this.stripWidth, this.scrollerElement.clientWidth || this.container.clientWidth));
    }

    /**
     * Recomputes the cached page offsets and viewport metrics.
     * Cheap relative to the per-frame layout reads it replaces, but still a
     * forced layout: only call after actual layout changes.
     */
    private refreshLayoutCache() {
        this.viewportHeightCached = this.scrollerElement.clientHeight;
        this.stripHeightCached = this.scrollerElement.scrollHeight;
        const n = this.spreader.pages.length;
        this.pageTops = new Array(n);
        this.pageHeights = new Array(n);
        for (const page of this.spreader.pages) {
            const w = this.pool.get(page.index)!.wrapper;
            this.pageTops[page.index] = w.offsetTop;
            this.pageHeights[page.index] = Math.max(1, w.offsetHeight);
        }
    }

    /** The index of the last page whose top is at or above the given strip offset */
    private indexAtOffset(offset: number): number {
        const tops = this.pageTops;
        let lo = 0, hi = tops.length - 1, ans = 0;
        while (lo <= hi) {
            const mid = (lo + hi) >> 1;
            if (tops[mid] <= offset) { ans = mid; lo = mid + 1; } else hi = mid - 1;
        }
        return ans;
    }

    applyStripWidth(stripWidth: number) {
        this.stripWidth = stripWidth;
        const fraction = this.fraction;
        const w = this.displayWidth;
        this.spreader.pages.forEach((page) => {
            this.pool.get(page.index)?.applyStripWidth(w);
        });
        this.refreshLayoutCache();
        // Restore the relative position after the relayout
        this.restoreFraction(fraction);
    }

    private restoreFraction(fraction: number) {
        cancelAnimationFrame(this.restoreRAF);
        this.restoreRAF = requestAnimationFrame(() => {
            if(this.destroyed) return;
            const target = fraction * this.stripHeightCached;
            if(Math.abs(this.scrollerElement.scrollTop - target) >= 1) {
                this.beginProgrammaticScroll();
                this.scrollTarget = target;
                this.scrollerElement.scrollTop = target;
            }
            this.updateFraction();
        });
    }

    private updateFraction() {
        const h = this.stripHeightCached;
        this.fraction = h > 0 ? this.scrollerElement.scrollTop / h : 0;
    }

    /** Top offset in pixels of the given page within the strip */
    private pageTop(index: number): number {
        return this.pageTops[index] ?? 0;
    }

    private pageHeight(index: number): number {
        return this.pageHeights[index] ?? 1;
    }

    /**
     * The reading-order index of the current page: the last page whose top
     * is above the middle of the viewport.
     */
    get currentIndex(): number {
        if(!this.pageTops.length) return 0;
        return this.indexAtOffset(this.scrollerElement.scrollTop + this.viewportHeightCached * 0.5);
    }

    /** Progression within the current page (0..1) */
    get currentPageProgression(): number {
        const i = this.currentIndex;
        return Math.max(0, Math.min(1, (this.scrollerElement.scrollTop - this.pageTop(i)) / this.pageHeight(i)));
    }

    /**
     * Marks the start of a programmatic scroll: "scroll" events are not
     * reported to the host until the scroll settles (scrollend or timeout),
     * so navigation doesn't masquerade as user scrolling.
     */
    private beginProgrammaticScroll() {
        this.programmaticScroll = true;
        window.clearTimeout(this.programmaticTimer);
        this.programmaticTimer = window.setTimeout(() => {
            this.programmaticScroll = false;
            this.scrollTarget = null;
            this.settleWindow();
        }, PROGRAMMATIC_SCROLL_TIMEOUT);
    }

    private scrollendHandler() {
        window.clearTimeout(this.programmaticTimer);
        this.programmaticScroll = false;
        this.scrollTarget = null;
        this.settleWindow();
    }

    /** Load the window around wherever the scroll settled */
    private settleWindow() {
        if(this.destroyed || !this.pageTops.length) return;
        const index = this.currentIndex;
        this.lastWindowIndex = index;
        this.updateWindow(index);
    }

    /** Direct user input takes over any in-flight programmatic scroll */
    private userTakeoverHandler() {
        window.clearTimeout(this.programmaticTimer);
        this.programmaticScroll = false;
        this.scrollTarget = null;
    }

    private scrollHandler() {
        if(this.destroyed) return;
        cancelAnimationFrame(this.scrollRAF);
        this.scrollRAF = requestAnimationFrame(() => {
            if(this.destroyed) return;
            const st = this.scrollerElement.scrollTop;
            const delta = st - this.lastScrollTop;
            this.lastScrollTop = st;

            // Self-heal the layout cache if something (e.g. an image decode
            // correcting an unknown aspect ratio) changed the strip height
            if(Math.abs(this.scrollerElement.scrollHeight - this.stripHeightCached) > 1)
                this.refreshLayoutCache();

            this.updateFraction();
            if(!this.programmaticScroll && delta !== 0) {
                this.listener("scroll", delta);
            }

            // While a programmatic scroll (e.g. a held navigation key) is in
            // flight, defer loading: pages rushing by would only churn
            // fetches. The window is loaded when the scroll settles.
            const index = this.currentIndex;
            if(index !== this.lastWindowIndex && !this.programmaticScroll) {
                this.lastWindowIndex = index;
                this.updateWindow(index);
            }

            window.clearTimeout(this.positionTimer);
            this.positionTimer = window.setTimeout(() => {
                if(this.destroyed) return;
                this.listener("position", this.currentIndex);
            }, POSITION_DEBOUNCE);
        });
    }

    /** Load nearby pages, unload distant ones */
    private updateWindow(center: number) {
        const n = this.spreader.pages.length;
        for (let i = Math.max(0, center - LOWER_BOUNDARY); i <= Math.min(n - 1, center + LOWER_BOUNDARY); i++) {
            this.pool.get(i)?.load();
            this.loadedIndices.add(i);
        }
        for (const i of this.loadedIndices) {
            if(Math.abs(i - center) > UPPER_BOUNDARY) {
                this.pool.get(i)?.unload();
                this.loadedIndices.delete(i);
            }
        }
    }

    private touchStartY: number | null = null;
    private lastTouchEnd = 0;

    private touchstartHandler(e: TouchEvent) {
        this.userTakeoverHandler();
        this.touchStartY = e.touches.length === 1 ? e.touches[0].clientY : null;
    }

    private touchendHandler(e: TouchEvent) {
        if(this.touchStartY === null || e.changedTouches.length !== 1) return;
        const dy = Math.abs(e.changedTouches[0].clientY - this.touchStartY);
        this.touchStartY = null;
        if(dy <= 5) {
            // Suppress the compatibility mouse events for this tap
            if(e.cancelable) e.preventDefault();
            this.lastTouchEnd = performance.now();
            this.emitPointer("tap", e.changedTouches[0].clientX, e.changedTouches[0].clientY);
        }
    }

    private mouseDownPos: { x: number, y: number } | null = null;

    private mousedownHandler(e: MouseEvent) {
        this.mouseDownPos = e.button === 0 ? { x: e.clientX, y: e.clientY } : null;
    }

    private clickHandler(e: MouseEvent) {
        // Mouseup alone can't distinguish a click from the end of a drag; compare with mousedown
        if(e.button !== 0 || this.mouseDownPos === null) return;
        const moved = Math.abs(e.clientX - this.mouseDownPos.x) + Math.abs(e.clientY - this.mouseDownPos.y);
        this.mouseDownPos = null;
        // Ignore compatibility mouse events synthesized after a touch tap
        if(performance.now() - this.lastTouchEnd < 700) return;
        if(moved <= 5) this.emitPointer("click", e.clientX, e.clientY);
    }

    private emitPointer(key: "tap" | "click", clientX: number, clientY: number) {
        const rect = this.scrollerElement.getBoundingClientRect();
        const dpr = window.devicePixelRatio || 1;
        this.listener(key, {
            x: (clientX - rect.left) * dpr,
            y: (clientY - rect.top) * dpr,
            clientX,
            clientY,
            doNotDisturb: false
        });
    }

    /**
     * Scroll forward/backward by a fraction of the viewport.
     * Repeated calls chain from the pending target, so rapid key presses
     * extend one smooth animation instead of restarting it.
     * @returns whether scrolling was possible
     */
    next(animated = true): boolean {
        const max = this.scrollerElement.scrollHeight - this.scrollerElement.clientHeight;
        const base = this.scrollTarget ?? this.scrollerElement.scrollTop;
        if(base >= max - 1) return false;
        this.scrollToTarget(Math.min(base + this.viewportHeightCached * SCROLL_STEP_FACTOR, max), animated);
        return true;
    }

    prev(animated = true): boolean {
        const base = this.scrollTarget ?? this.scrollerElement.scrollTop;
        if(base <= 1) return false;
        this.scrollToTarget(Math.max(base - this.viewportHeightCached * SCROLL_STEP_FACTOR, 0), animated);
        return true;
    }

    private scrollToTarget(target: number, animated: boolean) {
        this.beginProgrammaticScroll();
        this.scrollTarget = target;
        this.scrollerElement.scrollTo({ top: target, behavior: animated ? "smooth" : "auto" });
    }

    /**
     * Go to the top of a page, optionally at a progression within it.
     * @returns whether the position changed
     */
    goToItem(itemIndex: number, animated = false, progression = 0): boolean {
        // A pending layout-restore would stomp this explicit navigation
        cancelAnimationFrame(this.restoreRAF);
        const index = Math.max(0, Math.min(itemIndex, this.spreader.pages.length - 1));
        const top = this.pageTop(index) + progression * this.pageHeight(index);
        if(Math.abs(this.scrollerElement.scrollTop - top) < 1) return false;
        this.scrollToTarget(top, animated);
        if(!animated) this.updateFraction();
        return true;
    }

    async update(): Promise<void> {
        if(this.destroyed) return;
        const index = this.currentIndex;
        this.lastWindowIndex = index;
        this.updateWindow(index);
        const pm = this.pool.get(index);
        if(pm) await pm.load();
    }

    get atStart(): boolean {
        return this.scrollerElement.scrollTop <= 1;
    }

    get atEnd(): boolean {
        return this.scrollerElement.scrollTop >= this.stripHeightCached - this.viewportHeightCached - 1;
    }

    get viewport(): VisualNavigatorViewport {
        const viewport: VisualNavigatorViewport = {
            readingOrder: [],
            progressions: new Map(),
            positions: null
        };
        if(!this.pageTops.length) return viewport;
        const top = this.scrollerElement.scrollTop;
        const bottom = top + this.viewportHeightCached;
        const positions: number[] = [];
        for (let i = this.indexAtOffset(top); i < this.spreader.pages.length; i++) {
            const pTop = this.pageTop(i);
            if(pTop >= bottom) break;
            const h = this.pageHeight(i);
            if(pTop + h <= top) continue;
            const page = this.spreader.pages[i];
            const range: ProgressionRange = {
                start: Math.max(0, (top - pTop) / h),
                end: Math.min(1, (bottom - pTop) / h)
            };
            viewport.readingOrder.push(page.link.href);
            viewport.progressions.set(page.link.href, range);
            positions.push(page.number);
        }
        viewport.positions = positions.length ? positions : null;
        return viewport;
    }

    resizeHandler() {
        const fraction = this.fraction;
        const w = this.displayWidth;
        this.spreader.pages.forEach((page) => {
            this.pool.get(page.index)?.applyStripWidth(w);
        });
        this.refreshLayoutCache();
        this.restoreFraction(fraction);
    }

    async destroy() {
        this.destroyed = true;
        cancelAnimationFrame(this.scrollRAF);
        cancelAnimationFrame(this.restoreRAF);
        window.clearTimeout(this.positionTimer);
        window.clearTimeout(this.programmaticTimer);
        this.scrollerElement.removeEventListener("scroll", this.bscrollHandler);
        this.scrollerElement.removeEventListener("scrollend", this.bscrollendHandler);
        this.scrollerElement.removeEventListener("wheel", this.buserTakeoverHandler);
        this.scrollerElement.removeEventListener("mousedown", this.bmousedownHandler);
        this.scrollerElement.removeEventListener("mouseup", this.bclickHandler);
        this.scrollerElement.removeEventListener("touchend", this.btouchendHandler);
        this.scrollerElement.removeEventListener("touchstart", this.btouchstartHandler);
        // The page wrappers belong to the shared pool; detach without destroying
        this.scrollerElement.replaceChildren();
        this.scrollerElement.remove();
    }
}
