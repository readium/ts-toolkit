import { Link, Page } from "@readium/shared";
import { isTypedOMSupported } from "../epub/fxl/FXLPeripherals.ts";
import { DivinaPage } from "./DivinaSpreader.ts";
import { DivinaQuality, selectVariant } from "./DivinaVariantSelector.ts";

/**
 * Generates an SVG data-URI placeholder with the same intrinsic dimensions as
 * the image it stands in for, so the layout box is identical before/after load.
 */
const escapeXML = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

// Placeholders are cached so pages with equal dimensions share one data URI —
// and therefore one decoded image — instead of one per page
const placeholderCache: Map<string, string> = new Map();

export function placeholderSVG(width: number, height: number, message: string, detail?: string): string {
    const key = `${width}x${height}|${message}|${detail ?? ""}`;
    const cached = placeholderCache.get(key);
    if(cached) return cached;
    const fontSize = Math.max(24, Math.round(Math.min(width, height) / 10));
    message = escapeXML(message);
    detail = detail && escapeXML(detail);
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}">` +
        `<rect width="100%" height="100%" fill="rgba(128,128,128,0.08)"/>` +
        `<text x="50%" y="50%" text-anchor="middle" dominant-baseline="central" ` +
        `font-family="sans-serif" font-weight="bold" font-size="${fontSize}" fill="#999">${message}</text>` +
        (detail ? `<text x="50%" y="97%" text-anchor="middle" font-family="sans-serif" font-size="${Math.round(fontSize / 3)}" fill="#aaa">${detail}</text>` : "") +
        `</svg>`;
    const uri = `data:image/svg+xml,${encodeURIComponent(svg)}`;
    placeholderCache.set(key, uri);
    return uri;
}

const FALLBACK_WIDTH = 1080;
const FALLBACK_HEIGHT = 1440;

export type DivinaPageMode = "paged" | "scrolled";

/**
 * Manages the lifecycle of a single Divina page: an <img> element inside a
 * wrapper <div>, with blob-based loading, an intrinsic-size SVG placeholder,
 * and per-mode layout. The image-based equivalent of FXLFrameManager.
 */
export class DivinaPageManager {
    readonly page: DivinaPage;
    readonly wrapper: HTMLDivElement;
    readonly img: HTMLImageElement;

    private readonly fetchBlob: (link: Link, signal?: AbortSignal) => Promise<Blob>;
    private readonly getQuality: () => DivinaQuality;
    private readonly placeholder: string;
    private objectURL: string | null = null;
    private loadPromise: Promise<void> | null = null;
    private abortController: AbortController | null = null;
    private _loaded = false;
    private destroyed = false;
    private generation = 0; // Bumped on unload/destroy to invalidate in-flight loads
    private mode: DivinaPageMode = "paged";

    constructor(
        page: DivinaPage,
        fetchBlob: (link: Link, signal?: AbortSignal) => Promise<Blob>,
        getQuality: () => DivinaQuality = () => DivinaQuality.auto
    ) {
        this.page = page;
        this.fetchBlob = fetchBlob;
        this.getQuality = getQuality;

        this.wrapper = document.createElement("div");
        this.wrapper.style.position = "relative";
        this.wrapper.style.overflow = "hidden";
        this.wrapper.dataset.href = page.link.href;
        this.wrapper.dataset.pageNumber = `${page.number}`;

        this.img = document.createElement("img");
        this.img.decoding = "async";
        this.img.draggable = false;
        this.img.alt = page.link.title || `Page ${page.number}`;
        this.img.style.display = "block";
        this.img.style.userSelect = "none";
        this.img.style.webkitUserSelect = "none";
        // @ts-expect-error webkitUserDrag is non-standard but needed for Safari
        this.img.style.webkitUserDrag = "none";

        this.placeholder = placeholderSVG(this.intrinsicWidth, this.intrinsicHeight, "···");
        this.img.src = this.placeholder;
        this.wrapper.appendChild(this.img);
    }

    get intrinsicWidth(): number {
        return this.page.link.width || (this._loaded ? this.img.naturalWidth : 0) || FALLBACK_WIDTH;
    }

    get intrinsicHeight(): number {
        return this.page.link.height || (this._loaded ? this.img.naturalHeight : 0) || FALLBACK_HEIGHT;
    }

    get loaded(): boolean {
        return this._loaded;
    }

    get element(): HTMLDivElement {
        return this.wrapper;
    }

    /**
     * Configure the wrapper/image styles for the given presentation mode.
     * Paged: the image is fitted (letterboxed) inside the slot-sized wrapper.
     * Scrolled: the image dictates the height via its aspect ratio.
     */
    setMode(mode: DivinaPageMode) {
        this.mode = mode;
        if(isTypedOMSupported()) {
            if(mode === "paged") {
                ["margin-top", "margin-right", "margin-bottom", "margin-left"]
                    .forEach(p => this.wrapper.attributeStyleMap.delete(p));
                this.img.attributeStyleMap.set("position", "absolute");
                this.img.attributeStyleMap.set("top", CSS.px(0));
                this.img.attributeStyleMap.set("left", CSS.px(0));
                this.img.attributeStyleMap.set("width", CSS.percent(100));
                this.img.attributeStyleMap.set("height", CSS.percent(100));
                this.img.attributeStyleMap.set("object-fit", "contain");
                this.img.attributeStyleMap.delete("aspect-ratio");
            } else {
                this.wrapper.attributeStyleMap.set("float", "none");
                this.wrapper.attributeStyleMap.set("width", CSS.percent(100));
                this.wrapper.attributeStyleMap.set("height", "auto");
                this.wrapper.attributeStyleMap.set("margin-top", CSS.px(0));
                this.wrapper.attributeStyleMap.set("margin-bottom", CSS.px(0));
                this.wrapper.attributeStyleMap.set("margin-left", "auto");
                this.wrapper.attributeStyleMap.set("margin-right", "auto");
                this.img.attributeStyleMap.set("position", "static");
                this.img.attributeStyleMap.delete("top");
                this.img.attributeStyleMap.delete("left");
                this.img.attributeStyleMap.set("width", CSS.percent(100));
                this.img.attributeStyleMap.set("height", "auto");
                this.img.attributeStyleMap.delete("object-fit");
                this.img.attributeStyleMap.set("aspect-ratio", `${this.intrinsicWidth} / ${this.intrinsicHeight}`);
            }
        } else {
            if(mode === "paged") {
                this.wrapper.style.removeProperty("margin");
                this.img.style.position = "absolute";
                this.img.style.top = "0";
                this.img.style.left = "0";
                this.img.style.width = "100%";
                this.img.style.height = "100%";
                this.img.style.objectFit = "contain";
                this.img.style.removeProperty("aspect-ratio");
            } else {
                this.wrapper.style.cssFloat = this.wrapper.style.float = "none";
                this.wrapper.style.width = "100%";
                this.wrapper.style.height = "auto";
                this.wrapper.style.margin = "0 auto";
                this.img.style.position = "static";
                this.img.style.removeProperty("top");
                this.img.style.removeProperty("left");
                this.img.style.width = "100%";
                this.img.style.height = "auto";
                this.img.style.removeProperty("object-fit");
                this.img.style.aspectRatio = `${this.intrinsicWidth} / ${this.intrinsicHeight}`;
            }
        }
    }

    /**
     * Position the fitted image within its wrapper (paged mode only).
     *
     * @param position In a two-page spread, the side of the gutter this page
     * sits on (pages butt against the gutter). With `half`, the half of a
     * full-spread wrapper the page occupies.
     * @param half The page is alone in a double-width (full-spread) slot but
     * carries a left/right position hint — e.g. a shifted cover or the
     * orphaned component of a spread — so it is fitted to and centered
     * within its half of the spread.
     */
    fit(position: Page, half = false) {
        if(this.mode !== "paged") return;
        let width: number, left: number, objectPosition: string;
        if(half && position !== Page.center) {
            width = 50;
            left = position === Page.right ? 50 : 0;
            objectPosition = "center center";
        } else {
            width = 100;
            left = 0;
            // Pages of a spread butt against the gutter
            objectPosition = position === Page.left ? "right center"
                : position === Page.right ? "left center"
                : "center center";
        }
        if(isTypedOMSupported()) {
            this.img.attributeStyleMap.set("width", CSS.percent(width));
            this.img.attributeStyleMap.set("left", CSS.percent(left));
            this.img.attributeStyleMap.set("object-position", objectPosition);
        } else {
            this.img.style.width = `${width}%`;
            this.img.style.left = `${left}%`;
            this.img.style.objectPosition = objectPosition;
        }
    }

    /** Scrolled mode: constrain the display width of this page in the strip */
    applyStripWidth(displayWidth: number) {
        if(this.mode !== "scrolled") return;
        if(isTypedOMSupported()) {
            this.wrapper.attributeStyleMap.set("width", CSS.px(Math.round(displayWidth)));
            this.wrapper.attributeStyleMap.set("max-width", CSS.percent(100));
        } else {
            this.wrapper.style.width = `${Math.round(displayWidth)}px`;
            this.wrapper.style.maxWidth = "100%";
        }
    }

    /**
     * Fetch the image as a blob and swap it in for the placeholder.
     * Idempotent; concurrent calls await the same promise.
     */
    /**
     * The most appropriate variant (main link or alternate) for the page's
     * current display box and the user's quality preference.
     */
    private pickVariant(): Link {
        const dpr = window.devicePixelRatio || 1;
        const boxW = this.wrapper.clientWidth || 0;
        const boxH = this.wrapper.clientHeight || 0;
        let targetWidth = boxW * dpr;
        let targetHeight = boxH * dpr;
        if(this.mode === "paged" && boxW > 0 && boxH > 0) {
            // The image is contain-fitted in the slot: target its displayed size
            const scale = Math.min(boxW / this.intrinsicWidth, boxH / this.intrinsicHeight);
            targetWidth = this.intrinsicWidth * scale * dpr;
            targetHeight = this.intrinsicHeight * scale * dpr;
        }
        return selectVariant(this.page.link, {
            targetWidth,
            targetHeight,
            axis: this.mode === "scrolled" ? "width" : "height",
            quality: this.getQuality()
        });
    }

    async load(): Promise<void> {
        if(this._loaded || this.destroyed) return;
        if(this.loadPromise) return this.loadPromise;
        const gen = this.generation;
        this.abortController = new AbortController();
        const signal = this.abortController.signal;
        this.loadPromise = (async () => {
            try {
                const blob = await this.fetchBlob(this.pickVariant(), signal);
                if(this.destroyed || gen !== this.generation) return;
                const url = URL.createObjectURL(blob);
                try {
                    await new Promise<void>((res, rej) => {
                        const onLoad = () => { cleanup(); res(); };
                        const onError = () => { cleanup(); rej(new Error(`Failed to decode ${this.page.link.href}`)); };
                        const cleanup = () => {
                            this.img.removeEventListener("load", onLoad);
                            this.img.removeEventListener("error", onError);
                        };
                        this.img.addEventListener("load", onLoad);
                        this.img.addEventListener("error", onError);
                        this.img.src = url;
                    });
                } catch (e) {
                    URL.revokeObjectURL(url);
                    throw e;
                }
                if(this.destroyed || gen !== this.generation) {
                    URL.revokeObjectURL(url);
                    if(this.img.src === url) this.img.src = this.placeholder;
                    return;
                }
                this.objectURL = url;
                this._loaded = true;
                // Correct the layout box with the decoded dimensions when the
                // manifest lacked width/height (the fallback ratio would
                // otherwise distort the page in scrolled mode)
                if(this.mode === "scrolled" && this.img.naturalWidth && this.img.naturalHeight) {
                    const ratio = `${this.img.naturalWidth} / ${this.img.naturalHeight}`;
                    if(isTypedOMSupported())
                        this.img.attributeStyleMap.set("aspect-ratio", ratio);
                    else
                        this.img.style.aspectRatio = ratio;
                }
            } catch (error) {
                if(!this.destroyed && gen === this.generation) {
                    console.warn("Divina page load failed", this.page.link.href, error);
                    this.img.src = placeholderSVG(this.intrinsicWidth, this.intrinsicHeight, "!", `${this.page.link.href.split("/").pop()}`);
                }
            } finally {
                if(gen === this.generation) this.loadPromise = null;
            }
        })();
        return this.loadPromise;
    }

    /**
     * Release the blob and go back to the placeholder (memory reclamation),
     * aborting any in-flight fetch.
     */
    unload() {
        if(!this._loaded && !this.loadPromise) return;
        this.generation++;
        this._loaded = false;
        this.loadPromise = null;
        this.abortController?.abort();
        this.abortController = null;
        this.img.src = this.placeholder;
        if(this.objectURL) {
            URL.revokeObjectURL(this.objectURL);
            this.objectURL = null;
        }
    }

    destroy() {
        this.destroyed = true;
        this.unload();
        this.wrapper.remove();
    }
}
