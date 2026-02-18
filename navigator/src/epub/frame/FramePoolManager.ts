import { ModuleName } from "@readium/navigator-html-injectables";
import { Locator, Publication } from "@readium/shared";
import FrameBlobBuider from "./FrameBlobBuilder";
import { FrameManager } from "./FrameManager";
import { Injector } from "../../injection/Injector";
import { IContentProtectionConfig, IKeyboardPeripheralsConfig } from "../../Navigator";

const UPPER_BOUNDARY = 5;
const LOWER_BOUNDARY = 3;

export class FramePoolManager {
    private readonly container: HTMLElement;
    private readonly positions: Locator[];
    private _currentFrame: FrameManager | undefined;
    private currentCssProperties: { [key: string]: string } | undefined;
    private readonly pool: Map<string, FrameManager> = new Map();
    private readonly blobs: Map<string, string> = new Map();
    private readonly inprogress: Map<string, Promise<void>> = new Map();
    private pendingUpdates: Map<string, { inPool: boolean }> = new Map();
    private currentBaseURL: string | undefined;
    private readonly injector: Injector | null = null;
    private readonly contentProtectionConfig: IContentProtectionConfig;
    private readonly keyboardPeripheralsConfig: IKeyboardPeripheralsConfig;

    constructor(
        container: HTMLElement, 
        positions: Locator[], 
        cssProperties?: { [key: string]: string },
        injector?: Injector | null,
        contentProtectionConfig?: IContentProtectionConfig,
        keyboardPeripheralsConfig?: IKeyboardPeripheralsConfig
    ) {
        this.container = container;
        this.positions = positions;
        this.currentCssProperties = cssProperties;
        this.injector = injector ?? null;
        this.contentProtectionConfig = contentProtectionConfig || {};
        this.keyboardPeripheralsConfig = keyboardPeripheralsConfig || [];
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
        this.blobs.forEach(v => {
            this.injector?.releaseBlobUrl?.(v);
            URL.revokeObjectURL(v);
        });

        // Clean up injector if it exists
        this.injector?.dispose();

        // Empty container of elements
        this.container.childNodes.forEach(v => {
            if(v.nodeType === Node.ELEMENT_NODE || v.nodeType === Node.TEXT_NODE) v.remove();
        })
    }

    async update(pub: Publication, locator: Locator, modules: ModuleName[], force=false) {
        let i = this.positions.findIndex(l => l.locations.position === locator.locations.position);
        if(i < 0) throw Error(`Locator not found in position list: ${locator.locations.position} > ${this.positions.reduce<number>((acc, l) => l.locations.position || 0 > acc ? l.locations.position || 0 : acc, 0)  }`);
        const newHref = this.positions[i].href;

        if(this.inprogress.has(newHref))
            // If this same href is already being loaded, block until the other function
            // call has finished executing so we don't end up e.g. loading the blob twice.
            await this.inprogress.get(newHref);

        // Create a new progress that doesn't resolve until complete
        // loading of the resource and its dependencies has finished.
        const progressPromise = new Promise<void>(async (resolve, reject) => {
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
                if(this.pendingUpdates.has(href))
                    this.pendingUpdates.set(href, { inPool: false });
            });

            // Check if base URL of publication has changed
            if(this.currentBaseURL !== undefined && pub.baseURL !== this.currentBaseURL) {
                // Revoke all blobs
                this.blobs.forEach(v => {
                    this.injector?.releaseBlobUrl?.(v);
                    URL.revokeObjectURL(v);
                });
                this.blobs.clear();
            }
            this.currentBaseURL = pub.baseURL;

            const creator = async (href: string) => {
                if(force) {
                    // Revoke all blobs so that CSSProperties are not stale
                    // When using force, we switch scroll/paginated
                    // If this property is not up to date, it creates issues
                    // when navigating backwards, where paginated will go the
                    // start of the resource instead of the end due to the
                    // corrupted width ColumnSnapper (injectables) gets on init
                    this.blobs.forEach(v => {
                        this.injector?.releaseBlobUrl?.(v);
                        URL.revokeObjectURL(v);
                    });
                    this.blobs.clear();
                    this.pendingUpdates.clear();
                }
                if(this.pendingUpdates.has(href) && this.pendingUpdates.get(href)?.inPool === false) {
                    const url = this.blobs.get(href);
                    if(url) {
                        this.injector?.releaseBlobUrl?.(url);
                        URL.revokeObjectURL(url);
                        this.blobs.delete(href);
                        this.pendingUpdates.delete(href);
                    }
                }
                if(this.pool.has(href)) {
                    const fm = this.pool.get(href)!;
                    if(!this.blobs.has(href)) {
                        await fm.destroy();
                        this.pool.delete(href);
                        this.pendingUpdates.delete(href);
                    } else {
                        await fm.load(modules);
                        return;
                    }
                }
                const itm = pub.readingOrder.findWithHref(href);
                if(!itm) return; // TODO throw?
                if(!this.blobs.has(href)) {
                    const blobBuilder = new FrameBlobBuider(
                        pub, 
                        this.currentBaseURL || "", 
                        itm, 
                        {
                            cssProperties: this.currentCssProperties,
                            injector: this.injector
                        }
                    );
                    const blobURL = await blobBuilder.build();
                    this.blobs.set(href, blobURL);
                }

                // Create <iframe>
                const fm = new FrameManager(this.blobs.get(href)!, this.contentProtectionConfig, this.keyboardPeripheralsConfig);
                if(href !== newHref) await fm.hide(); // Avoid unecessary hide
                this.container.appendChild(fm.iframe);
                await fm.load(modules);
                this.pool.set(href, fm);
            }
            try {
                await Promise.all(creation.map(href => creator(href)));
            } catch (error) {
                reject(error);
            }

            // Update current frame
            const newFrame = this.pool.get(newHref)!;
            if(newFrame?.source !== this._currentFrame?.source || force) {
                await this._currentFrame?.hide(); // Hide current frame. It's possible it no longer even exists in the DOM at this point
                if(newFrame) // If user is speeding through the publication, this can get destroyed
                    await newFrame.load(modules); // In order to ensure modules match the latest configuration

                // Update progression if necessary and show the new frame
                if(newFrame) // If user is speeding through the publication, this can get destroyed
                    await newFrame.show(locator.locations.progression); // Show/activate new frame

                this._currentFrame = newFrame;
            }
            resolve();
        });

        this.inprogress.set(newHref, progressPromise); // Add the job to the in progress map
        await progressPromise; // Wait on the job to finish...
        this.inprogress.delete(newHref); // Delete it from the in progress map!
    }

    setCSSProperties(properties: { [key: string]: string }) {
        const deepCompare = (obj1: { [key: string]: string }, obj2: { [key: string]: string }) => {
            const keys1 = Object.keys(obj1);
            const keys2 = Object.keys(obj2);
          
            if (keys1.length !== keys2.length) {
              return false;
            }
          
            for (const key of keys1) {
              if (obj1[key] !== obj2[key]) {
                return false;
              }
            }
          
            return true;
        };

        // If CSSProperties have changed, we update the currentCssProperties,
        // and set the CSS Properties to all frames already in the pool
        // We also need to invalidate the blobs and recreate them with the new properties.
        // We do that in update, by updating them when needed (they are added into the pool)
        // so that we do not invalidate and recreate blobs over and over again.
        if(!deepCompare(this.currentCssProperties || {}, properties)) {
            this.currentCssProperties = properties;
            this.pool.forEach((frame) => {
                frame.setCSSProperties(properties);
            });
            for (const href of this.blobs.keys()) {
                this.pendingUpdates.set(href, { inPool: this.pool.has(href) });
            }
        }
    }

    get currentFrames(): (FrameManager | undefined)[] {
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
            ret.width += b.width; // TODO different in vertical
            ret.height = Math.max(ret.height, b.height);
            ret.top = Math.min(ret.top, b.top);
            ret.right = Math.min(ret.right, b.right);
            ret.bottom = Math.min(ret.bottom, b.bottom);
            ret.left = Math.min(ret.left, b.left);
        });
        return ret as DOMRect;
    }
}