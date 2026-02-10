import { NAVIGATOR_SUSPICIOUS_ACTIVITY_EVENT } from "./NavigatorProtector";
import { 
    DEV_TOOLS_COMBOS, 
    SELECT_ALL_COMBOS, 
    PRINT_COMBOS, 
    KeyCombo,
    KeyboardShortcut,
    DeveloperToolsEvent, 
    SelectAllEvent, 
    PrintEvent, 
    ContextMenuEvent,
    BlockedKeyboardShortcutEvent
} from "@readium/navigator-html-injectables";

export interface KeyboardProtectionOptions {
    /** Array of key combinations or shortcut names to block */
    disableKeyboardShortcuts?: KeyboardShortcut[];
    /** Whether to block context menu in parent window */
    blockContextMenu?: boolean;
}

function expandShortcuts(shortcuts: KeyboardShortcut[] = []): KeyCombo[] {
    const result: KeyCombo[] = [];
    
    for (const shortcut of shortcuts) {
        if (typeof shortcut === "string") {
            switch (shortcut) {
                case "devTools":
                    result.push(...DEV_TOOLS_COMBOS);
                    break;
                case "selectAll":
                    result.push(...SELECT_ALL_COMBOS);
                    break;
                case "print":
                    result.push(...PRINT_COMBOS);
                    break;
            }
        } else {
            // It's a KeyCombo object
            result.push(shortcut);
        }
    }
    
    return result;
}

export class KeyboardProtector {
    private disabledCombos: KeyCombo[] = [];
    private blockContextMenu: boolean = false;
    private keydownHandler?: (event: KeyboardEvent) => void;
    private contextMenuHandler?: (event: MouseEvent) => void;

    constructor(options: KeyboardProtectionOptions = {}) {
        this.disabledCombos = expandShortcuts(options.disableKeyboardShortcuts);
        this.blockContextMenu = options.blockContextMenu ?? false;
        
        this.setupProtection();
    }
    
    private setupProtection() {
        if (this.disabledCombos.length > 0) {
            this.keydownHandler = this.handleKeydown.bind(this);
            document.addEventListener("keydown", this.keydownHandler, true);
        }
        
        if (this.blockContextMenu) {
            this.contextMenuHandler = this.handleContextMenu.bind(this);
            document.addEventListener("contextmenu", this.contextMenuHandler, true);
        }
        
        window.addEventListener("unload", () => this.destroy());
    }
    
    private handleKeydown(event: KeyboardEvent): void {
        const combo: KeyCombo = {
            keyCode: event.keyCode,
            ctrl: event.ctrlKey,
            shift: event.shiftKey,
            alt: event.altKey,
            meta: event.metaKey
        };
        
        const isBlocked = this.disabledCombos.some(disabledCombo => 
            disabledCombo.keyCode === combo.keyCode &&
            (disabledCombo.ctrl === undefined || disabledCombo.ctrl === combo.ctrl) &&
            (disabledCombo.shift === undefined || disabledCombo.shift === combo.shift) &&
            (disabledCombo.alt === undefined || disabledCombo.alt === combo.alt) &&
            (disabledCombo.meta === undefined || disabledCombo.meta === combo.meta)
        );
        
        if (isBlocked) {
            event.preventDefault();
            event.stopPropagation();
            
            // Check if the blocked combo has a custom type
            const blockedCombo = this.disabledCombos.find(disabledCombo => 
                disabledCombo.keyCode === combo.keyCode &&
                (disabledCombo.ctrl === undefined || disabledCombo.ctrl === combo.ctrl) &&
                (disabledCombo.shift === undefined || disabledCombo.shift === combo.shift) &&
                (disabledCombo.alt === undefined || disabledCombo.alt === combo.alt) &&
                (disabledCombo.meta === undefined || disabledCombo.meta === combo.meta)
            );
            
            // Determine the event type based on the key combination
            let activityEvent: DeveloperToolsEvent | SelectAllEvent | PrintEvent | BlockedKeyboardShortcutEvent;
            
            if (this.isDevToolsCombo(combo)) {
                activityEvent = {
                    type: "developer_tools",
                    timestamp: Date.now(),
                    key: event.key,
                    code: event.code,
                    ctrlKey: event.ctrlKey,
                    altKey: event.altKey,
                    shiftKey: event.shiftKey,
                    metaKey: event.metaKey
                };
            } else if (this.isSelectAllCombo(combo)) {
                activityEvent = {
                    type: "select_all",
                    timestamp: Date.now(),
                    key: event.key,
                    code: event.code,
                    ctrlKey: event.ctrlKey,
                    altKey: event.altKey,
                    shiftKey: event.shiftKey,
                    metaKey: event.metaKey
                };
            } else if (this.isPrintCombo(combo)) {
                activityEvent = {
                    type: "print",
                    timestamp: Date.now(),
                    key: event.key,
                    code: event.code,
                    ctrlKey: event.ctrlKey,
                    metaKey: event.metaKey,
                    shiftKey: event.shiftKey,
                    altKey: event.altKey
                };
            } else if (blockedCombo?.type) {
                // For custom combos, use the custom type with the 'custom:' prefix
                activityEvent = {
                    type: `custom:${blockedCombo.type}`,
                    timestamp: Date.now(),
                    key: event.key,
                    code: event.code,
                    ctrlKey: event.ctrlKey,
                    altKey: event.altKey,
                    shiftKey: event.shiftKey,
                    metaKey: event.metaKey
                };
            } else {
                // Default to blocked_keyboard_shortcut for any other blocked keys
                activityEvent = {
                    type: "blocked_keyboard_shortcut",
                    timestamp: Date.now(),
                    key: event.key,
                    code: event.code,
                    ctrlKey: event.ctrlKey,
                    altKey: event.altKey,
                    shiftKey: event.shiftKey,
                    metaKey: event.metaKey
                };
            }
            
            const customEvent = new CustomEvent(NAVIGATOR_SUSPICIOUS_ACTIVITY_EVENT, {
                detail: activityEvent
            });
            window.dispatchEvent(customEvent);
        }
    }
    
    private isDevToolsCombo(combo: KeyCombo): boolean {
        return DEV_TOOLS_COMBOS.some(devCombo => 
            devCombo.keyCode === combo.keyCode &&
            (devCombo.ctrl === undefined || devCombo.ctrl === combo.ctrl) &&
            (devCombo.shift === undefined || devCombo.shift === combo.shift) &&
            (devCombo.alt === undefined || devCombo.alt === combo.alt) &&
            (devCombo.meta === undefined || devCombo.meta === combo.meta)
        );
    }
    
    private isSelectAllCombo(combo: KeyCombo): boolean {
        return SELECT_ALL_COMBOS.some(selectCombo => 
            selectCombo.keyCode === combo.keyCode &&
            (selectCombo.ctrl === undefined || selectCombo.ctrl === combo.ctrl) &&
            (selectCombo.shift === undefined || selectCombo.shift === combo.shift) &&
            (selectCombo.alt === undefined || selectCombo.alt === combo.alt) &&
            (selectCombo.meta === undefined || selectCombo.meta === combo.meta)
        );
    }
    
    private isPrintCombo(combo: KeyCombo): boolean {
        return PRINT_COMBOS.some(printCombo => 
            printCombo.keyCode === combo.keyCode &&
            (printCombo.ctrl === undefined || printCombo.ctrl === combo.ctrl) &&
            (printCombo.shift === undefined || printCombo.shift === combo.shift) &&
            (printCombo.alt === undefined || printCombo.alt === combo.alt) &&
            (printCombo.meta === undefined || printCombo.meta === combo.meta)
        );
    }
    
    private handleContextMenu(event: MouseEvent) {
        event.preventDefault();
        event.stopPropagation();
        
        // Dispatch custom event for context menu
        const activityEvent: ContextMenuEvent = {
            type: "context_menu",
            timestamp: Date.now(),
            button: event.button,
            buttons: event.buttons,
            clientX: event.clientX,
            clientY: event.clientY
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
