import { ModuleName } from "@readium/navigator-html-injectables";
import { Locator, Publication } from "@readium/shared";
import { WebPubBlobBuilder } from "./WebPubBlobBuilder";
import { WebPubFrameManager } from "./WebPubFrameManager";

export class WebPubFramePoolManager {
    private readonly container: HTMLElement;
    private _currentFrame: WebPubFrameManager | undefined;
    private currentBlobUrl: string | null = null;
    private currentBaseURL: string | undefined;

    constructor(container: HTMLElement) {
        this.container = container;
    }

    async destroy() {
        if (this._currentFrame) {
            await this._currentFrame.destroy();
            this._currentFrame = undefined;
        }

        // Revoke current blob
        if (this.currentBlobUrl) {
            URL.revokeObjectURL(this.currentBlobUrl);
            this.currentBlobUrl = null;
        }
    }

    async update(pub: Publication, locator: Locator, modules: ModuleName[]) {
        // For WebPub, we only need one frame since it's single-resource scrolling
        // Get the current resource href from the locator
        const href = locator.href;

        // Check if base URL of publication has changed
        if (this.currentBaseURL !== undefined && pub.baseURL !== this.currentBaseURL) {
            // Revoke current blob
            if (this.currentBlobUrl) {
                URL.revokeObjectURL(this.currentBlobUrl);
                this.currentBlobUrl = null;
            }
        }
        this.currentBaseURL = pub.baseURL;

        // Check if we need to create/update the frame
        if (!this._currentFrame || this._currentFrame.source !== href) {
            // Destroy existing frame if it exists
            if (this._currentFrame) {
                await this._currentFrame.destroy();
            }

            // Create blob for the current resource if we don't have one
            if (!this.currentBlobUrl) {
                const currentLink = pub.readingOrder.findWithHref(href);
                if (currentLink) {
                    const blobBuilder = new WebPubBlobBuilder(pub, this.currentBaseURL || "", currentLink);
                    this.currentBlobUrl = await blobBuilder.build();
                }
            }

            // Create new frame manager
            if (this.currentBlobUrl) {
                this._currentFrame = new WebPubFrameManager(this.currentBlobUrl);
                this.container.appendChild(this._currentFrame.iframe);
                await this._currentFrame.load(modules);
                await this._currentFrame.show(locator.locations.progression);
            }
        }
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