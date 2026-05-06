import { AutomationDetector } from "./AutomationDetector.ts";
import { DevToolsDetector } from "./DevToolsDetector.ts";
import { IframeEmbeddingDetector } from "./IframeEmbeddingDetector.ts";
import { PrintProtector } from "./PrintProtector.ts";
import { ContextMenuProtector } from "./ContextMenuProtector.ts";
import { ContextMenuEvent } from "@readium/navigator-html-injectables";
import { IContentProtectionConfig } from "../Navigator.ts";

export const NAVIGATOR_SUSPICIOUS_ACTIVITY_EVENT = "readium:navigator:suspiciousActivity";

export class NavigatorProtector {
    private automationDetector?: AutomationDetector;
    private devToolsDetector?: DevToolsDetector;
    private iframeEmbeddingDetector?: IframeEmbeddingDetector;
    private printProtector?: PrintProtector;
    private contextMenuProtector?: ContextMenuProtector;

    protected dispatchSuspiciousActivity(type: string, detail: Record<string, unknown>) {
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
                        targetFrameSrc: "",
                        key: "",
                        code: "",
                        keyCode: -1,
                        ctrlKey: false,
                        altKey: false,
                        shiftKey: false,
                        metaKey: false
                    });
                }
            });
        }

        // Enable automation detection if explicitly enabled in config
        if (config.checkAutomation) {
            this.automationDetector = new AutomationDetector({
                onDetected: (tool: string) => {
                    this.dispatchSuspiciousActivity("automation_detected", { tool });
                }
            });
        }

        // Enable iframe embedding detection if explicitly enabled in config
        if (config.checkIFrameEmbedding) {
            this.iframeEmbeddingDetector = new IframeEmbeddingDetector({
                onDetected: (isCrossOrigin: boolean) => {
                    this.dispatchSuspiciousActivity("iframe_embedding_detected", { isCrossOrigin });
                }
            });
        }

        // Enable print protection if configured
        if (config.protectPrinting?.disable) {
            this.printProtector = new PrintProtector({
                ...config.protectPrinting,
                onPrintAttempt: () => {
                    this.dispatchSuspiciousActivity("print", {});
                }
            });
        }

        // Enable context menu protection if configured
        if (config.disableContextMenu) {
            this.contextMenuProtector = new ContextMenuProtector({
                onContextMenuBlocked: (event: ContextMenuEvent) => {
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
