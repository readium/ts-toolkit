import { ContextMenuEvent } from "@readium/navigator-html-injectables";

export interface ContextMenuProtectionOptions {
    onContextMenuBlocked?: (event: ContextMenuEvent) => void;
}

export class ContextMenuProtector {
    private contextMenuHandler?: (event: MouseEvent) => void;
    private onContextMenuBlocked?: (event: ContextMenuEvent) => void;

    constructor(options: ContextMenuProtectionOptions = {}) {
        this.onContextMenuBlocked = options.onContextMenuBlocked;
        this.contextMenuHandler = this.handleContextMenu.bind(this);
        document.addEventListener("contextmenu", this.contextMenuHandler, true);
        
        window.addEventListener("unload", () => this.destroy());
    }
    
    private handleContextMenu(event: MouseEvent) {
        event.preventDefault();
        event.stopPropagation();
        
        // Create context menu event
        const activityEvent: ContextMenuEvent & { type: "context_menu" } = {
            type: "context_menu",
            timestamp: Date.now(),
            clientX: event.clientX,
            clientY: event.clientY,
            targetFrameSrc: ''
        };
        
        // Call the callback if provided
        if (this.onContextMenuBlocked) {
            this.onContextMenuBlocked(activityEvent);
        }
        
        return false;
    }
    
    public destroy() {
        if (this.contextMenuHandler) {
            document.removeEventListener("contextmenu", this.contextMenuHandler, true);
            this.contextMenuHandler = undefined;
        }
    }
}
