import { 
    KeyCombinationManager,
    ActivityEventDispatcher,
    KeyboardPeripheral
} from "@readium/navigator-html-injectables";

export const NAVIGATOR_KEYBOARD_PERIPHERAL_EVENT = "readium:navigator:keyboardPeripheral";

export interface KeyboardPeripheralOptions {
    /** Array of keyboard peripherals to configure */
    keyboardPeripherals?: KeyboardPeripheral[];
}

export class KeyboardPeripherals {
    private keydownHandler?: (event: KeyboardEvent) => void;
    private keyManager = new KeyCombinationManager();

    constructor(options: KeyboardPeripheralOptions = {}) {
        this.setupKeyboardPeripherals(options.keyboardPeripherals || []);
    }
    
    private setupKeyboardPeripherals(keyboardPeripherals: KeyboardPeripheral[]) {
        if (keyboardPeripherals.length > 0) {
            // Create activity event dispatcher
            const dispatcher: ActivityEventDispatcher = (activityEvent) => {
                const customEvent = new CustomEvent(NAVIGATOR_KEYBOARD_PERIPHERAL_EVENT, {
                    detail: activityEvent
                });
                window.dispatchEvent(customEvent);
            };
            
            // Create unified handler using the provided keyboard peripherals
            this.keydownHandler = this.keyManager.createUnifiedHandler(
                "", // Empty string as target frame source for main window
                keyboardPeripherals, 
                dispatcher
            );
            
            if (this.keydownHandler) {
                document.addEventListener("keydown", this.keydownHandler, true);
            }
        }
        
        window.addEventListener("unload", () => this.destroy());
    }
    
    public destroy() {
        if (this.keydownHandler) {
            document.removeEventListener("keydown", this.keydownHandler, true);
            this.keydownHandler = undefined;
        }
    }
}
