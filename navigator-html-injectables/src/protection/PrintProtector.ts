import { Comms } from "../comms";
import { ReadiumWindow } from "../helpers/dom";
import { Module } from "../modules/Module";
import { ModuleName } from "../modules/ModuleLibrary";

export interface PrintProtectionConfig {
    disable?: boolean;
    watermark?: string;
}

export class PrintProtector extends Module {
    static readonly moduleName: ModuleName = "print_protection";
    
    private comms!: Comms;
    private wnd!: ReadiumWindow;
    private styleElement: HTMLStyleElement | null = null;
    private beforePrintHandler: ((e: Event) => void) | null = null;
    private configApplied = false;

    private setupPrintProtection(wnd: Window, config: PrintProtectionConfig) {
        if (!config.disable) return;

        const style = wnd.document.createElement("style");
        style.textContent = `
            @media print {
                body * {
                    display: none !important;
                }
                body::after {
                    content: "${config.watermark || 'Printing has been disabled'}";
                    font-size: 200%;
                    display: block;
                    text-align: center;
                    margin-top: 50vh;
                    transform: translateY(-50%);
                }
            }
        `;
        wnd.document.head.appendChild(style);
        this.styleElement = style;

        this.beforePrintHandler = (e: Event) => {
            e.preventDefault();
            return false;
        };
        wnd.addEventListener("beforeprint", this.beforePrintHandler);
    }

    private registerPrintHandlers() {        
        this.comms?.register("print_protection", PrintProtector.moduleName, (data: unknown) => {
            const config = data as PrintProtectionConfig;
            
            if (!this.configApplied) {
                this.configApplied = true;
                this.setupPrintProtection(this.wnd, config);
                this.comms?.log("Print protection configuration applied");
            }
            
            return true;
        });
    }

    mount(wnd: ReadiumWindow, comms: Comms): boolean {
        this.wnd = wnd;
        this.comms = comms;
        this.registerPrintHandlers();
        return true;
    }

    unmount(wnd: ReadiumWindow, _comms: Comms): boolean {
        if (this.beforePrintHandler) {
            wnd.removeEventListener("beforeprint", this.beforePrintHandler);
            this.beforePrintHandler = null;
        }
        
        if (this.styleElement?.parentNode) {
            this.styleElement.parentNode.removeChild(this.styleElement);
            this.styleElement = null;
        }
        
        // Unregister all print protection handlers
        this.comms?.unregisterAll(PrintProtector.moduleName);
        
        this.configApplied = false;
        return true;
    }
}