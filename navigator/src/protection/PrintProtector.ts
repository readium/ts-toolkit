export interface NavigatorPrintProtectionConfig {
    disable?: boolean;
    watermark?: string;
    onPrintAttempt?: () => void;
}

export class PrintProtector {
    private styleElement: HTMLStyleElement | null = null;
    private beforePrintHandler: ((e: Event) => void) | null = null;
    private onPrintAttempt?: () => void;

    constructor(config: NavigatorPrintProtectionConfig = {}) {
        this.onPrintAttempt = config.onPrintAttempt;
        if (config.disable) {
            this.setupPrintProtection(config.watermark);
        }
    }

    private setupPrintProtection(watermark?: string) {
        const style = document.createElement("style");
        style.textContent = `
            @media print {
                body * {
                    display: none !important;
                }
                body::after {
                    content: "${watermark || 'Printing has been disabled'}";
                    font-size: 200%;
                    display: block;
                    text-align: center;
                    margin-top: 50vh;
                    transform: translateY(-50%);
                }
            }
        `;
        document.head.appendChild(style);
        this.styleElement = style;

        this.beforePrintHandler = (e: Event) => {
            e.preventDefault();
            this.onPrintAttempt?.();
            return false;
        };
        window.addEventListener("beforeprint", this.beforePrintHandler);
    }

    public destroy() {
        if (this.beforePrintHandler) {
            window.removeEventListener("beforeprint", this.beforePrintHandler);
            this.beforePrintHandler = null;
        }
        
        if (this.styleElement?.parentNode) {
            this.styleElement.parentNode.removeChild(this.styleElement);
            this.styleElement = null;
        }
    }
}
