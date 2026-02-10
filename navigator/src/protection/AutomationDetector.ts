export interface AutomationDetectorOptions {
    /** Callback when an automation tool is detected */
    onDetected?: (tool: string) => void;
}

export class AutomationDetector {
    private options: AutomationDetectorOptions;
    private detectedTools = new Set<string>();
    private observer?: MutationObserver;

    constructor(options: AutomationDetectorOptions) {
        if (!options.onDetected) {
            throw new Error('onDetected callback is required');
        }
        
        this.options = options;
        this.setupDetection();
    }

    private isAutomationToolPresent(): string | null {
        const win = window as any;
        
        if (win.domAutomation || win.domAutomationController) return "Selenium";
        if (navigator.webdriver === true) return "Puppeteer/Playwright";
        if (win.__webdriver_evaluate || win.__selenium_evaluate) return "Chrome Automation";
        if (win.callPhantom || win._phantom) return "PhantomJS";
        if (win.__nightmare) return "Nightmare";
        if (win.$testCafe) return "TestCafe";
        
        return null;
    }

    private setupDetection() {
        const tool = this.isAutomationToolPresent();
        if (tool) {
            this.handleDetected(tool);
            return;
        }

        this.observer = new MutationObserver(() => {
            const tool = this.isAutomationToolPresent();
            if (tool && !this.detectedTools.has(tool)) {
                this.handleDetected(tool);
            }
        });

        this.observer.observe(document.documentElement, {
            childList: true,
            subtree: true,
            attributes: true
        });

        window.addEventListener("unload", () => this.destroy());
    }

    private handleDetected(tool: string) {
        this.detectedTools.add(tool);
        this.options.onDetected?.(tool);
    }

    public destroy() {
        this.observer?.disconnect();
        this.observer = undefined;
        this.detectedTools.clear();
    }
}
