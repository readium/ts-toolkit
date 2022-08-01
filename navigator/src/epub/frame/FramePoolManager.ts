import { ModuleName } from "../../../../navigator-html/src";
import { Locator } from "../../../../shared/src/publication/Locator";
import { Publication } from "../../../../shared/src/publication/Publication";
import { MediaType } from "../../../../shared/src/util/mediatype/MediaType";
import FrameManager from "./FrameManager";

const UPPER_BOUNDARY = 5;
const LOWER_BOUNDARY = 3;

export default class FramePoolManager {
    private readonly container: HTMLElement;
    private readonly positions: Locator[];
    private _currentFrame: FrameManager;
    private readonly pool: Map<string, FrameManager> = new Map();
    private readonly blobs: Map<string, string> = new Map();

    constructor(container: HTMLElement, positions: Locator[]) {
        this.container = container;
        this.positions = positions;
    }

    destroy() {
        this.pool.clear();
        this.blobs.forEach(v => URL.revokeObjectURL(v));
    }

    private finalizeDOM(doc: Document, base: string | undefined, mediaType: MediaType): string {
        if(!doc) return "";

        // Inject scripts/styles
        const css = (name: string) => {
            const d = doc.createElement("link");
            d.rel = "stylesheet";
            d.type = "text/css";
            d.href = // TODO standardize
            "https://cdn.jsdelivr.net/gh/readium/readium-css@583011453612e6f695056ab6c086a2c4f4cac9c0/css/dist/{FILE}".replace(
                "{FILE}",
                name
            );
            return d;
        };
        doc.head.firstChild ? doc.head.firstChild.before(css("ReadiumCSS-before.css")) : doc.head.appendChild(css("ReadiumCSS-before.css"));
        doc.head.appendChild(css("ReadiumCSS-after.css"));

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

    async update(pub: Publication, locator: Locator, modules: ModuleName[]) {
        let i = this.positions.findIndex(l => l.locations.position === locator.locations.position);
        if(i < 0) throw Error("Locator not found in position list");
        const disposal: string[] = [];
        const creation: string[] = [];
        this.positions.forEach((l, j) => {
            if(j > (i + UPPER_BOUNDARY) || j < (i - UPPER_BOUNDARY))
                if(!disposal.includes(l.href)) disposal.push(l.href);
            if(j < (i + LOWER_BOUNDARY) && j > (i - LOWER_BOUNDARY))
                if(!creation.includes(l.href)) creation.push(l.href);
        })
        disposal.forEach(href => {
            if(creation.includes(href)) return;
            if(!this.pool.has(href)) return;
            this.pool.get(href)?.destroy();
            this.pool.delete(href);
        })

        const creator = async (href: string) => {
            if(this.pool.has(href)) {
                await this.pool.get(href)!.load(modules);
                return;
            }
            const itm = pub.readingOrder.findWithHref(href);
            if(!itm) return; // TODO throw?
            const burl = itm.toURL(pub.baseURL) || "";
            if(!itm.mediaType.isHTML) {
                if(itm.mediaType.isBitmap) {
                    // Rudimentary image display
                    const doc = document.implementation.createHTMLDocument(itm.title || itm.href);
                    const simg = document.createElement("img");
                    simg.src = burl || "";
                    simg.alt = itm.title || "";
                    simg.loading = "lazy";
                    simg.decoding = "async";
                    doc.body.appendChild(simg);
                    const blobURL = this.finalizeDOM(doc, burl, itm.mediaType);
                    this.blobs.set(href, blobURL);
                } else
                    throw Error("Unsupported frame mediatype " + itm.mediaType.string);
            }
            if(!this.blobs.has(href)) {
                // Load the resource
                const txt = await pub.get(itm).readAsString();
                if(!txt) throw new Error(`Failed reading item ${itm.href}`);
                const doc = new DOMParser().parseFromString(
                    txt,
                    itm.mediaType.string as DOMParserSupportedType
                );
                const blobURL = this.finalizeDOM(doc, burl, itm.mediaType);
                this.blobs.set(href, blobURL);
            }

            // Create <iframe>
            const fm = new FrameManager(this.blobs.get(href)!);
            fm.hide();
            this.container.appendChild(fm.iframe);
            await fm.load(modules);
            this.pool.set(href, fm);
        }
        await Promise.all(creation.map(href => creator(href)))

        // Update current frame
        const newFrame = this.pool.get(this.positions[i].href)!;
        if(newFrame !== this._currentFrame) {
            this._currentFrame?.hide(); // Hide current frame
            await newFrame.load(modules); // In order to ensure modules match the latest configuration
            newFrame.show(); // Show/activate new frame
            this._currentFrame = newFrame;
        }
    }

    get currentFrame(): FrameManager {
        return this._currentFrame;
    }
}