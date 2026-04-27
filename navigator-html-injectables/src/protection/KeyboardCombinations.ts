export interface KeyCombo {
    keyCode: number;  // Use stable keyCode that doesn't change across layouts
    ctrl?: boolean;
    shift?: boolean;
    alt?: boolean;
    meta?: boolean;
}

export interface KeyboardPeripheral {
    type: string;
    keyCombos: KeyCombo[];
}

// Developer tools shortcuts as KeyboardPeripheral
export const DEV_TOOLS: KeyboardPeripheral = {
    type: "developer_tools",
    keyCombos: [
        { keyCode: 73, meta: true, alt: true },              // Cmd+Option+I
        { keyCode: 73, ctrl: true, shift: true },            // Ctrl+Shift+I
        { keyCode: 74, meta: true, alt: true },              // Cmd+Option+J
        { keyCode: 74, ctrl: true, shift: true },            // Ctrl+Shift+J
        { keyCode: 85, meta: true, alt: true },              // Cmd+Option+U
        { keyCode: 67, meta: true, alt: true },              // Cmd+Option+C
        { keyCode: 67, meta: true, shift: true },            // Cmd+Shift+C
        { keyCode: 67, ctrl: true, shift: true },            // Ctrl+Shift+C
        { keyCode: 65, meta: true, alt: true },              // Cmd+Option+A
        { keyCode: 84, meta: true, shift: true, alt: true }, // Cmd+Shift+Option+T
        { keyCode: 67, shift: true, alt: true },             // Shift+Option+C
        { keyCode: 123 },                                    // F12
        { keyCode: 123, shift: true },                       // Shift+F12
        { keyCode: 123, ctrl: true, shift: true },           // Ctrl+Shift+F12
        { keyCode: 123, meta: true, alt: true },             // Cmd+Option+F12
    ]
};

// Select all shortcuts as KeyboardPeripheral
export const SELECT_ALL: KeyboardPeripheral = {
    type: "select_all",
    keyCombos: [
        { keyCode: 65, meta: true },    // Cmd+A
        { keyCode: 65, ctrl: true }     // Ctrl+A
    ]
};

// Print shortcuts as KeyboardPeripheral
export const PRINT: KeyboardPeripheral = {
    type: "print",
    keyCombos: [
        { keyCode: 80, meta: true },                    // Cmd+P
        { keyCode: 80, ctrl: true },                    // Ctrl+P
        { keyCode: 80, meta: true, shift: true },       // Cmd+Shift+P
        { keyCode: 80, ctrl: true, shift: true },       // Ctrl+Shift+P
        { keyCode: 80, meta: true, alt: true },         // Cmd+Alt+P
        { keyCode: 80, ctrl: true, alt: true }          // Ctrl+Alt+P
    ]
};

// Save shortcuts as KeyboardPeripheral
export const SAVE: KeyboardPeripheral = {
    type: "save",
    keyCombos: [
        { keyCode: 83, meta: true },    // Cmd+S
        { keyCode: 83, ctrl: true }     // Ctrl+S
    ]
};
