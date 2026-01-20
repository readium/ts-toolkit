import { Link, Publication } from "@readium/shared";

// Readium CSS imports
// The "?inline" query is to prevent some bundlers from injecting these into the page (e.g. vite)
// @ts-ignore
import readiumCSSWebPub from "@readium/css/css/dist/webPub/ReadiumCSS-webPub.css?inline";

// Import the pre-built CSS selector generator
// This has to be injected because you need to be in the iframe's context for it to work properly
import cssSelectorGeneratorContent from "../dom/_readium_cssSelectorGenerator.js?raw";

// Utilities
const blobify = (source: string, type: string) => URL.createObjectURL(new Blob([source], { type }));
const stripJS = (source: string) => source.replace(/\/\/.*/g, "").replace(/\/\*[\s\S]*?\*\//g, "").replace(/\n/g, "").replace(/\s+/g, " ");
const stripCSS = (source: string) => source.replace(/\/\*(?:(?!\*\/)[\s\S])*\*\/|[\r\n\t]+/g, '').replace(/ {2,}/g, ' ')
    // Fully resolve absolute local URLs created by bundlers since it's going into a blob
    .replace(/url\((?!(https?:)?\/\/)("?)\/([^\)]+)/g, `url($2${window.location.origin}/$3`);
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

const cssSelectorGenerator = (doc: Document) => scriptify(doc, cached("css-selector-generator", () => blobify(
    cssSelectorGeneratorContent,
    "text/javascript"
)));

const readiumPropertiesScript = `
window._readium_blockedEvents = [];
window._readium_blockEvents = false; // WebPub doesn't need event blocking
window._readium_eventBlocker = null;
`;

const rBefore = (doc: Document) => scriptify(doc, cached("webpub-js-before", () => blobify(stripJS(readiumPropertiesScript), "text/javascript")));
const rAfter = (doc: Document) => scriptify(doc, cached("webpub-js-after", () => blobify(stripJS(`
if(window.onload) window.onload = new Proxy(window.onload, {
    apply: function(target, receiver, args) {
        if(!window._readium_blockEvents) {
            Reflect.apply(target, receiver, args);
            return;
        }
        _readium_blockedEvents.push([0, target, receiver, args]);
    }
});`), "text/javascript")));

export class WebPubBlobBuilder {
    private readonly item: Link;
    private readonly burl: string;
    private readonly pub: Publication;
    private readonly cssProperties?: { [key: string]: string };

    constructor(pub: Publication, baseURL: string, item: Link, cssProperties?: { [key: string]: string }) {
        this.pub = pub;
        this.item = item;
        this.burl = item.toURL(baseURL) || "";
        this.cssProperties = cssProperties;
    }

    public async build(): Promise<string> {
        if (!this.item.mediaType.isHTML) {
            throw new Error(`Unsupported media type for WebPub: ${this.item.mediaType.string}`);
        }

        return await this.buildHtmlFrame();
    }

    private async buildHtmlFrame(): Promise<string> {
        // Load the HTML resource
        const txt = await this.pub.get(this.item).readAsString();
        if(!txt) throw new Error(`Failed reading item ${this.item.href}`);
        const doc = new DOMParser().parseFromString(
            txt,
            this.item.mediaType.string as DOMParserSupportedType
        );
        const perror = doc.querySelector("parsererror");
        if(perror) {
            const details = perror.querySelector("div");
            throw new Error(`Failed parsing item ${this.item.href}: ${details?.textContent || perror.textContent}`);
        }
        return this.finalizeDOM(doc, this.burl, this.item.mediaType, txt, this.cssProperties);
    }

    private hasExecutable(doc: Document): boolean {
        return (
            !!doc.querySelector("script") ||
            !!doc.querySelector("body[onload]:not(body[onload=''])")
        );
    }

    private setProperties(cssProperties: { [key: string]: string }, doc: Document) {
        for (const key in cssProperties) {
            const value = cssProperties[key];
            if (value) doc.documentElement.style.setProperty(key, value);
        }
    }

    private finalizeDOM(doc: Document, base: string | undefined, mediaType: any, txt?: string, cssProperties?: { [key: string]: string }): string {
        if(!doc) return "";

        // ReadiumCSS WebPub
        doc.head.appendChild(styleify(doc, cached("ReadiumCSS-webpub", () => blobify(stripCSS(readiumCSSWebPub), "text/css"))));

        if (cssProperties) {
            this.setProperties(cssProperties, doc);
        }

        doc.body.querySelectorAll("img").forEach((img) => {
            img.setAttribute("fetchpriority", "high");
        });

        if(base !== undefined) {
            const b = doc.createElement("base");
            b.href = base;
            b.dataset.readium = "true";
            doc.head.firstChild!.before(b);
        }

        const hasExecutable = this.hasExecutable(doc);
        if(hasExecutable) doc.head.firstChild!.before(rBefore(doc));
        doc.head.firstChild!.before(cssSelectorGenerator(doc));
        if(hasExecutable) doc.head.appendChild(rAfter(doc));

        // Serialize properly based on content type
        let serializedContent: string;

        if (mediaType.string === "application/xhtml+xml") {
            // XHTML: Use XMLSerializer for proper XML formatting
            serializedContent = new XMLSerializer().serializeToString(doc);
        } else {
            // HTML: Use custom HTML serialization to preserve HTML formatting
            serializedContent = this.serializeAsHTML(doc, txt || "");
        }

        // Make blob from doc
        return URL.createObjectURL(
            new Blob([serializedContent], {
              type: mediaType.isHTML
                ? mediaType.string
                : "application/xhtml+xml",
            })
        );
    }

    private serializeAsHTML(doc: Document, txt: string): string {
        // For HTML content, try to preserve the original HTML structure
        // while injecting our scripts

        // Extract the original DOCTYPE if present
        const doctypeMatch = txt.match(/<!DOCTYPE[^>]*>/i);
        const doctype = doctypeMatch ? doctypeMatch[0] + "\n" : "";

        // Get the HTML element and serialize it as HTML
        const htmlElement = doc.documentElement;
        let htmlContent = htmlElement.outerHTML;

        // Try to preserve the original HTML structure
        // This is a best-effort approach since there's no perfect HTML serializer

        return doctype + htmlContent;
    }
}
