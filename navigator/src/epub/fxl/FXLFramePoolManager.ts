import { ModuleName } from "@readium/navigator-html-injectables/src";
import { Locator, Publication, ReadingProgression, Orientation, Page, Link, Spread } from "@readium/shared/src/publication";
import { FrameCommsListener } from "../frame";
import FrameBlobBuider from "../frame/FrameBlobBuilder";
import FXLFrameManager from "./FXLFrameManager";
import FXLPeripherals from "./FXLPeripherals";
import FXLSpreader from "./FXLSpreader";

const UPPER_BOUNDARY = 8;
const LOWER_BOUNDARY = 5;

const OFFSCREEN_LOAD_DELAY = 300;
const OFFSCREEN_LOAD_TIMEOUT = 15000;
const RESIZE_UPDATE_TIMEOUT = 250;
const SLIDE_FAST = 150;
const SLIDE_SLOW = 500;

export default class FramePoolManager {
    private readonly container: HTMLElement;
    private readonly positions: Locator[];
    private readonly pool: Map<string, FXLFrameManager> = new Map();
    private readonly blobs: Map<string, string> = new Map();
    private readonly inprogress: Map<string, Promise<void>> = new Map();
    private readonly delayedShow: Map<string, Promise<void>> = new Map();
    private readonly delayedTimeout: Map<string, number> = new Map();
    private currentBaseURL: string | undefined;

    // NEW
    private readonly bookElement: HTMLDivElement;
    public readonly spineElement: HTMLDivElement;
    private readonly pub: Publication;
    public width: number = 0;
    public height: number = 0;
    private transform: string = "";
    public currentSlide: number = 0;
    private spreader: FXLSpreader;
    private spread = true; // TODO
    private readonly spreadPresentation: Spread;
    private orientationInternal = -1; // Portrait = 1, Landscape = 0, Unknown = -1
    private containerHeightCached: number;
    private readonly resizeBoundHandler: EventListenerOrEventListenerObject;
    private resizeTimeout: number | undefined;
    // private readonly pages: FXLFrameManager[] = [];
    public readonly peripherals: FXLPeripherals;

    constructor(container: HTMLElement, positions: Locator[], pub: Publication) {
        this.container = container;
        this.positions = positions;
        this.pub = pub;
        this.spreadPresentation = pub.metadata.getPresentation()?.spread || Spread.auto;

        if(this.pub.metadata.effectiveReadingProgression !== ReadingProgression.rtl && this.pub.metadata.effectiveReadingProgression !== ReadingProgression.ltr)
            // TODO support TTB and BTT
            throw Error("Unsupported reading progression for EPUB");

        // NEW
        this.spreader = new FXLSpreader(this.pub);
        this.containerHeightCached = container.clientHeight;
        this.resizeBoundHandler = this.nativeResizeHandler.bind(this);

        this.ownerWindow.addEventListener("resize", this.resizeBoundHandler);
        this.ownerWindow.addEventListener("orientationchange", this.resizeBoundHandler);

        this.bookElement = document.createElement("div");
        this.bookElement.ariaLabel = "Book";
        this.bookElement.tabIndex = -1;
        this.updateBookStyle(true);

        this.spineElement = document.createElement("div");
        this.spineElement.ariaLabel = "Spine";

        this.bookElement.appendChild(this.spineElement);
        this.container.appendChild(this.bookElement);
        this.updateSpineStyle(true);

        this.peripherals = new FXLPeripherals(this);

        this.pub.readingOrder.items.forEach((link) => {
            // Create <iframe>
            const fm = new FXLFrameManager(this.peripherals, this.pub.metadata.effectiveReadingProgression, link.href);
            this.spineElement.appendChild(fm.element);

            // this.pages.push(fm);
            this.pool.set(link.href, fm);
            fm.width = 100 / this.length * (link.properties?.getOrientation() === Orientation.landscape || link.properties?.otherProperties["addBlank"] ? this.perPage : 1);
            fm.height = this.height;
        });
    }

    private _listener!: FrameCommsListener;
    public set listener(listener: FrameCommsListener) {
        this._listener = listener;
    }
    public get listener() {
        return this._listener;
    }

    public get doNotDisturb() {
        // TODO other situations
        return this.peripherals.pan.touchID > 0;
    }

    private nativeResizeHandler(_: Event) {
        this.resizeHandler(true);
    }

    /**
     * When window resizes, resize slider components as well
     */
    resizeHandler(slide = true, fast = true) {
        // relcalculate currentSlide
        // prevent hiding items when browser width increases

        if (this.currentSlide + this.perPage > this.length) {
            this.currentSlide = this.length <= this.perPage ? 0 : this.length - 1;
        }

        this.containerHeightCached = this.container.clientHeight;

        this.orientationInternal = -1;

        this.updateSpineStyle(true);
        if(slide/* && !sML.Mobile*/) {
            this.currentSlide = this.reAlign();
            this.slideToCurrent(!fast, fast);
        }

        clearTimeout(this.resizeTimeout);
        this.resizeTimeout = setTimeout(() => {
            // TODO optimize this expensive set of loops and operations 
            this.pool.forEach((frm, linkHref) => {
                let i = this.pub.readingOrder.items.findIndex(l => l.href === linkHref);
                const link = this.pub.readingOrder.items[i];
                frm.width = 100 / this.length * (link.properties?.getOrientation() === Orientation.landscape || link.properties?.otherProperties["addBlank"] ? this.perPage : 1);
                frm.height = this.height;
                if(!frm.loaded) return;
                const spread = this.spreader.findByLink(link)!;
                frm.update(this.spreadPosition(spread, link));
            });
        }, RESIZE_UPDATE_TIMEOUT);
    }

    /**
     * It is important that these values be cached to avoid spamming them on redraws, they are expensive.
     */
    private updateDimensions() {
        this.width = this.bookElement.clientWidth;
        this.height = this.bookElement.clientHeight;
        // this.containerHeightCached = r.height;
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
        if(this.spreadPresentation === Spread.none) return true; // No spreads
        if(this.orientationInternal === -1) {
            this.orientationInternal = this.containerHeightCached > this.container.clientWidth ? 1 : 0;
        }
        return this.orientationInternal === 1;
    }

    public updateSpineStyle(animate: boolean, fast = true) {
        let margin = "0";
        this.updateDimensions();
        if(this.perPage > 1 && true) // this.shift
            margin = `${this.width / 2}px`;

        const spineStyle = {
            transition: animate ? `all ${fast ? SLIDE_FAST : SLIDE_SLOW}ms ease-out` : "all 0ms ease-out",
            marginRight: this.rtl ? margin : "0",
            marginLeft: this.rtl ? "0" : margin,
            width: `${(this.width / this.perPage) * this.length}px`,
            transform: this.transform,

            // Static (should be moved to CSS)
            contain: "content"
        } as CSSStyleDeclaration;

        Object.assign(this.spineElement.style, spineStyle);
    }

    public updateBookStyle(initial=false) {
        if(initial) {
            const bookStyle = {
                overflow: "hidden",
                direction: this.pub.metadata.effectiveReadingProgression,
                cursor: "",
                // Static (should be moved to CSS)
                // minHeight: 100%
                // maxHeight: "100%",
                height: "100%",
                width: "100%",
                position: "relative",
                outline: "none",
                transition: this.peripherals?.dragState ? "none" : "transform .15s ease-in-out",
                touchAction: "none",
            } as CSSStyleDeclaration;
            Object.assign(this.bookElement.style, bookStyle);
        }
        this.bookElement.style.transform = `scale(${this.peripherals?.scale || 1})` + (this.peripherals ? ` translate3d(${this.peripherals.pan.translateX}px, ${this.peripherals.pan.translateY}px, 0px)` : "");
    }

    /**
     * Go to slide with particular index
     * @param {number} index - Item index to slide to.
     */
    goTo(index: number) {
        if (this.slength <= this.perPage)
            return;
        index = this.reAlign(index);
        const beforeChange = this.currentSlide;
        this.currentSlide = Math.min(Math.max(index, 0), this.length - 1);
        if (beforeChange !== this.currentSlide) {
            this.slideToCurrent(false);
            // this.onChange();
        }
    }

    onChange() {
        this.peripherals.scale = 1;
        this.updateBookStyle();
    }

    private get offset() {
        return (this.rtl ? 1 : -1) * this.currentSlide * (this.width / this.perPage);
    }

    get length() {
        if(this.single)
            return this.slength;
        const total = this.slength + this.nLandscape;
        return (this.shift && (total % 2 === 0)) ? total + 1 : total;
    }

    get slength() {
        return this.pub.readingOrder.items.length || 0;
    }

    get shift() {
        return this.spreader.shift;
    }

    private get nLandscape() {
        return this.spreader.nLandscape;
    }

    public setPerPage(perPage: number) {
        if(perPage === 0) {
            // TODO this mode is auto
            this.spread = true;
        } else if(perPage === 1) {
            this.spread = false;
        } else {
            this.spread = true;
        }
        requestAnimationFrame(() => this.resizeHandler(true));
    }

    /**
     * Moves sliders frame to position of currently active slide
     */
    slideToCurrent(enableTransition?: boolean, fast = true) {
        this.updateDimensions();
        if (enableTransition) {
            // This one is tricky, I know but this is a perfect explanation:
            // https://youtu.be/cCOL7MC4Pl0
            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    const newTransform = `translate3d(${this.offset}px, 0, 0)`;
                    if(this.spineElement.style.transform === newTransform) return;
                    this.transform = newTransform;
                    this.updateSpineStyle(true, fast);
                    this.deselect();
                });
            });
        } else {
            const newTransform = `translate3d(${this.offset}px, 0, 0)`;
            if(this.spineElement.style.transform === newTransform) return;
            this.transform = newTransform;
            this.updateSpineStyle(false);
            this.deselect();
        }
    }

    bounce(rtl = false) {
        requestAnimationFrame(() => {
            this.transform = `translate3d(${this.offset+(50 * (rtl ? 1 : -1))}px, 0, 0)`;
            this.updateSpineStyle(true, true);
            setTimeout(() => {
                this.transform = `translate3d(${this.offset}px, 0, 0)`;
                this.updateSpineStyle(true, true);
            }, 100);
        });
    }


    /**
     * Go to next slide.
     * @param {number} [howManySlides=1] - How many items to slide forward.
     * @returns {boolean} Whether or not going to next was possible
     */
    next(howManySlides = 1): boolean {
        // early return when there is nothing to slide
        if (this.slength <= this.perPage) {
            return false;
        }

        const beforeChange = this.currentSlide;

        this.currentSlide = Math.min(this.currentSlide + howManySlides, this.length - 1);
        if(this.perPage > 1 && this.currentSlide % 2)
            this.currentSlide--;

        if(this.currentSlide === beforeChange && this.currentSlide + 1 === this.length) {
            // At end and trying to go further, means trigger "last page" callback
            // this.onLastPage();
        }

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
     * Go to previous slide.
     * @param {number} [howManySlides=1] - How many items to slide backward.
     * @returns {boolean} Whether or not going to prev was possible
     */
    prev(howManySlides = 1): boolean {
        // early return when there is nothing to slide
        if (this.slength <= this.perPage) {
            return false;
        }

        const beforeChange = this.currentSlide;

        this.currentSlide = Math.max(this.currentSlide - howManySlides, 0);
        if(this.perPage > 1 && this.currentSlide % 2)
            this.currentSlide++;

        if (beforeChange !== this.currentSlide) {
            this.slideToCurrent(true);
            this.onChange();
            return true;
        } else
            this.bounce(!this.rtl);
            return false;
    }

    get ownerWindow() {
        return this.container.ownerDocument.defaultView || window;
    }


    // OLD


    async destroy() {
        this.ownerWindow.removeEventListener("resize", this.resizeBoundHandler);
        this.ownerWindow.removeEventListener("orientationchange", this.resizeBoundHandler);

        // Wait for all in-progress loads to complete
        let iit = this.inprogress.values();
        let inp = iit.next();
        const inprogressPromises: Promise<void>[] = [];
        while(inp.value) {
            inprogressPromises.push(inp.value);
            inp = iit.next();
        }
        if(inprogressPromises.length > 0) {
            await Promise.allSettled(inprogressPromises);
        }
        this.inprogress.clear();

        // Destroy all frames
        let fit = this.pool.values();
        let frm = fit.next();
        while(frm.value) {
            await (frm.value as FXLFrameManager).destroy();
            frm = fit.next();
        }
        this.pool.clear();

        // Revoke all blobs
        this.blobs.forEach(v => URL.revokeObjectURL(v));

        // Empty container of elements
        this.container.childNodes.forEach(v => {
            if(v.nodeType === Node.ELEMENT_NODE || v.nodeType === Node.TEXT_NODE) v.remove();
        })
    }

    makeSpread(itemIndex: number) {
        return this.perPage < 2 ? [this.pub.readingOrder.items[itemIndex]] : this.spreader.currentSpread(itemIndex, this.perPage);
    }

    reAlign(index: number = this.currentSlide) {
        if (index % 2 && !this.single) // Prevent getting out of track
            index++;
        return index;
    }

    spreadPosition(spread: Link[], target: Link) {
        return this.perPage < 2 ? Page.center : (spread.length < 2 ? Page.center : (
            target.href === spread[0].href ? (this.rtl ? Page.right : Page.left) : (this.rtl ? Page.left : Page.right)
        ));
    }

    async waitForItem(href: string) {
        if(this.inprogress.has(href))
            // If this same href is already being loaded, block until the other function
            // call has finished executing so we don't end up e.g. loading the blob twice.
            await this.inprogress.get(href);

        if(this.delayedShow.has(href)) {
            const timeoutVal = this.delayedTimeout.get(href)!;
            if(timeoutVal > 0) {
                // Delayed resource showing has not yet commenced, cancel it
                clearTimeout(timeoutVal);
            } else {
                // Await a current delayed showing of the resource
                await this.delayedShow.get(href);
            }
            this.delayedTimeout.set(href, 0);
            this.delayedShow.delete(href);
        }
    }

    async cancelShowing(href: string) {
        if(this.delayedShow.has(href)) {
            const timeoutVal = this.delayedTimeout.get(href)!;
            if(timeoutVal > 0) {
                // Delayed resource showing has not yet commenced, cancel it
                clearTimeout(timeoutVal);
            }
            this.delayedShow.delete(href);
        }
    }

    async update(pub: Publication, locator: Locator, modules: ModuleName[], _force=false) {
        let i = this.pub.readingOrder.items.findIndex(l => l.href === locator.href);
        if(i < 0) throw Error("Href not found in reading order");

        if(this.currentSlide !== i) {
            this.currentSlide = this.reAlign(i);
            this.slideToCurrent(true);
        }
        const spread = this.makeSpread(this.currentSlide);
        if(this.perPage > 1) i++;
        for (const s of spread) {
            await this.waitForItem(s.href);
        }

        // Create a new progress that doesn't resolve until complete
        // loading of the resource and its dependencies has finished.
        const progressPromise = new Promise<void>(async (resolve, reject) => {
            const disposal: string[] = [];
            const creation: string[] = [];

            this.positions.forEach((l, j) => {
                if(j > (i + UPPER_BOUNDARY) || j < (i - UPPER_BOUNDARY)) {
                    if(!disposal.includes(l.href)) disposal.push(l.href);
                }
                if(j < (i + LOWER_BOUNDARY) && j > (i - LOWER_BOUNDARY)) {
                    if(!creation.includes(l.href)) creation.push(l.href);
                }
            });
            disposal.forEach(async href => {
                if(creation.includes(href)) return;
                if(!this.pool.has(href)) return;
                this.cancelShowing(href);
                await this.pool.get(href)?.unload();
                // this.pool.delete(href);
            });

            // Check if base URL of publication has changed
            if(this.currentBaseURL !== undefined && pub.baseURL !== this.currentBaseURL) {
                // Revoke all blobs
                this.blobs.forEach(v => URL.revokeObjectURL(v));
                this.blobs.clear();
            }
            this.currentBaseURL = pub.baseURL;

            const creator = async (href: string) => {
                const index = pub.readingOrder.findIndexWithHref(href);
                const itm = pub.readingOrder.items[index];
                if(!itm) return; // TODO throw?
                if(!this.blobs.has(href)) {
                    const blobBuilder = new FrameBlobBuider(pub, this.currentBaseURL || "", itm);
                    const blobURL = await blobBuilder.build(true);
                    this.blobs.set(href, blobURL);
                }

                // Show future offscreen frame in advance after a delay
                // The added delay prevents this expensive operation from
                // occuring during the sliding animation, to reduce lag
                if(!this.delayedShow.has(href))
                    this.delayedShow.set(href, new Promise((resolve, reject) => {
                        let done = false;
                        const t = setTimeout(async () => {
                            this.delayedTimeout.set(href, 0);
                            const spread = this.makeSpread(this.reAlign(index));
                            const page = this.spreadPosition(spread, itm);
                            const fm = this.pool.get(href)!;
                            await fm.load(modules, this.blobs.get(href)!);
                            if(!this.peripherals.isScaled) // When scaled, positioning is screwed up, so wait to show
                                await fm.show(page); // Show/activate new frame
                            this.delayedShow.delete(href);
                            done = true;
                            resolve();
                        }, OFFSCREEN_LOAD_DELAY);
                        setTimeout(() => {
                            if(!done && this.delayedShow.has(href)) reject(`Offscreen load timeout: ${href}`);
                        }, OFFSCREEN_LOAD_TIMEOUT);
                        this.delayedTimeout.set(href, t);
                    }));
            }
            try {
                await Promise.all(creation.map(href => creator(href)));
            } catch (error) {
                reject(error);
            }

            // Update current frame(s)
            for (const s of spread) {
                const newFrame = this.pool.get(s.href)!;
                const source = this.blobs.get(s.href);
                if(!source) continue; // This can get destroyed

                this.cancelShowing(s.href);
                await newFrame.load(modules, source); // In order to ensure modules match the latest configuration
                await newFrame.show(this.spreadPosition(spread, s)); // Show/activate new frame
                await newFrame.activate();
            }
            resolve();
        });

        for (const s of spread) {
            this.inprogress.set(s.href, progressPromise); // Add the job to the in progress map
        }
        await progressPromise; // Wait on the job to finish...
        for (const s of spread) {
            this.inprogress.delete(s.href); // Delete it from the in progress map!
        }
    }

    get currentFrames(): (FXLFrameManager | undefined)[] {
        if(this.perPage < 2) {
            const link = this.pub.readingOrder.items[this.currentSlide];
            return [this.pool.get(link.href)];
        }
        const spread = this.spreader.currentSpread(this.currentSlide, this.perPage);
        return spread.map(s => this.pool.get(s.href));
    }

    get currentBounds(): DOMRect {
        const ret = {
            x: 0,
            y: 0,
            width: 0,
            height: 0,
            top: 0,
            right: 0,
            bottom: 0,
            left: 0,
            toJSON() {
                return this;
            },
        };
        this.currentFrames.forEach(f => {
            if(!f) return;
            const b = f.realSize;
            ret.x = Math.min(ret.x, b.x);
            ret.y = Math.min(ret.y, b.y);
            ret.width += b.width; // TODO different in vertical
            ret.height = Math.max(ret.height, b.height);
            ret.top = Math.min(ret.top, b.top);
            ret.right = Math.min(ret.right, b.right);
            ret.bottom = Math.min(ret.bottom, b.bottom);
            ret.left = Math.min(ret.left, b.left);
        });
        return ret as DOMRect;
    }

    get currentNumbers(): number[] {
        if(this.perPage < 2) {
            const link = this.pub.readingOrder.items[this.currentSlide];
            return [link.properties?.otherProperties["number"]];
        }
        const spread = this.spreader.currentSpread(this.currentSlide, this.perPage);
        return spread.length > 1 ? [
            spread[0].properties?.otherProperties["number"] as number,
            spread[spread.length-1].properties?.otherProperties["number"] as number
        ] : [spread[0].properties?.otherProperties["number"] as number];
    }

    deselect() {
        this.currentFrames?.forEach(f => f?.deselect());
    }
}