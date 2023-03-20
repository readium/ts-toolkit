import { Link, MediaType, Publication } from "@readium/shared/src";

// TODO embed locally
const READIUM_CSS_PATH = "https://cdn.jsdelivr.net/gh/readium/readium-css@583011453612e6f695056ab6c086a2c4f4cac9c0/css/dist/{FILE}";

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
        simg.loading = "lazy";
        simg.decoding = "async";
        doc.body.appendChild(simg);
        return this.finalizeDOM(doc, this.burl, this.item.mediaType);
    }

    private finalizeDOM(doc: Document, base: string | undefined, mediaType: MediaType, fxl = false): string {
        if(!doc) return "";
    
        // Inject styles
        if(!fxl) {
            const css = (name: string) => {
                const d = doc.createElement("link");
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
            doc.head.firstChild!.before(b);
        }
    
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