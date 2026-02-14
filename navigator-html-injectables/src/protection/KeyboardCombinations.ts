export type KeyboardShortcut = "devTools" | "selectAll" | "print" | "save" | KeyCombo;

export interface KeyCombo {
    keyCode: number;  // Use stable keyCode that doesn't change across layouts
    ctrl?: boolean;
    shift?: boolean;
    alt?: boolean;
    meta?: boolean;
    type?: string;  // Custom type for the suspicious activity event
}

// Developer tools shortcuts (using stable keyCode)
export const DEV_TOOLS_COMBOS: KeyCombo[] = [
    { keyCode: 73, meta: true, alt: true },    // I key
    { keyCode: 74, meta: true, alt: true },    // J key
    { keyCode: 85, meta: true, alt: true },    // U key
    { keyCode: 67, meta: true, alt: true },    // C key
    { keyCode: 67, meta: true, shift: true },  // C key (Cmd+Shift+C)
    { keyCode: 67, ctrl: true, shift: true },  // C key (Ctrl+Shift+C)
    { keyCode: 123 },                          // F12
    { keyCode: 123, shift: true },             // F12+Shift
    { keyCode: 123, ctrl: true, shift: true }, // F12+Ctrl+Shift
    { keyCode: 123, meta: true, alt: true },   // F12+Meta+Alt
];

// Select all shortcuts (using stable keyCode)
export const SELECT_ALL_COMBOS: KeyCombo[] = [
    { keyCode: 65, meta: true },    // A key (Cmd+A)
    { keyCode: 65, ctrl: true }     // A key (Ctrl+A)
];

// Print shortcuts (using stable keyCode)
export const PRINT_COMBOS: KeyCombo[] = [
    { keyCode: 80, meta: true },                    // P key (Cmd+P)
    { keyCode: 80, ctrl: true },                    // P key (Ctrl+P)
    { keyCode: 80, meta: true, shift: true },       // P key (Cmd+Shift+P)
    { keyCode: 80, ctrl: true, shift: true },       // P key (Ctrl+Shift+P)
    { keyCode: 80, meta: true, alt: true },         // P key (Cmd+Alt+P)
    { keyCode: 80, ctrl: true, alt: true }          // P key (Ctrl+Alt+P)
];

// Save shortcuts (using stable keyCode)
export const SAVE_COMBOS: KeyCombo[] = [
    { keyCode: 83, meta: true },    // S key (Cmd+S)
    { keyCode: 83, ctrl: true }     // S key (Ctrl+S)
];
