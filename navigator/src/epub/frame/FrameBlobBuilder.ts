import { Link, MediaType, Publication } from "@readium/shared/src";

// TODO embed locally
const READIUM_CSS_PATH = "https://cdn.jsdelivr.net/gh/readium/readium-css@583011453612e6f695056ab6c086a2c4f4cac9c0/css/dist/{FILE}";

// Note: we aren't blocking some of the events right now to try and be as nonintrusive as possible.
// For a more comprehensive implementation, see https://github.com/hackademix/noscript/blob/3a83c0e4a506f175e38b0342dad50cdca3eae836/src/content/syncFetchPolicy.js#L142
let rBeforeBlob: string | undefined;
let rAfterBlob: string | undefined;
const rBefore = (doc: Document) => {
    if(!rBeforeBlob) {
        rBeforeBlob = URL.createObjectURL(new Blob([`
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
window.addEventListener("load", window._readium_eventBlocker, true);
`], { type: "text/javascript" }));
    }
    const rBefore = doc.createElement("script");
    rBefore.dataset.readium = "true";
    rBefore.src = rBeforeBlob;
    return rBefore;
}

export const rAfter = (doc: Document) => {
    if(!rAfterBlob) {
        rAfterBlob = URL.createObjectURL(new Blob([`
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
});`], { type: "text/javascript" }));
    }
    const rAfter = doc.createElement("script");
    rAfter.dataset.readium = "true";
    rAfter.src = rAfterBlob;
    return rAfter;
}

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

    private finalizeDOM(doc: Document, base: string | undefined, mediaType: MediaType, fxl = false): string {
        if(!doc) return "";

        // Inject styles
        if(!fxl) {
            const css = (name: string) => {
                const d = doc.createElement("link");
                d.dataset.readium = "true";
                d.rel = "stylesheet";
                d.type = "text/css";
                d.href = // TODO standardize
                READIUM_CSS_PATH.replace(
                    "{FILE}",
                    name
                );
                return d;
            };
            doc.head.firstChild ? doc.head.firstChild.before(css("ReadiumCSS-before.css")) : doc.head.appendChild(css("ReadiumCSS-before.css"));
            doc.head.appendChild(css("ReadiumCSS-after.css"));
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