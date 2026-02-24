export interface IframeEmbeddingDetectorOptions {
    /** Callback when iframe embedding is detected */
    onDetected?: (isCrossOrigin: boolean) => void;
}

export class IframeEmbeddingDetector {
    private options: IframeEmbeddingDetectorOptions;
    private observer?: MutationObserver;
    private detected = false;

    constructor(options: IframeEmbeddingDetectorOptions) {
        if (!options.onDetected) {
            throw new Error('onDetected callback is required');
        }
        
        this.options = options;
        this.setupDetection();
    }

    private isIframed(): { isEmbedded: boolean; isCrossOrigin: boolean } {
        try {
            // If we can access top, check if we're in an iframe
            const isEmbedded = window.self !== window.top;
            if (!isEmbedded) {
                return { isEmbedded: false, isCrossOrigin: false };
            }
            
            // Try to access top's location - will throw if cross-origin
            // @ts-ignore - We know this might throw
            const isCrossOrigin = !window.top.location.href;
            return { isEmbedded: true, isCrossOrigin };
        } catch (e) {
            // If we can't access top due to same-origin policy, it's cross-origin
            return { isEmbedded: true, isCrossOrigin: true };
        }
    }

    private setupDetection() {
        const { isEmbedded, isCrossOrigin } = this.isIframed();
        if (isEmbedded) {
            this.handleDetected(isCrossOrigin);
            return;
        }

        // Set up a listener for future checks in case the page is embedded later
        this.observer = new MutationObserver(() => {
            const { isEmbedded, isCrossOrigin } = this.isIframed();
            if (isEmbedded && !this.detected) {
                this.handleDetected(isCrossOrigin);
                this.observer?.disconnect(); // No need to observe further
            }
        });

        this.observer.observe(document.documentElement, {
            childList: true,
            subtree: true,
            attributes: true
        });

        window.addEventListener("unload", () => this.destroy());
    }

    private handleDetected(isCrossOrigin: boolean) {
        this.detected = true;
        this.options.onDetected?.(isCrossOrigin);
    }

    public destroy() {
        this.observer?.disconnect();
        this.observer = undefined;
        this.detected = false;
    }
}
