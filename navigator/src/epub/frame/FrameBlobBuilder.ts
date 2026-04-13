import { MediaType } from "@readium/shared";
import { Link, Publication } from "@readium/shared";
import { Injector } from "../../injection/Injector.ts";

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
    private readonly injector: Injector | null = null;

    constructor(
        pub: Publication,
        baseURL: string,
        item: Link,
        options: {
            cssProperties?: { [key: string]: string };
            injector?: Injector | null;
        }
    ) {
        this.pub = pub;
        this.item = item;
        this.burl = item.toURL(baseURL) || "";
        this.cssProperties = options.cssProperties;
        this.injector = options.injector ?? null;
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
        if (perror) {
            const details = perror.querySelector("div");
            throw new Error(`Failed parsing item ${this.item.href}: ${details?.textContent || perror.textContent}`);
        }

        // Apply resource injections if injection service is provided
        if (this.injector) {
            await this.injector.injectForDocument(doc, this.item);
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

    private setProperties(cssProperties: { [key: string]: string }, doc: Document) {
        for (const key in cssProperties) {
            const value = cssProperties[key];
            if (value) doc.documentElement.style.setProperty(key, value);
        }
    }

    private finalizeDOM(doc: Document, root: string | undefined, base: string | undefined, mediaType: MediaType, fxl = false, cssProperties?: { [key: string]: string }): string {
        if(!doc) return "";

        // Get allowed domains from injector if it exists
        const allowedDomains = this.injector?.getAllowedDomains?.() || [];

        // Always include the root domain if provided
        const domains = [...new Set([
            ...(root ? [root] : []),
            ...allowedDomains
        ])].filter(Boolean);

        // CSS and script injection is now handled by the Injector system

        // Apply CSS properties if provided (only for reflowable)
        if (cssProperties && !fxl) {
            this.setProperties(cssProperties, doc);
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

        // Add CSP with allowed domains
        const meta = doc.createElement("meta");
        meta.httpEquiv = "Content-Security-Policy";
        meta.content = csp(domains);
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
