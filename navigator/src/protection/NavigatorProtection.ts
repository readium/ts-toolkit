export interface NavigatorProtectionOptions {
    /** Whether to detect automation tools (like Selenium, Puppeteer, etc.) */
    detectAutomationTools?: boolean;
    /** Whether to detect if the content is embedded in an iframe */
    detectIframeEmbedding?: boolean;
    /** Callback when an automation tool is detected */
    onAutomationDetected?: (tool: string) => void;
    /** Callback when iframe embedding is detected */
    onIframeEmbeddingDetected?: (isCrossOrigin: boolean) => void;
}

export class NavigatorProtection {
    private options: Required<NavigatorProtectionOptions>;
    private detectedTools = new Set<string>();

    constructor(options: NavigatorProtectionOptions = {}) {
        this.options = {
            detectAutomationTools: true,
            detectIframeEmbedding: true,
            onAutomationDetected: (tool) => {
                console.warn(`Automation tool detected: ${tool}`);
                window.dispatchEvent(new CustomEvent('navigator:automationDetected', { 
                    detail: { tool } 
                }));
            },
            onIframeEmbeddingDetected: (isCrossOrigin) => {
                const type = isCrossOrigin ? 'cross-origin' : 'same-origin';
                console.warn(`Content embedded in ${type} iframe`);
                window.dispatchEvent(new CustomEvent('navigator:iframeEmbeddingDetected', { 
                    detail: { isCrossOrigin } 
                }));
            },
            ...options
        };

        if (this.options.detectAutomationTools) {
            this.setupAutomationDetection();
        }
        
        if (this.options.detectIframeEmbedding) {
            this.setupIframeDetection();
        }
    }

    private isAutomationToolPresent() {
        const win = window as any;
        
        if (win.domAutomation || win.domAutomationController) return 'Selenium';
        if (navigator.webdriver === true) return 'Puppeteer/Playwright';
        if (win.__webdriver_evaluate || win.__selenium_evaluate) return 'Chrome Automation';
        if (win.callPhantom || win._phantom) return 'PhantomJS';
        if (win.__nightmare) return 'Nightmare';
        if (win.$testCafe) return 'TestCafe';
        
        return null;
    }

    private setupAutomationDetection() {
        const tool = this.isAutomationToolPresent();
        if (tool) {
            this.handleAutomationDetected(tool);
            return;
        }

        const observer = new MutationObserver(() => {
            const tool = this.isAutomationToolPresent();
            if (tool && !this.detectedTools.has(tool)) {
                this.handleAutomationDetected(tool);
            }
        });

        observer.observe(document.documentElement, {
            childList: true,
            subtree: true,
            attributes: true
        });

        window.addEventListener('unload', () => observer.disconnect());
    }

    private handleAutomationDetected(tool: string) {
        this.detectedTools.add(tool);
        this.options.onAutomationDetected?.(tool);
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

    private setupIframeDetection() {
        const { isEmbedded, isCrossOrigin } = this.isIframed();
        if (isEmbedded) {
            this.handleIframeEmbeddingDetected(isCrossOrigin);
            return;
        }

        // Set up a listener for future checks in case the page is embedded later
        const observer = new MutationObserver(() => {
            const { isEmbedded, isCrossOrigin } = this.isIframed();
            if (isEmbedded) {
                this.handleIframeEmbeddingDetected(isCrossOrigin);
                observer.disconnect(); // No need to observe further
            }
        });

        observer.observe(document.documentElement, {
            childList: true,
            subtree: true,
            attributes: true
        });

        window.addEventListener('unload', () => observer.disconnect());
    }

    private handleIframeEmbeddingDetected(isCrossOrigin: boolean) {
        this.options.onIframeEmbeddingDetected?.(isCrossOrigin);
    }

    public destroy() {
        this.detectedTools.clear();
    }
}

export const navigatorProtection = new NavigatorProtection();
