import { KeyCombo, KeyboardPeripheral } from "./KeyboardCombinations.ts";
import { BaseKeyboardPeripheralEvent, KeyboardEventData, BasicTextSelection } from "../modules/Peripherals.ts";
import { ReadiumWindow } from "../helpers/dom.ts";

export type KeyHandler = (event: KeyboardEvent) => void;
export type ActivityEventDispatcher = (event: KeyboardPeripheralEvent) => void;

export interface KeyboardPeripheralEvent extends BaseKeyboardPeripheralEvent, KeyboardEventData {
    type: string;
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
        type: string,
        targetFrameSrc: string,
        wnd?: ReadiumWindow,
    ): KeyboardPeripheralEvent {
        // Capture selected text if window is available
        let selectedText: Omit<BasicTextSelection, "targetFrameSrc"> | undefined;
        if (wnd) {
            const selection = wnd.getSelection();
            const selectedTextStr = selection?.toString() || '';
            const domRectList = (selectedTextStr && selection?.rangeCount) ? selection.getRangeAt(0)?.getClientRects() : null;
            const rect = domRectList?.[0];

            if (rect && selectedTextStr) {
                selectedText = {
                    text: selectedTextStr,
                    x: rect.x,
                    y: rect.y,
                    width: rect.width,
                    height: rect.height
                };
            }
        }

        return {
            type: type,
            timestamp: Date.now(),
            key: event.key,
            code: event.code,
            keyCode: event.keyCode,
            ctrlKey: event.ctrlKey,
            altKey: event.altKey,
            shiftKey: event.shiftKey,
            metaKey: event.metaKey,
            targetFrameSrc: targetFrameSrc,
            selectedText
        };
    }

    /**
     * Creates handlers for keyboard shortcuts with centralized activity event dispatch
     */
    public createKeyboardHandlers(
        targetFrameSrc: string,
        shortcuts: KeyboardPeripheral[],
        dispatcher: ActivityEventDispatcher,
        wnd?: ReadiumWindow,
    ): KeyComboWithHandler[] {
        const handlers: KeyComboWithHandler[] = [];

        // Handle KeyboardPeripheral objects only
        shortcuts.forEach(shortcut => {
            handlers.push(...shortcut.keyCombos.map(combo => ({
                ...combo,
                handler: (event: KeyboardEvent) => {
                    const eventType = shortcut.type;
                    const activityEvent = this.createActivityEvent(event, eventType, targetFrameSrc, wnd);
                    dispatcher(activityEvent);
                }
            })));
        });

        return handlers;
    }

    /**
     * Creates a unified keyboard event handler that processes all shortcuts
     */
    public createUnifiedHandler(
        targetFrameSrc: string,
        shortcuts: KeyboardPeripheral[],
        dispatcher: ActivityEventDispatcher,
        wnd?: ReadiumWindow,
    ): (event: KeyboardEvent) => void {
        const handlers = this.createKeyboardHandlers(targetFrameSrc, shortcuts, dispatcher, wnd);

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
