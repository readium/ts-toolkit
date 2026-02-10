import type { KeyCombo } from "./KeyboardCombinations";

type KeyHandler = (event: KeyboardEvent) => void;

class KeyCombinationManager {
    private static instance: KeyCombinationManager | null = null;
    private handlers = new Map<string, KeyHandler>();
    private subscriptions = new Map<string, {
        combo: KeyCombo;
        handler: KeyHandler;
        dispose: () => void;
    }>();
    private element: EventTarget | null = null;
    private boundHandleKeyDown: ((event: Event) => void) | null = null;

    private constructor() {
        this.boundHandleKeyDown = this.handleKeyDown.bind(this);
    }

    public static getInstance(): KeyCombinationManager {
        if (!KeyCombinationManager.instance) {
            KeyCombinationManager.instance = new KeyCombinationManager();
        }
        return KeyCombinationManager.instance;
    }

    private getComboId(combo: KeyCombo): string {
        // Use "in" operator to check for explicitly set false values
        const ctrl = "ctrl" in combo ? (combo.ctrl ? 1 : 0) : 0;
        const shift = "shift" in combo ? (combo.shift ? 1 : 0) : 0;
        const alt = "alt" in combo ? (combo.alt ? 1 : 0) : 0;
        const meta = "meta" in combo ? (combo.meta ? 1 : 0) : 0;
        
        return `${combo.keyCode}:${ctrl}:${shift}:${alt}:${meta}`;
    }

    /**
     * Subscribe to a key combination
     * @returns A function to unsubscribe
     */
    public subscribe(combo: KeyCombo, handler: KeyHandler): () => void {
        const id = this.getComboId(combo);
        
        // Clean up existing subscription if it exists
        this.unsubscribe(id);

        const dispose = () => this.unsubscribe(id);
        this.subscriptions.set(id, { combo, handler, dispose });
        
        return dispose;
    }

    /**
     * Subscribe to multiple key combinations with a single handler
     * @returns A function to unsubscribe all combinations
     */
    public subscribeCombinations(combos: KeyCombo[], handler: KeyHandler): () => void {
        const disposers = combos.map(combo => this.subscribe(combo, handler));
        return () => disposers.forEach(dispose => dispose());
    }

    /**
     * Unsubscribe using the subscription ID (returned from subscribe)
     */
    private unsubscribe(id: string): void {
        this.subscriptions.delete(id);
    }

    private handleKeyDown(event: Event): void {
        
        if (this.subscriptions.size === 0) {
            return;
        }

        const keyboardEvent = event as KeyboardEvent;
        const combo: KeyCombo = {
            keyCode: keyboardEvent.keyCode,  // Use stable keyCode
            ctrl: keyboardEvent.ctrlKey,
            shift: keyboardEvent.shiftKey,
            alt: keyboardEvent.altKey,
            meta: keyboardEvent.metaKey
        };

        const id = this.getComboId(combo);
        
        const subscription = this.subscriptions.get(id);
        if (subscription) {
            subscription.handler(keyboardEvent);
        }
    }

    /**
     * Attach the key manager to an element
     * @param element The target element to listen for key events on (defaults to document)
     */
    public attach(element: EventTarget = document): void {
        
        if (this.element) {
            this.detach();
        }
        this.element = element;
        if (this.boundHandleKeyDown) {
            this.element.addEventListener("keydown", this.boundHandleKeyDown, { 
                capture: true,
                passive: false 
            });
        }
    }

    /**
     * Detach all event listeners and clear all subscriptions
     */
    public detach(): void {
        if (this.element && this.boundHandleKeyDown) {
            this.element.removeEventListener("keydown", this.boundHandleKeyDown, { capture: true } as any);
        }
        this.element = null;
        this.subscriptions.clear();
    }

    /**
     * Completely destroy the KeyCombinationManager instance
     * and clean up all resources
     */
    public destroy(): void {
        this.detach();
        this.handlers.clear();
        this.subscriptions.clear();
        this.boundHandleKeyDown = null;
        KeyCombinationManager.instance = null;
    }
}

export const keyManager = KeyCombinationManager.getInstance();