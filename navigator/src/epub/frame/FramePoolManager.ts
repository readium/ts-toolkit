import { ModuleName } from "@readium/navigator-html-injectables/src";
import { Locator, Publication, MediaType } from "@readium/shared/src";
import FrameManager from "./FrameManager";

const UPPER_BOUNDARY = 5;
const LOWER_BOUNDARY = 3;

export default class FramePoolManager {
    private readonly container: HTMLElement;
    private readonly positions: Locator[];
    private _currentFrame: FrameManager | undefined;
    private readonly pool: Map<string, FrameManager> = new Map();
    private readonly blobs: Map<string, string> = new Map();
    private readonly inprogress: Map<string, Promise<void>> = new Map();

    constructor(container: HTMLElement, positions: Locator[]) {
        this.container = container;
        this.positions = positions;
    }

    async destroy() {
        // Wait for all in-progress loads to complete
        let iit = this.inprogress.values();
        let inp = iit.next();
        const inprogressPromises: Promise<void>[] = [];
        while(inp.value) {
            inprogressPromises.push(inp.value);
            inp = iit.next();
        }
        if(inprogressPromises.length > 0) {
            await Promise.allSettled(inprogressPromises);
        }
        this.inprogress.clear();

        // Destroy all frames
        let fit = this.pool.values();
        let frm = fit.next();
        while(frm.value) {
            await (frm.value as FrameManager).destroy();
            frm = fit.next();
        }
        this.pool.clear();

        // Revoke all blobs
        this.blobs.forEach(v => URL.revokeObjectURL(v));

        // Empty container of elements
        this.container.childNodes.forEach(v => {
            if(v.nodeType === Node.ELEMENT_NODE || v.nodeType === Node.TEXT_NODE) v.remove();
        })
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
        const newHref = this.positions[i].href;

        if(this.inprogress.has(newHref))
            // If this same href is already being loaded, block until the other function
            // call has finished executing so we don't end up e.g. loading the blob twice.
            await this.inprogress.get(newHref);

        // Create a new progress that doesn't resolve until complete
        // loading of the resourceresource has finished.
        const progressPromise = new Promise<void>(async (resolve, _) => {
            const disposal: string[] = [];
            const creation: string[] = [];
            this.positions.forEach((l, j) => {
                if(j > (i + UPPER_BOUNDARY) || j < (i - UPPER_BOUNDARY)) {
                    if(!disposal.includes(l.href)) disposal.push(l.href);
                }
                if(j < (i + LOWER_BOUNDARY) && j > (i - LOWER_BOUNDARY)) {
                    if(!creation.includes(l.href)) creation.push(l.href);
                }
            });
            disposal.forEach(async href => {
                if(creation.includes(href)) return;
                if(!this.pool.has(href)) return;
                await this.pool.get(href)?.destroy();
                this.pool.delete(href);
            });
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
                if(href !== newHref) await fm.hide(); // Avoid unecessary hide
                this.container.appendChild(fm.iframe);
                await fm.load(modules);
                this.pool.set(href, fm);
            }
            await Promise.all(creation.map(href => creator(href)));

            // Update current frame
            const newFrame = this.pool.get(newHref)!;
            if(newFrame?.source !== this._currentFrame?.source) {
                await newFrame.load(modules); // In order to ensure modules match the latest configuration
                await newFrame.show(); // Show/activate new frame
                await this._currentFrame?.hide(); // Hide current frame. It's possible it no longer even exists
                this._currentFrame = newFrame;
            }
            resolve();
        });

        this.inprogress.set(newHref, progressPromise); // Add the job to the in progress map
        await progressPromise; // Wait on the job to finish...
        this.inprogress.delete(newHref); // Delete it from the in progress map!
    }

    get currentFrame(): FrameManager | undefined {
        return this._currentFrame;
    }
}