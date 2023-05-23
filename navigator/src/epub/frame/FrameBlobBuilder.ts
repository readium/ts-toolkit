import { Link, MediaType, Publication } from "@readium/shared/src";

// Readium CSS imports
// The "?inline" query is to prevent some bundlers from injecting these into the page (e.g. vite)
import readiumCSSAfter from "readium-css/css/dist/ReadiumCSS-after.css?inline";
import readiumCSSBefore from "readium-css/css/dist/ReadiumCSS-before.css?inline";
import readiumCSSDefault from "readium-css/css/dist/ReadiumCSS-default.css?inline";

// Utilities
const blobify = (source: string, type: string) => URL.createObjectURL(new Blob([source], { type }));
const stripJS = (source: string) => source.replace(/\/\/.*/g, "").replace(/\/\*[\s\S]*?\*\//g, "").replace(/\n/g, "").replace(/\s+/g, " ");
const stripCSS = (source: string) => source.replace(/\/\*(?:(?!\*\/)[\s\S])*\*\/|[\r\n\t]+/g, '').replace(/ {2,}/g, ' ');
const scriptify = (doc: Document, source: string) => {
    const s = doc.createElement("script");
    s.dataset.readium = "true";
    s.src = source.startsWith("blob:") ? source : blobify(source, "text/javascript");
    return s;
}
const styleify = (doc: Document, source: string) => {
    const s = doc.createElement("link");
    s.dataset.readium = "true";
    s.rel = "stylesheet";
    s.type = "text/css";
    s.href = source.startsWith("blob:") ? source : blobify(source, "text/css");
    return s;
}

type CacheFunction = () => string;
const resourceBlobCache = new Map<string, string>();
const cached = (key: string, cacher: CacheFunction) => {
    if(resourceBlobCache.has(key)) return resourceBlobCache.get(key)!;
    const value = cacher();
    resourceBlobCache.set(key, value);
    return value;
};

// Note: we aren't blocking some of the events right now to try and be as nonintrusive as possible.
// For a more comprehensive implementation, see https://github.com/hackademix/noscript/blob/3a83c0e4a506f175e38b0342dad50cdca3eae836/src/content/syncFetchPolicy.js#L142
const rBefore = (doc: Document) => scriptify(doc, cached("JS-Before", () => blobify(stripJS(`
    window._readium_blockedEvents = [];
    window._readium_blockEvents = true;
    window._readium_eventBlocker = (e) => {
        if(!window._readium_blockEvents) return;
        e.preventDefault();
        e.stopImmediatePropagation();
        _readium_blockedEvents.push([
            1, e
        ]);
    };
    window.addEventListener("DOMContentLoaded", window._readium_eventBlocker, true);
    window.addEventListener("load", window._readium_eventBlocker, true);`
), "text/javascript")));
const rAfter = (doc: Document) => scriptify(doc, cached("JS-After", () => blobify(stripJS(`
    if(window.onload) window.onload = new Proxy(window.onload, {
        apply: function(target, receiver, args) {
            if(!window._readium_blockEvents) {
                Reflect.apply(target, receiver, args);
                return;
            }
            _readium_blockedEvents.push([
                0, target, receiver, args
            ]);
        }
    });`
), "text/javascript")));

export default class FrameBlobBuider {
    private readonly item: Link;
    private readonly burl: string;
    private readonly pub: Publication;

    constructor(pub: Publication, baseURL: string, item: Link) {
        this.pub = pub;
        this.item = item;
        this.burl = item.toURL(baseURL) || "";
    }

    public async build(fxl = false): Promise<string> {
        if(!this.item.mediaType.isHTML) {
            if(this.item.mediaType.isBitmap) {
                return this.buildImageFrame();
            } else
                throw Error("Unsupported frame mediatype " + this.item.mediaType.string);
        } else {
            return await this.buildHtmlFrame(fxl);
        }
    }

    private async buildHtmlFrame(fxl = false): Promise<string> {
        // Load the HTML resource
        const txt = await this.pub.get(this.item).readAsString();
        if(!txt) throw new Error(`Failed reading item ${this.item.href}`);
        const doc = new DOMParser().parseFromString(
            txt,
            this.item.mediaType.string as DOMParserSupportedType
        );
        return this.finalizeDOM(doc, this.burl, this.item.mediaType, fxl);
    }

    private buildImageFrame(): string {
        // Rudimentary image display
        const doc = document.implementation.createHTMLDocument(this.item.title || this.item.href);
        const simg = document.createElement("img");
        simg.src = this.burl || "";
        simg.alt = this.item.title || "";
        simg.decoding = "async";
        doc.body.appendChild(simg);
        return this.finalizeDOM(doc, this.burl, this.item.mediaType, true);
    }

    private hasStyle(doc: Document): boolean {
        if(
            doc.querySelector("link[rel='stylesheet']") ||
            doc.querySelector("style")
        ) return true;

        // Expensive, but probably rare because almost every EPUB has some sort of CSS in it
        const elements = document.querySelectorAll("*");
        console.log(elements);
        for (let i = 0; i < elements.length; i++) {
            if (elements[i].hasAttribute("style")) {
                return true;
            }
        }

        return false;
    }

    private finalizeDOM(doc: Document, base: string | undefined, mediaType: MediaType, fxl = false): string {
        if(!doc) return "";

        // Inject styles
        if(!fxl) {
            // Readium CSS Before
            const rcssBefore = styleify(doc, cached("ReadiumCSS-before", () => blobify(stripCSS(readiumCSSBefore), "text/css")));
            doc.head.firstChild ? doc.head.firstChild.before(rcssBefore) : doc.head.appendChild(rcssBefore);

            // Patch
            const patch = doc.createElement("style");
            patch.dataset.readium = "true";
            patch.innerHTML = `audio[controls] { width: revert; height: revert; }`; // https://github.com/readium/readium-css/issues/94
            rcssBefore.after(patch);

            // Readium CSS default
            if(!this.hasStyle(doc))
                rcssBefore.after(styleify(doc, cached("ReadiumCSS-default", () => blobify(stripCSS(readiumCSSDefault), "text/css"))))

            // Readium CSS After
            doc.head.appendChild(styleify(doc, cached("ReadiumCSS-after", () => blobify(stripCSS(readiumCSSAfter), "text/css"))));
        }
    
        if(base !== undefined) {
            // Set all URL bases. Very convenient!
            const b = doc.createElement("base");
            b.href = base;
            b.dataset.readium = "true";
            doc.head.firstChild!.before(b);
        }

        // Inject script to prevent in-publication scripts from executing until we want them to
        doc.head.firstChild!.before(rBefore(doc));
        doc.head.appendChild(rAfter(doc));


        // Make blob from doc
        return URL.createObjectURL(
            new Blob([new XMLSerializer().serializeToString(doc)], {
              type: mediaType.isHTML
                ? mediaType.string
                : "application/xhtml+xml", // Fallback to XHTML
            })
        );
    }
}