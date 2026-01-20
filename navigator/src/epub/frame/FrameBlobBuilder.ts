import { MediaType } from "@readium/shared";
import { Link, Publication } from "@readium/shared";

// Readium CSS imports
// The "?inline" query is to prevent some bundlers from injecting these into the page (e.g. vite)
// @ts-ignore
import readiumCSSAfter from "@readium/css/css/dist/ReadiumCSS-after.css?inline";
// @ts-ignore
import readiumCSSBefore from "@readium/css/css/dist/ReadiumCSS-before.css?inline";
// @ts-ignore
import readiumCSSDefault from "@readium/css/css/dist/ReadiumCSS-default.css?inline";

// Import the pre-built CSS selector generator
// This has to be injected because you need to be in the iframe's context for it to work properly
import cssSelectorGeneratorContent from "../../dom/_readium_cssSelectorGenerator.js?raw";

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

// Note: we aren't blocking some of the events right now to try and be as nonintrusive as possible.
// For a more comprehensive implementation, see https://github.com/hackademix/noscript/blob/3a83c0e4a506f175e38b0342dad50cdca3eae836/src/content/syncFetchPolicy.js#L142
// The snippet of code at the beginning of this source is an attempt at defence against JS using persistent storage
const rBefore = (doc: Document) => scriptify(doc, cached("JS-Before", () => blobify(stripJS(`
    const noop=()=>{},emptyObj={},emptyPromise=()=>Promise.resolve(void 0),fakeStorage={getItem:noop,setItem:noop,removeItem:noop,clear:noop,key:noop,length:0};["localStorage","sessionStorage"].forEach((e=>Object.defineProperty(window,e,{get:()=>fakeStorage,configurable:!0}))),Object.defineProperty(document,"cookie",{get:()=>"",set:noop,configurable:!0}),Object.defineProperty(window,"indexedDB",{get:()=>{},configurable:!0}),Object.defineProperty(window,"caches",{get:()=>emptyObj,configurable:!0}),Object.defineProperty(navigator,"storage",{get:()=>({persist:emptyPromise,persisted:emptyPromise,estimate:()=>Promise.resolve({quota:0,usage:0})}),configurable:!0}),Object.defineProperty(navigator,"serviceWorker",{get:()=>({register:emptyPromise,getRegistration:emptyPromise,ready:emptyPromise()}),configurable:!0});

    window._readium_blockedEvents = [];
    window._readium_blockEvents = true;
    window._readium_eventBlocker = (e) => {
        if(!window._readium_blockEvents) return;
        e.preventDefault();
        e.stopImmediatePropagation();
        _readium_blockedEvents.push([
            1, e, e.currentTarget || e.target
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

const csp = (domains: string[]) => {
    const d = domains.join(" ");
    return [
        // 'self' is useless because the document is loaded from a blob: URL
        `upgrade-insecure-requests`,
        `default-src ${d} blob:`,
        `connect-src 'none'`, // No fetches to anywhere. TODO: change?
        `script-src ${d} blob: 'unsafe-inline'`, // JS scripts
        `style-src ${d} blob: 'unsafe-inline'`, // CSS styles
        `img-src ${d} blob: data:`, // Images
        `font-src ${d} blob: data:`, // Fonts
        `object-src ${d} blob:`, // Despite not being recommended, still necessary in EPUBs for <object>
        `child-src ${d}`, // <iframe>, web workers
        `form-action 'none'`, // No form submissions
        //`report-uri ?`,
    ].join("; ");
};

export default class FrameBlobBuider {
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

    public async build(fxl = false): Promise<string> {
        if(!this.item.mediaType.isHTML) {
            if(this.item.mediaType.isBitmap || this.item.mediaType.equals(MediaType.SVG)) {
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
        const perror = doc.querySelector("parsererror");
        if(perror) {
            const details = perror.querySelector("div");
            throw new Error(`Failed parsing item ${this.item.href}: ${details?.textContent || perror.textContent}`);
        }
        return this.finalizeDOM(doc, this.pub.baseURL, this.burl, this.item.mediaType, fxl, this.cssProperties);
    }

    private buildImageFrame(): string {
        // Rudimentary image display
        const doc = document.implementation.createHTMLDocument(this.item.title || this.item.href);
        const simg = document.createElement("img");
        simg.src = this.burl || "";
        simg.alt = this.item.title || "";
        simg.decoding = "async";
        doc.body.appendChild(simg);
        return this.finalizeDOM(doc, this.pub.baseURL, this.burl, this.item.mediaType, true);
    }

    // Has JS that may have side-effects when the document is loaded, without any user interaction
    private hasExecutable(doc: Document): boolean {
        // This is not a 100% comprehensive check of all possibilities for JS execution,
        // but it covers what the prevention scripts cover. Other possibilities include:
        // - <iframe> src
        // - <img> with onload/onerror
        // - <meta http-equiv="refresh" content="xxx">
        return (
            !!doc.querySelector("script") || // Any <script> elements
            !!doc.querySelector("body[onload]:not(body[onload=''])") // <body> that executes JS on load
        );
    }

    private hasStyle(doc: Document): boolean {
        if(
            doc.querySelector("link[rel='stylesheet']") || // Any CSS link
            doc.querySelector("style") || // Any <style> element
            doc.querySelector("[style]:not([style=''])") // Any element with style attribute set
        ) return true;

        return false;
    }

    private setProperties(cssProperties: { [key: string]: string }, doc: Document) {
        for (const key in cssProperties) {
            const value = cssProperties[key];
            if (value) doc.documentElement.style.setProperty(key, value);
        }
    }

    private finalizeDOM(doc: Document, root: string | undefined, base: string | undefined, mediaType: MediaType, fxl = false, cssProperties?: { [key: string]: string }): string {
        if(!doc) return "";

        // Inject styles
        if(!fxl) {
            // Readium CSS Before
            const rcssBefore = styleify(doc, cached("ReadiumCSS-before", () => blobify(stripCSS(readiumCSSBefore), "text/css")));
            doc.head.firstChild ? doc.head.firstChild.before(rcssBefore) : doc.head.appendChild(rcssBefore);

            // Readium CSS defaults
            if(!this.hasStyle(doc))
                rcssBefore.after(styleify(doc, cached("ReadiumCSS-default", () => blobify(stripCSS(readiumCSSDefault), "text/css"))))

            // Readium CSS After
            doc.head.appendChild(styleify(doc, cached("ReadiumCSS-after", () => blobify(stripCSS(readiumCSSAfter), "text/css"))));

            if (cssProperties) {
                this.setProperties(cssProperties, doc);
            }
        }

        // Set all <img> elements to high priority
        // From what I understand, browser heuristics
        // de-prioritize <iframe> resources. This causes the <img>
        // elements to be loaded in sequence, which in documents
        // with many images causes significant impact to rendering
        // speed. When you increase the priority, the <img> data is
        // loaded in parallel, greatly increasing overall speed.
        doc.body.querySelectorAll("img").forEach((img) => {
            img.setAttribute("fetchpriority", "high");
        });

        // We need to ensure that lang is set on the root element 
        // since it is used for settings such as font-family, hyphens, ligatures, etc.
        // but also screen readers, etc.
        // Metadata’s effectiveReadingProgression uses first item in array as primary language 
        // so we keep it consistent.
        if (mediaType.isHTML && this.pub.metadata.languages?.[0]) {
            const primaryLanguage = this.pub.metadata.languages[0];

            if (mediaType === MediaType.XHTML) {
                // InDesign is infamous for setting xml:lang on the body instead of the root element
                // So we have to check whether lang is set on the body and move it to the root element
                const rootLang = document.documentElement.lang || document.documentElement.getAttribute("xml:lang");
                const bodyLang = document.body.lang || document.body.getAttribute("xml:lang");
                if (bodyLang && !rootLang) {
                    document.documentElement.lang = bodyLang;
                    document.documentElement.setAttribute("xml:lang", bodyLang);
                    document.body.removeAttribute("xml:lang");
                    document.body.removeAttribute("lang");
                } else if (!rootLang) {
                    document.documentElement.lang = primaryLanguage;
                    document.documentElement.setAttribute("xml:lang", primaryLanguage);
                }
            } else if (
                mediaType === MediaType.HTML && 
                !document.documentElement.lang
            ) {
                document.documentElement.lang = primaryLanguage;
            }
        }

        // We need to ensure that dir is set on the root element if rtl
        // Since body can bubble up, we also need to check it’s not here.
        // https://github.com/readium/readium-css/blob/develop/docs/CSS03-injection_and_pagination.md#be-cautious-the-direction-propagates

        // TODO: ReadiumCSS stylesheets are injected as LTR/default no matter what so disabled ATM
        /* if (
            !document.documentElement.dir &&
            !document.body.dir && 
            this.pub.metadata.effectiveReadingProgression === ReadingProgression.rtl
        ) {
            document.documentElement.dir = this.pub.metadata.effectiveReadingProgression;
        } */

        if (base !== undefined) {
            // Set all URL bases. Very convenient!
            const b = doc.createElement("base");
            b.href = base;
            b.dataset.readium = "true";
            doc.head.firstChild!.before(b);
        }

        // Inject script to prevent in-publication scripts from executing until we want them to
        const hasExecutable = this.hasExecutable(doc);
        if (hasExecutable) doc.head.firstChild!.before(rBefore(doc));
        doc.head.firstChild!.before(cssSelectorGenerator(doc)); // CSS selector utility
        if (hasExecutable) doc.head.appendChild(rAfter(doc)); // Another execution prevention script

        // Add CSP
        const meta = doc.createElement("meta");
        meta.httpEquiv = "Content-Security-Policy";
        meta.content = csp(root ? [root] : []);
        meta.dataset.readium = "true";
        doc.head.firstChild!.before(meta);


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