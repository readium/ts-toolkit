import { AutomationDetector } from "./AutomationDetector";
import { IframeEmbeddingDetector } from "./IframeEmbeddingDetector";
import { KeyboardProtector } from "./KeyboardProtector";
import { IContentProtectionConfig } from "../Navigator";

export const NAVIGATOR_SUSPICIOUS_ACTIVITY_EVENT = "readium:navigator:suspiciousActivity";

export class NavigatorProtector {
    private automationDetector?: AutomationDetector;
    private iframeEmbeddingDetector?: IframeEmbeddingDetector;
    private keyboardProtector?: KeyboardProtector;

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

    constructor(config: IContentProtectionConfig = {}) {
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

        // Enable keyboard protection based on disableKeyboardShortcuts and disableContextMenu
        if ((config.disableKeyboardShortcuts && config.disableKeyboardShortcuts.length > 0) || config.disableContextMenu) {
            this.keyboardProtector = new KeyboardProtector({
                disableKeyboardShortcuts: config.disableKeyboardShortcuts || [],
                blockContextMenu: config.disableContextMenu ?? false
            });
        }
    }

    public destroy() {
        this.automationDetector?.destroy();
        this.iframeEmbeddingDetector?.destroy();
        this.keyboardProtector?.destroy();
    }
}
