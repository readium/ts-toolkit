import { ModuleName } from "@readium/navigator-html-injectables";
import { Locator, Publication } from "@readium/shared";
import { WebPubBlobBuilder } from "./WebPubBlobBuilder";
import { WebPubFrameManager } from "./WebPubFrameManager";

export class WebPubFramePoolManager {
    private readonly container: HTMLElement;
    private _currentFrame: WebPubFrameManager | undefined;
    private readonly pool: Map<string, WebPubFrameManager> = new Map();
    private readonly blobs: Map<string, string> = new Map();
    private readonly inprogress: Map<string, Promise<void>> = new Map();
    private currentBaseURL: string | undefined;

    constructor(container: HTMLElement) {
        this.container = container;
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
            await (frm.value as WebPubFrameManager).destroy();
            frm = fit.next();
        }
        this.pool.clear();

        // Revoke all blobs
        this.blobs.forEach(v => URL.revokeObjectURL(v));
        this.blobs.clear();

        // Empty container of elements
        this.container.childNodes.forEach(v => {
            if(v.nodeType === Node.ELEMENT_NODE || v.nodeType === Node.TEXT_NODE) v.remove();
        })
    }

    async update(pub: Publication, locator: Locator, modules: ModuleName[]) {
        const readingOrder = pub.readingOrder.items;
        let i = readingOrder.findIndex(l => l.href === locator.href);
        if(i < 0) throw Error(`Locator not found in reading order: ${locator.href}`);
        const newHref = readingOrder[i].href;

        if(this.inprogress.has(newHref))
            await this.inprogress.get(newHref);

        const progressPromise = new Promise<void>(async (resolve, reject) => {
            const disposal: string[] = [];
            const creation: string[] = [];
            pub.readingOrder.items.forEach((l, j) => {
                // Dispose everything except current, previous, and next
                if(j !== i && j !== i - 1 && j !== i + 1) {
                    if(!disposal.includes(l.href)) disposal.push(l.href);
                }

                // CURRENT FRAME: always create the frame we're navigating to
                if(j === i) {
                    if(!creation.includes(l.href)) creation.push(l.href);
                }

                // PREVIOUS/NEXT FRAMES: create adjacent chapters for smooth navigation
                // if((j === i - 1 || j === i + 1) && j >= 0 && j < pub.readingOrder.items.length) {
                //    if(!creation.includes(l.href)) creation.push(l.href);
                // }
            });
            disposal.forEach(async href => {
                if(creation.includes(href)) return;
                if(!this.pool.has(href)) return;
                await this.pool.get(href)?.destroy();
                this.pool.delete(href);
            });

            if(this.currentBaseURL !== undefined && pub.baseURL !== this.currentBaseURL) {
                this.blobs.forEach(v => URL.revokeObjectURL(v));
                this.blobs.clear();
            }
            this.currentBaseURL = pub.baseURL;

            const creator = async (href: string) => {
                if(this.pool.has(href)) {
                    const fm = this.pool.get(href)!;
                    if(!this.blobs.has(href)) {
                        await fm.destroy();
                        this.pool.delete(href);
                    } else {
                        await fm.load(modules);
                        return;
                    }
                }
                const itm = pub.readingOrder.findWithHref(href);
                if(!itm) return;
                if(!this.blobs.has(href)) {
                    const blobBuilder = new WebPubBlobBuilder(pub, this.currentBaseURL || "", itm);
                    const blobURL = await blobBuilder.build();
                    this.blobs.set(href, blobURL);
                }

                const fm = new WebPubFrameManager(this.blobs.get(href)!);
                if(href !== newHref) await fm.hide();
                this.container.appendChild(fm.iframe);
                await fm.load(modules);
                this.pool.set(href, fm);
            }
            try {
                await Promise.all(creation.map(href => creator(href)));
            } catch (error) {
                reject(error);
            }

            const newFrame = this.pool.get(newHref)!;
            if(newFrame?.source !== this._currentFrame?.source) {
                await this._currentFrame?.hide();
                if(newFrame)
                    await newFrame.load(modules);

                if(newFrame)
                    await newFrame.show(locator.locations.progression);

                this._currentFrame = newFrame;
            }
            resolve();
        });

        this.inprogress.set(newHref, progressPromise);
        await progressPromise;
        this.inprogress.delete(newHref);
    }

    get currentFrames(): (WebPubFrameManager | undefined)[] {
        return [this._currentFrame];
    }

    get currentBounds(): DOMRect {
        const ret = {
            x: 0,
            y: 0,
            width: 0,
            height: 0,
            top: 0,
            right: 0,
            bottom: 0,
            left: 0,
            toJSON() {
                return this;
            },
        };
        this.currentFrames.forEach(f => {
            if(!f) return;
            const b = f.realSize;
            ret.x = Math.min(ret.x, b.x);
            ret.y = Math.min(ret.y, b.y);
            ret.width += b.width;
            ret.height = Math.max(ret.height, b.height);
            ret.top = Math.min(ret.top, b.top);
            ret.right = Math.min(ret.right, b.right);
            ret.bottom = Math.min(ret.bottom, b.bottom);
            ret.left = Math.min(ret.left, b.left);
        });
        return ret as DOMRect;
    }
}