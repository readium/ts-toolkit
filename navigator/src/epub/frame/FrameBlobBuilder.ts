import { Link, MediaType, Publication, ReadingProgression, Resource } from "@readium/shared";
import { Injector } from "../../injection/Injector.ts";
import { getScriptMode } from "../../helpers/scriptMode.ts";

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

export default class FrameBlobBuilder {
    private readonly cssProperties?: { [key: string]: string };
    private readonly injector: Injector | null = null;

    private currentUrl?: string;
    private currentResource?: Resource;

    constructor(
        private readonly pub: Publication,
        private readonly baseURL: string,
        private readonly item: Link,
        options: {
            cssProperties?: { [key: string]: string };
            injector?: Injector | null;
        }
    ) {
        this.item = item;
        this.cssProperties = options.cssProperties;
        this.injector = options.injector ?? null;
    }

    public reset() {
        this.currentUrl && URL.revokeObjectURL(this.currentUrl);
        this.currentUrl = undefined;
        this.currentResource?.close();
        this.currentResource = undefined;
    }

    public async build(fxl = false): Promise<string> {
        if(this.currentUrl) return this.currentUrl;

        this.currentResource = this.pub.get(this.item);
        const link = await this.currentResource.link();
        if(!this.currentResource) {
            // Reset has occured in the meantime
            return "about:blank";
        }
        if(!link.mediaType.isHTML) {
            if(link.mediaType.isBitmap || link.mediaType.equals(MediaType.SVG)) {
                const blobUrl = await this.buildImageFrame();
                this.currentUrl = blobUrl;
                return blobUrl;
            } else
                throw Error("Unsupported frame mediatype " + link.mediaType.string);
        } else {
            const blobUrl = await this.buildHtmlFrame(fxl);
            this.currentUrl = blobUrl;
            return blobUrl;
        }
    }

    private async buildHtmlFrame(fxl = false): Promise<string> {
        if(!this.currentResource) throw new Error("No resource loaded");

        // Load the HTML resource
        const link = await this.currentResource.link();
        const txt = await this.currentResource.readAsString();
        if(!txt) throw new Error(`Failed reading item ${link.href}`);


        const doc = new DOMParser().parseFromString(
            txt,
            link.mediaType.string as DOMParserSupportedType
        );

        const perror = doc.querySelector("parsererror");
        if (perror) {
            const details = perror.querySelector("div");
            throw new Error(`Failed parsing item ${link.href}: ${details?.textContent || perror.textContent}`);
        }

        // Apply resource injections if injection service is provided
        if (this.injector) {
            await this.injector.injectForDocument(doc, link);
        }

        return this.finalizeDOM(doc, this.pub.baseURL, link.toURL(this.baseURL) || "", link.mediaType, fxl, this.cssProperties);
    }

    private async buildImageFrame(): Promise<string> {
        if(!this.currentResource) throw new Error("No resource loaded");
        const link = await this.currentResource.link();
        const burl = link.toURL(this.baseURL) || ""

        // Rudimentary image display in an HTML doc
        const doc = document.implementation.createHTMLDocument(link.title || link.href);

        // Add viewport if available
        if((link?.height || 0) > 0 && (link?.width || 0) > 0) {
            const viewportMeta = doc.createElement("meta");
            viewportMeta.name = "viewport";
            viewportMeta.content = `width=${link.width}, height=${link.height}`;
            viewportMeta.dataset.readium = "true";
            doc.head.appendChild(viewportMeta);
        }

        const simg = document.createElement("img");
        simg.src = burl || "";
        simg.alt = link.title || "";
        simg.decoding = "async";
        doc.body.appendChild(simg);

        // Apply resource injections if injection service is provided
        if (this.injector) {
            await this.injector.injectForDocument(doc, new Link({
                // Temporary solution to address injector only expecting (X)HTML
                // documents for injection, which we are technically providing
                href: "readium-image-frame.xhtml",
                type: MediaType.XHTML.string
            }));
        }

        // Add image style
        const sstyle = doc.createElement("style");
        sstyle.dataset.readium = "true";
        sstyle.textContent = `
        html, body { width: 100%; height: 100%; margin: 0; padding: 0; font-size: 0; }
        img { margin: 0; padding: 0; border: 0; }`;
        doc.head.appendChild(sstyle);

        return this.finalizeDOM(doc, this.pub.baseURL, burl, link.mediaType, true);
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

        // Remove query from root if present, as CSP doesn't allow them
        root = root?.split("?")[0];


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
            img.setAttribute("referrerpolicy", "origin");
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
                const rootLang = doc.documentElement.lang || doc.documentElement.getAttribute("xml:lang");
                const bodyLang = doc.body.lang || doc.body.getAttribute("xml:lang");
                if (bodyLang && !rootLang) {
                    doc.documentElement.lang = bodyLang;
                    doc.documentElement.setAttribute("xml:lang", bodyLang);
                    doc.body.removeAttribute("xml:lang");
                    doc.body.removeAttribute("lang");
                } else if (!rootLang) {
                    doc.documentElement.lang = primaryLanguage;
                    doc.documentElement.setAttribute("xml:lang", primaryLanguage);
                }
            } else if (
                mediaType === MediaType.HTML &&
                !doc.documentElement.lang
            ) {
                doc.documentElement.lang = primaryLanguage;
            }
        }

        // Set dir="rtl" on the root element for RTL publications if the author
        // has not already declared a direction on html or body.
        // See: https://github.com/readium/readium-css/blob/develop/docs/CSS03-injection_and_pagination.md#be-cautious-the-direction-propagates
        // CJK modes must NEVER receive a dir attribute — writing-mode handles
        // directionality visually, and dir="rtl" would break vertical layout.
        const scriptMode = getScriptMode(this.pub.metadata);
        if (scriptMode === "rtl" &&
            !doc.documentElement.dir &&
            !doc.body.dir
        ) {
            doc.documentElement.dir = ReadingProgression.rtl;
        }

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
