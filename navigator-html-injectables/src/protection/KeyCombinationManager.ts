import type { KeyCombo } from "./KeyboardCombinations";

type KeyHandler = (event: KeyboardEvent) => void;

class KeyCombinationManager {
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
}

export const keyManager = new KeyCombinationManager();