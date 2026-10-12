import {
    KeyCombinationManager,
    ActivityEventDispatcher,
    KeyboardPeripheral
} from "@readium/navigator-html-injectables";
import { KeyboardConditionBridge } from "./KeyboardConditionBridge.ts";

export const NAVIGATOR_KEYBOARD_PERIPHERAL_EVENT = "readium:navigator:keyboardPeripheral";

export interface KeyboardPeripheralOptions {
    /** Array of keyboard peripherals to configure */
    keyboardPeripherals?: KeyboardPeripheral[];
}

export class KeyboardPeripherals {
    private keydownHandler?: (event: KeyboardEvent) => void;
    private keyManager = new KeyCombinationManager();
    private readonly conditionBridge: KeyboardConditionBridge;
    // pagehide instead of unload: an unload listener disqualifies the page
    // from the back/forward cache; only tear down on real unloads.
    private readonly pagehideHandler = (e: PageTransitionEvent) => {
        if (!e.persisted) this.destroy();
    };

    private readonly dispatcher: ActivityEventDispatcher = (activityEvent) => {
        const customEvent = new CustomEvent(NAVIGATOR_KEYBOARD_PERIPHERAL_EVENT, {
            detail: activityEvent
        });
        window.dispatchEvent(customEvent);
    };

    constructor(options: KeyboardPeripheralOptions = {}) {
        this.conditionBridge = new KeyboardConditionBridge(
            options.keyboardPeripherals || [],
            (activePeripherals) => this.setupKeyboardPeripherals(activePeripherals)
        );
        this.conditionBridge.setup();
        window.addEventListener("pagehide", this.pagehideHandler);
    }

    private setupKeyboardPeripherals(keyboardPeripherals: KeyboardPeripheral[]) {
        this.removeKeydownHandler();
        if (keyboardPeripherals.length === 0) return;

        // Create unified handler using the provided keyboard peripherals
        this.keydownHandler = this.keyManager.createUnifiedHandler(
            "", // Empty string as target frame source for main window
            keyboardPeripherals,
            this.dispatcher
        );
        document.addEventListener("keydown", this.keydownHandler, true);
    }

    private removeKeydownHandler() {
        if (this.keydownHandler) {
            document.removeEventListener("keydown", this.keydownHandler, true);
            this.keydownHandler = undefined;
        }
    }

    public destroy() {
        this.conditionBridge.destroy();
        this.removeKeydownHandler();
        window.removeEventListener("pagehide", this.pagehideHandler);
    }
}
