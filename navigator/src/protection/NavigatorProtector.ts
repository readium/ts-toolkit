import { AutomationDetector } from "./AutomationDetector";
import { DevToolsDetector } from "./DevToolsDetector";
import { IframeEmbeddingDetector } from "./IframeEmbeddingDetector";
import { PrintProtector } from "./PrintProtector";
import { ContextMenuProtector } from "./ContextMenuProtector";
import { IContentProtectionConfig } from "../Navigator";

export const NAVIGATOR_SUSPICIOUS_ACTIVITY_EVENT = "readium:navigator:suspiciousActivity";

export class NavigatorProtector {
    private automationDetector?: AutomationDetector;
    private devToolsDetector?: DevToolsDetector;
    private iframeEmbeddingDetector?: IframeEmbeddingDetector;
    private printProtector?: PrintProtector;
    private contextMenuProtector?: ContextMenuProtector;

    private dispatchSuspiciousActivity(type: string, detail: Record<string, unknown>) {
        const event = new CustomEvent(NAVIGATOR_SUSPICIOUS_ACTIVITY_EVENT, {
            detail: {
                type,
                timestamp: Date.now(),
                ...detail
            }
        });
        window.dispatchEvent(event);
    }

    constructor(
        config: IContentProtectionConfig = {}
    ) {
        // Enable DevTools detection if explicitly enabled in config
        if (config.monitorDevTools) {
            this.devToolsDetector = new DevToolsDetector({
                onDetected: () => {
                    this.dispatchSuspiciousActivity("developer_tools", {
                        targetFrameSrc: window.location.href,
                        key: "",
                        code: "",
                        keyCode: -1,
                        ctrlKey: false,
                        altKey: false,
                        shiftKey: false,
                        metaKey: false,
                        timestamp: Date.now()
                    });
                }
            });
        }

        // Enable automation detection if explicitly enabled in config
        if (config.checkAutomation) {
            this.automationDetector = new AutomationDetector({
                onDetected: (tool: string) => {
                    this.dispatchSuspiciousActivity("automation_detected", { 
                        tool,
                        timestamp: Date.now()
                    });
                }
            });
        }
        
        // Enable iframe embedding detection if explicitly enabled in config
        if (config.checkIFrameEmbedding) {
            this.iframeEmbeddingDetector = new IframeEmbeddingDetector({
                onDetected: (isCrossOrigin: boolean) => {
                    this.dispatchSuspiciousActivity("iframe_embedding_detected", {
                        isCrossOrigin,
                        timestamp: Date.now()
                    });
                }
            });
        }

        // Enable print protection if configured
        if (config.protectPrinting?.disable) {
            this.printProtector = new PrintProtector({
                ...config.protectPrinting,
                onPrintAttempt: () => {
                    this.dispatchSuspiciousActivity("print", {
                        timestamp: Date.now()
                    });
                }
            });
        }
        
        // Enable context menu protection if configured
        if (config.disableContextMenu) {
            this.contextMenuProtector = new ContextMenuProtector({
                onContextMenuBlocked: (event) => {
                    this.dispatchSuspiciousActivity("context_menu", event as unknown as Record<string, unknown>);
                }
            });
        }
    }

    public destroy() {
        this.automationDetector?.destroy();
        this.devToolsDetector?.destroy();
        this.iframeEmbeddingDetector?.destroy();
        this.printProtector?.destroy();
        this.contextMenuProtector?.destroy();
    }
}
