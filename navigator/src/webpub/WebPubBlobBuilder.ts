import { Link, Publication } from "@readium/shared";
import { Injector } from "../injection/Injector";

export class WebPubBlobBuilder {
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

        // Apply resource injections if injection service is provided
        if (this.injector) {
            await this.injector.injectForDocument(doc, this.item);
        }
        return this.finalizeDOM(doc, this.burl, this.item.mediaType, txt, this.cssProperties);
    }

    private setProperties(cssProperties: { [key: string]: string }, doc: Document) {
        for (const key in cssProperties) {
            const value = cssProperties[key];
            if (value) doc.documentElement.style.setProperty(key, value);
        }
    }

    private finalizeDOM(doc: Document, base: string | undefined, mediaType: any, txt?: string, cssProperties?: { [key: string]: string }): string {
        if(!doc) return "";

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
