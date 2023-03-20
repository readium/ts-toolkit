import { ModuleName } from "@readium/navigator-html-injectables/src";
import { Locator, Publication, MediaType, ReadingProgression, Orientation, Page, Link } from "@readium/shared/src";
import FrameBlobBuider from "../frame/FrameBlobBuilder";
import FXLFrameManager from "./FXLFrameManager";
import FXLSpreader from "./FXLSpreader";

const UPPER_BOUNDARY = 8;
const LOWER_BOUNDARY = 5;

const spreadPosition = (spread: Link[], target: Link) => {
    //console.log("SP", spread, target);
    return spread.length < 2 ? Page.center : (
        target === spread[0] ? Page.left : Page.right // TODO take rtl into account
    );
}

export default class FramePoolManager {
    private readonly container: HTMLElement;
    private readonly positions: Locator[];
    private _currentFrame: FXLFrameManager | undefined;
    private readonly pool: Map<string, FXLFrameManager> = new Map();
    private readonly blobs: Map<string, string> = new Map();
    private readonly inprogress: Map<string, Promise<void>> = new Map();
    private currentBaseURL: string | undefined;

    // NEW
    private readonly bookElement: HTMLDivElement;
    private readonly spineElement: HTMLDivElement;
    private readonly pub: Publication;
    private width: number = 0;
    private height: number = 0;
    private transform: string = "";
    public currentSlide: number = 0;
    private spreader: FXLSpreader;
    private spread = true; // TODO
    private orientationInternal = -1; // Portrait = 1, Landscape = 0, Unknown = -1
    private containerHeightCached: number;
    private readonly resizeBoundHandler: EventListenerOrEventListenerObject;
    private resizeTimeout: number | undefined;
    // private readonly pages: FXLFrameManager[] = [];

    constructor(container: HTMLElement, positions: Locator[], pub: Publication) {
        this.container = container;
        this.positions = positions;
        this.pub = pub;

        if(this.pub.metadata.effectiveReadingProgression !== ReadingProgression.rtl && this.pub.metadata.effectiveReadingProgression !== ReadingProgression.ltr)
            // TODO support TTB and BTT
            throw Error("Unsupported reading progression for EPUB");

        // NEW
        this.spreader = new FXLSpreader(this.pub);
        this.containerHeightCached = container.clientHeight;
        this.resizeBoundHandler = this.resizeHandler.bind(this);
        // TODO unbind
        window.addEventListener("resize", this.resizeBoundHandler);
        window.addEventListener("orientationchange", this.resizeBoundHandler);

        this.bookElement = document.createElement("div");
        this.bookElement.ariaLabel = "Book";
        this.bookElement.tabIndex = -1;
        this.updateBookStyle();

        this.spineElement = document.createElement("div");
        this.spineElement.ariaLabel = "Spine";

        this.bookElement.appendChild(this.spineElement);
        this.container.appendChild(this.bookElement);
        this.updateSpineStyle(true);

        this.pub.readingOrder.items.forEach((link) => {
            // Create <iframe>
            const fm = new FXLFrameManager(this.pub.metadata.effectiveReadingProgression, link.href);
            this.spineElement.appendChild(fm.element);

            // this.pages.push(fm);
            this.pool.set(link.href, fm);
            fm.width = 100 / this.length * (link.properties?.getOrientation() === Orientation.landscape || link.properties?.otherProperties["addBlank"] ? this.perPage : 1);
            fm.height = this.height;
        });
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
            if (this.currentSlide % 2 && !this.single) // Prevent getting out of track
                this.currentSlide++;

            this.slideToCurrent(!fast, fast);
        }

        clearTimeout(this.resizeTimeout);
        this.resizeTimeout = setTimeout(() => {
            // TODO optimize this expensive set of loops and operations
            this.pool.forEach((frm, linkHref) => {
                let i = this.pub.readingOrder.items.findIndex(l => l.href === linkHref);
                const link = this.pub.readingOrder.items[i];
                const spread = this.spreader.findByLink(link)!;
                frm.width = 100 / this.length * (link.properties?.getOrientation() === Orientation.landscape || link.properties?.otherProperties["addBlank"] ? this.perPage : 1);
                frm.height = this.height;
                frm.update(this.perPage < 2 ? Page.center : spreadPosition(spread, link));
            });
        }, 500);
    }

    /**
     * It is important that these values be cached to avoid spamming them on redraws, they are expensive.
     */
    private updateDimensions() {
        const r = this.bookElement.getBoundingClientRect();
        this.width = r.width;
        this.height = r.height;
        // this.containerHeightCached = r.height;
    }

    private get rtl() {
        return this.pub.metadata.effectiveReadingProgression === ReadingProgression.rtl;
    }

    private get single() {
        return !this.spread || this.portrait;
    }

    public get perPage() {
        return (this.spread && !this.portrait) ? 2 : 1;
    }

    get portrait(): boolean {
        if(this.orientationInternal === -1) {
            this.orientationInternal = this.containerHeightCached > this.container.clientWidth ? 1 : 0;
        }
        return this.orientationInternal === 1;
    }

    private updateSpineStyle(animate: boolean, fast = true) {
        let margin = "0";
        this.updateDimensions();
        if(this.perPage > 1 && true) // this.shift
            margin = `${this.width / 2}px`;

        const bookStyle = {
            transition: animate ? `all ${fast ? 150 : 500}ms ease-out` : "all 0ms ease-out",
            marginRight: this.rtl ? margin : "0",
            marginLeft: this.rtl ? "0" : margin,
            width: `${(this.width / this.perPage) * this.length}px`,
            transform: this.transform,

            // Static (should be moved to CSS)
            contain: "content"
        } as CSSStyleDeclaration;

        Object.assign(this.spineElement.style, bookStyle);
    }

    private updateBookStyle() {
        const bookStyle = {
            overflow: "hidden",
            direction: this.pub.metadata.effectiveReadingProgression,
            cursor: "",
            transform: "scale(1)",
            transformOrigin: "",

            // Static (should be moved to CSS)
            // minHeight: 100%
            // maxHeight: "100%",
            height: "100%",
            width: "100%",
            position: "relative",
            outline: "none",
            transitionProperty: "transform",
            transition: ".15s ease-in-out"
        } as CSSStyleDeclaration;

        Object.assign(this.bookElement.style, bookStyle);
    }

    /**
     * Go to slide with particular index
     * @param {number} index - Item index to slide to.
     */
    goTo(index: number) {
        if (this.slength <= this.perPage)
            return;
        if (index % 2 && !this.single) // Prevent getting out of track
            index++;
        const beforeChange = this.currentSlide;
        this.currentSlide = Math.min(Math.max(index, 0), this.length - 1);
        if (beforeChange !== this.currentSlide) {
            this.slideToCurrent(false);
            // this.onChange();
        }
    }

    onChange() {
        //this.zoomer.scale = 1;
        // m.redraw();

        /*clearTimeout(this.PageChangeTimer);
        this.PageChangeTimer = window.setTimeout(
            () => this.config.state.onPageChange(this.outsidePageNumber(), this.direction, !this.single),
            100 // Rate-limit change states, because it can get very spammy on toonflowable scrolls
        );*/
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
                    this.transform = `translate3d(${this.offset}px, 0, 0)`;
                    this.updateSpineStyle(true, fast);
                });
            });
        } else {
            this.transform = `translate3d(${this.offset}px, 0, 0)`;
            this.updateSpineStyle(false);
        }
    }


    /**
     * Go to next slide.
     * @param {number} [howManySlides=1] - How many items to slide forward.
     */
    next(howManySlides = 1) {
        // early return when there is nothing to slide
        if (this.slength <= this.perPage) {
            return;
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
        }
    }

    /**
     * Go to previous slide.
     * @param {number} [howManySlides=1] - How many items to slide backward.
     */
    prev(howManySlides = 1) {
        // early return when there is nothing to slide
        if (this.slength <= this.perPage) {
            return;
        }

        const beforeChange = this.currentSlide;

        this.currentSlide = Math.max(this.currentSlide - howManySlides, 0);
        if(this.perPage > 1 && this.currentSlide % 2)
            this.currentSlide++;

        if (beforeChange !== this.currentSlide) {
            this.slideToCurrent(true);
            this.onChange();
        } else {}
            // this.bounce(!this.rtl);
    }


    // OLD


    async destroy() {
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

    async update(pub: Publication, locator: Locator, modules: ModuleName[], force=false) {
        let i = this.pub.readingOrder.items.findIndex(l => l.href === locator.href);
        if(i < 0) throw Error("Href not found in reading order");
        // const newHref = this.positions[i].href;
        //console.log(i, "update to", locator);

        if(this.currentSlide !== i) {
            if (i % 2 && !this.single) // Prevent getting out of track
                i++;

            this.currentSlide = i;
            this.slideToCurrent();
        }
        const spread = this.perPage < 2 ? [this.pub.readingOrder.items[i]] : this.spreader.currentSpread(this.currentSlide, this.perPage);
        if(this.perPage > 1) i++;
        for (const s of spread) {
            //console.log("B", s.href);
            if(this.inprogress.has(s.href))
                // If this same href is already being loaded, block until the other function
                // call has finished executing so we don't end up e.g. loading the blob twice.
                await this.inprogress.get(s.href);
        }
        //console.log("C");

        // Create a new progress that doesn't resolve until complete
        // loading of the resource and its dependencies has finished.
        const progressPromise = new Promise<void>(async (resolve, _) => {
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
                const itm = pub.readingOrder.findWithHref(href);
                if(!itm) return; // TODO throw?
                if(!this.blobs.has(href)) {
                    const blobBuilder = new FrameBlobBuider(pub, this.currentBaseURL || "", itm);
                    const blobURL = await blobBuilder.build(true);
                    this.blobs.set(href, blobURL);
                }

                if(this.pool.has(href)) {
                    // console.log("pool has", href);
                    const fm = this.pool.get(href)!;
                    if(!this.blobs.has(href)) {
                        // console.log("DESTROY", href);
                        await fm.destroy();
                        this.pool.delete(href);
                    } else {
                        // console.log("LOAD", href, this.blobs.get(href)!);
                        await fm.load(modules, this.blobs.get(href)!);
                        return;
                    }
                }

                // Create <iframe>
                // console.log("GET", href);
                const fm = this.pool.get(href)!;
                // if(href !== newHref) await fm.hide(); // Avoid unecessary hide
                // this.spineElement.appendChild(fm.element);
                await fm.load(modules, this.blobs.get(href)!);
            }
            //console.log("D");
            await Promise.all(creation.map(href => creator(href)));
            //console.log("E");

            // Update current frame(s)
            for (const s of spread) {
                const page = spreadPosition(spread, s);
                const newFrame = this.pool.get(s.href)!;
                //console.log("SHOW", s.href);
                // await this._currentFrame?.hide(); // Hide current frame. It's possible it no longer even exists in the DOM at this point
                const source = this.blobs.get(s.href);
                if(!source) continue; // This can get destroyed
                if(newFrame) // If user is speeding through the publication, this can get destroyed
                    await newFrame.load(modules, source); // In order to ensure modules match the latest configuration
                //console.log("SHOW B", s.href);
                if(newFrame) // If user is speeding through the publication, this can get destroyed
                    await newFrame.show(this.perPage < 2 ? Page.center : page); // Show/activate new frame

                this._currentFrame = newFrame;
                // console.log("SHOW DONE");
            }
            //console.log("RESOLVE!", spread);
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

    get currentNumber() {
        if(this.perPage < 2) {
            const link = this.pub.readingOrder.items[this.currentSlide];
            return link.properties?.otherProperties["number"];
        }
        const spread = this.spreader.currentSpread(this.currentSlide, this.perPage);
        return spread[0].properties?.otherProperties["number"];
    }
}