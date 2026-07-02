import { KeyCombo, KeyboardPeripheral } from "./KeyboardCombinations.ts";
import { BaseKeyboardPeripheralEvent, KeyboardEventData, BasicTextSelection } from "../modules/Peripherals.ts";
import { isInteractiveElement, nearestInteractiveElement, ReadiumWindow } from "../helpers/dom.ts";

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
            if (this.matchesCombo(event, combo)) {
                return true;
            }
        }
        return false;
    }

    private matchesCombo(event: KeyboardEvent, combo: KeyCombo): boolean {
        return event.keyCode === combo.keyCode &&
               this.matchesModifier(event.ctrlKey, combo.ctrl) &&
               this.matchesModifier(event.shiftKey, combo.shift) &&
               this.matchesModifier(event.altKey, combo.alt) &&
               this.matchesModifier(event.metaKey, combo.meta);
    }

    private matchesModifier(eventModifier: boolean, comboModifier?: boolean): boolean {
        if (comboModifier === undefined) {
            // Modifier not specified: must NOT be pressed
            return !eventModifier;
        }
        // Modifier specified: must match exactly
        return eventModifier === comboModifier;
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
        let interactiveElement: string | undefined;
        
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

            // Capture interactive element information following the same pattern as onPointUp
            const activeElement = wnd.document.activeElement;
            if (activeElement && activeElement !== wnd.document.body) {
                interactiveElement = nearestInteractiveElement(activeElement)?.outerHTML;
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
            selectedText,
            interactiveElement
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
            if (!event.isTrusted) return;
            for (const handlerConfig of handlers) {
                if (this.match(event, [handlerConfig])) {
                    const suppress = handlerConfig.suppressOnInteractiveElement;
                    if (suppress) {
                        const active = (wnd?.document ?? document).activeElement;
                        if (Array.isArray(suppress) ? suppress.some(sel => active?.matches(sel)) : isInteractiveElement(active)) return;
                    }
                    event.preventDefault();
                    event.stopPropagation();
                    handlerConfig.handler!(event);
                    return;
                }
            }
        };
    }
}
