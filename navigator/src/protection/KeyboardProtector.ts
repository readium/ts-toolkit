import { NAVIGATOR_SUSPICIOUS_ACTIVITY_EVENT } from "./NavigatorProtector";
import { 
    KeyboardShortcut,
    KeyCombinationManager,
    ActivityEventDispatcher
} from "@readium/navigator-html-injectables";
import { ContextMenuEvent } from "@readium/navigator-html-injectables";

export interface KeyboardProtectionOptions {
    /** Array of key combinations or shortcut names to block */
    disableKeyboardShortcuts?: KeyboardShortcut[];
    /** Whether to block context menu in parent window */
    blockContextMenu?: boolean;
}

export class KeyboardProtector {
    private blockContextMenu: boolean = false;
    private keydownHandler?: (event: KeyboardEvent) => void;
    private contextMenuHandler?: (event: MouseEvent) => void;
    private keyManager = new KeyCombinationManager();

    constructor(options: KeyboardProtectionOptions = {}) {
        this.blockContextMenu = options.blockContextMenu ?? false;
        
        this.setupProtection(options.disableKeyboardShortcuts || []);
    }
    
    private setupProtection(disableKeyboardShortcuts: KeyboardShortcut[]) {
        if (disableKeyboardShortcuts.length > 0) {
            // Create activity event dispatcher
            const dispatcher: ActivityEventDispatcher = (activityEvent) => {
                const customEvent = new CustomEvent(NAVIGATOR_SUSPICIOUS_ACTIVITY_EVENT, {
                    detail: activityEvent
                });
                window.dispatchEvent(customEvent);
            };
            
            // Create unified handler using centralized KeyCombinationManager
            this.keydownHandler = this.keyManager.createUnifiedHandler("", disableKeyboardShortcuts, dispatcher);
            if (this.keydownHandler) {
                document.addEventListener("keydown", this.keydownHandler, true);
            }
        }
        
        if (this.blockContextMenu) {
            this.contextMenuHandler = this.handleContextMenu.bind(this);
            document.addEventListener("contextmenu", this.contextMenuHandler, true);
        }
        
        window.addEventListener("unload", () => this.destroy());
    }
    
    private handleContextMenu(event: MouseEvent) {
        event.preventDefault();
        event.stopPropagation();
        
        // Dispatch custom event for context menu
        const activityEvent: ContextMenuEvent & { type: "context_menu" } = {
            type: "context_menu",
            timestamp: Date.now(),
            clientX: event.clientX,
            clientY: event.clientY,
            targetFrameSrc: ''

        };
        
        const customEvent = new CustomEvent(NAVIGATOR_SUSPICIOUS_ACTIVITY_EVENT, {
            detail: activityEvent
        });
        window.dispatchEvent(customEvent);
        
        return false;
    }
    
    public destroy() {
        if (this.keydownHandler) {
            document.removeEventListener("keydown", this.keydownHandler, true);
            this.keydownHandler = undefined;
        }
        if (this.contextMenuHandler) {
            document.removeEventListener("contextmenu", this.contextMenuHandler, true);
            this.contextMenuHandler = undefined;
        }
    }
}
