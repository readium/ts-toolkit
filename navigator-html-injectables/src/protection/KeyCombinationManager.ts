import { KeyCombo, KeyboardShortcut } from "./KeyboardCombinations";
import { DEV_TOOLS_COMBOS, SELECT_ALL_COMBOS, PRINT_COMBOS, SAVE_COMBOS } from "./KeyboardCombinations";
import { SuspiciousActivityType } from "../comms/keys";
import { BaseSuspiciousActivityEvent, KeyboardEventData } from "../modules/Peripherals";

export type KeyHandler = (event: KeyboardEvent) => void;
export type ActivityEventDispatcher = (event: BlockedKeyboardShortcutEvent) => void;

export interface BlockedKeyboardShortcutEvent extends Omit<BaseSuspiciousActivityEvent, "type">, KeyboardEventData {
    type: "blocked_keyboard_shortcut" | `custom:${string}`;
}

export interface KeyComboWithHandler extends KeyCombo {
    handler?: (event: KeyboardEvent) => void;
}

export class KeyCombinationManager {
    /**
     * Checks if the given keyboard event matches any of the provided key combinations
     */
    public match(event: KeyboardEvent, combos: KeyCombo[]): boolean {
        for (const combo of combos) {
            const keyMatch = event.keyCode === combo.keyCode;
            const ctrlMatch = combo.ctrl === undefined || event.ctrlKey === combo.ctrl;
            const shiftMatch = combo.shift === undefined || event.shiftKey === combo.shift;
            const altMatch = combo.alt === undefined || event.altKey === combo.alt;
            const metaMatch = combo.meta === undefined || event.metaKey === combo.meta;
            
            if (keyMatch && ctrlMatch && shiftMatch && altMatch && metaMatch) {
                return true;
            }
        }
        return false;
    }

    /**
     * Creates an event handler that will call the provided handler when any of the key combinations match
     */
    public createKeyHandler(combos: KeyCombo[], handler: KeyHandler): (event: KeyboardEvent) => void {
        return (event: KeyboardEvent) => {
            if (this.match(event, combos)) {
                event.preventDefault();
                event.stopPropagation();
                handler(event);
            }
        };
    }

    /**
     * Creates a standardized activity event for keyboard shortcuts
     */
    private createActivityEvent(
        event: KeyboardEvent, 
        type: SuspiciousActivityType
    ): BlockedKeyboardShortcutEvent {
        return {
            type: type as BlockedKeyboardShortcutEvent['type'],
            timestamp: Date.now(),
            key: event.key,
            code: event.code,
            keyCode: event.keyCode,
            ctrlKey: event.ctrlKey,
            altKey: event.altKey,
            shiftKey: event.shiftKey,
            metaKey: event.metaKey
        };
    }

    /**
     * Determines the activity event type based on the combo and shortcut type
     */
    private getActivityEventType(combo: KeyCombo, shortcutType?: string): SuspiciousActivityType {
        if (shortcutType) {
            switch (shortcutType) {
                case "devTools": return "developer_tools";
                case "selectAll": return "select_all";
                case "print": return "print";
                case "save": return "save";
                default:
                    return combo.type ? `custom:${combo.type}` as SuspiciousActivityType : "blocked_keyboard_shortcut";
            }
        }
        
        if (combo.type) {
            return `custom:${combo.type}` as SuspiciousActivityType;
        }
        
        return "blocked_keyboard_shortcut";
    }

    /**
     * Creates handlers for keyboard shortcuts with centralized activity event dispatch
     */
    public createProtectionHandlers(
        shortcuts: KeyboardShortcut[],
        dispatcher: ActivityEventDispatcher
    ): KeyComboWithHandler[] {
        const handlers: KeyComboWithHandler[] = [];

        // Handle built-in shortcut types
        if (shortcuts.includes("devTools")) {
            handlers.push(...DEV_TOOLS_COMBOS.map(combo => ({
                ...combo,
                handler: (event: KeyboardEvent) => {
                    const activityEvent = this.createActivityEvent(event, "developer_tools");
                    dispatcher(activityEvent);
                }
            })));
        }

        if (shortcuts.includes("selectAll")) {
            handlers.push(...SELECT_ALL_COMBOS.map(combo => ({
                ...combo,
                handler: (event: KeyboardEvent) => {
                    const activityEvent = this.createActivityEvent(event, "select_all");
                    dispatcher(activityEvent);
                }
            })));
        }

        if (shortcuts.includes("print")) {
            handlers.push(...PRINT_COMBOS.map(combo => ({
                ...combo,
                handler: (event: KeyboardEvent) => {
                    const activityEvent = this.createActivityEvent(event, "print");
                    dispatcher(activityEvent);
                }
            })));
        }

        if (shortcuts.includes("save")) {
            handlers.push(...SAVE_COMBOS.map(combo => ({
                ...combo,
                handler: (event: KeyboardEvent) => {
                    const activityEvent = this.createActivityEvent(event, "save");
                    dispatcher(activityEvent);
                }
            })));
        }

        // Handle custom combos
        const customCombos = shortcuts.filter((s): s is KeyCombo => typeof s !== "string");
        handlers.push(...customCombos.map(combo => ({
            ...combo,
            handler: (event: KeyboardEvent) => {
                const eventType = this.getActivityEventType(combo);
                const activityEvent = this.createActivityEvent(event, eventType);
                dispatcher(activityEvent);
            }
        })));

        return handlers;
    }

    /**
     * Creates a unified keyboard event handler that processes all shortcuts
     */
    public createUnifiedHandler(
        shortcuts: KeyboardShortcut[],
        dispatcher: ActivityEventDispatcher
    ): (event: KeyboardEvent) => void {
        const handlers = this.createProtectionHandlers(shortcuts, dispatcher);
        
        return (event: KeyboardEvent) => {
            for (const handlerConfig of handlers) {
                if (this.match(event, [handlerConfig])) {
                    event.preventDefault();
                    event.stopPropagation();
                    handlerConfig.handler!(event);
                    return; // Stop after first match
                }
            }
        };
    }
}