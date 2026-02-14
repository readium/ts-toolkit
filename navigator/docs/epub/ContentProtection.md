# Content Protection

This is not a complete protection system, but rather a set of tools to help protect content from unauthorized use.

If you are looking for a complete protection system, you should have server-side authentication, content encryption, and proper access controls in place.

The content protection system provides client-side features to deter casual content extraction and make automated scraping more difficult. Note that these are not security measures and can be bypassed by determined users. For actual content protection, implement proper server-side authentication and authorization.

## Core Features

```typescript
interface ContentProtectionConfig {
    // Monitor text selection for suspicious patterns (e.g., automated scraping)
    // - boolean: true to enable with default settings, false to disable
    // - object: Fine-grained control over selection monitoring
    monitorSelection?: boolean | {
        // Maximum number of selections per second to detect automation
        // Default: 500
        maxSelectionsPerSecond?: number;
        
        // Minimum variance in selection patterns (lower values indicate more consistent patterns)
        // Default: 50
        minVariance?: number;
        
        // Number of recent selections to keep in history for pattern analysis
        // Default: 20
        historySize?: number;
    };
    
    // Configure copy protection
    // - boolean: true to enable with default settings, false to disable
    // - object: Fine-grained control over copy protection
    protectCopy?: boolean | {
        // Maximum percentage of content that can be selected (0-1)
        // Default: 0.1 (10%)
        maxSelectionPercent?: number;
        
        // Minimum number of characters that can be selected before protection kicks in
        // This prevents false positives on small selections
        // Default: 100
        minThreshold?: number;
        
        // Absolute maximum number of characters that can be copied in total
        // Default: 5000
        absoluteMaxChars?: number;
        
        // Number of recent copy attempts to keep in history for pattern analysis
        // Used to detect bulk copy patterns
        // Default: 20
        historySize?: number;
    };
    
    // Disable right-click context menu
    // Default: false
    disableContextMenu?: boolean;
    
    // Disable drag and drop functionality
    // Prevents dragging content out of the reader
    // Default: false
    disableDragAndDrop?: boolean;
    
    // Disable specific keyboard shortcuts
    disableKeyboardShortcuts?: Array<
        "devTools" |    // F12, Cmd+Option+I, etc.
        "selectAll" |   // Cmd+A/Ctrl+A
        "print" |       // Cmd+P/Ctrl+P
        "save" |        // Cmd+S/Ctrl+S
        KeyCombo       // Custom key combination
    >;
    
    // Print protection configuration
    protectPrinting?: {
        // Disable printing completely
        // Default: false
        disable?: boolean;
        
        // Optional watermark text to show when printing is disabled
        // Default: "Printing has been disabled"
        watermark?: string;
    };
    
    // Enable automation detection (e.g., Selenium, Puppeteer)
    // Triggers "automation_detected" event when automation tools are detected
    // Default: false
    checkAutomation?: boolean;
    
    // Check for embedding in iframes
    // Triggers "iframe_embedding_detected" event when embedding is detected
    // Default: false
    checkIFrameEmbedding?: boolean;
}

// Custom key combination for keyboard shortcuts
interface KeyCombo {
    // Numeric key code that doesn't change across keyboard layouts
    // Common key codes:
    // - 65: "A" key
    // - 73: "I" key (used for dev tools)
    // - 80: "P" key (used for print)
    // - 123: F12 key
    // See full list: https://keycode.info/
    keyCode: number;
    
    // Modifier keys (all optional)
    ctrl?: boolean;   // Control key (⌃)
    shift?: boolean;  // Shift key (⇧)
    alt?: boolean;    // Alt/Option key (⌥)
    meta?: boolean;   // Command key (⌘) on Mac, Windows key on Windows
    
    // Optional type for custom handling
    // Will be included in the protection event
    type?: string;
}
```

## Protection Features

### 1. Selection Monitoring
- **Pattern Analysis**: Detects unusual text selection patterns
  - Only analyzes significant selections
  - Triggers `suspicious_selection` event when automation is detected
 
### 2. Copy Protection
- **Bulk Copy Monitoring**: Tracks copy operations
  - Prevents excessive copying
  - Triggers `bulk_copy` event for suspicious activity

### 3. Context Menu
- Disables right-click context menu to prevent easy access to developer tools
- Configurable via `disableContextMenu`

### 4. Drag and Drop
- Prevents dragging content out of the reader
- Configurable via `disableDragAndDrop`

### 5. Keyboard Shortcut
- Blocks common developer tools shortcuts (F12, Cmd+Option+I, etc.)
- Blocks text selection (Cmd+A/Ctrl+A)
- Blocks printing shortcuts (Cmd+P/Ctrl+P)
- Blocks save shortcuts (Cmd+S/Ctrl+S)
- Supports custom key combinations using `KeyCombo` interface
- Configurable via `disableKeyboardShortcuts`

### 6. Print
- Blocks print keyboard shortcuts (Cmd+P/Ctrl+P)
- If print attempt is successful, replaces the content with a watermark

### 7. Automation
- Detects common automation tools like Selenium and Puppeteer
- Triggers the `contentProtection` event with type `automation_detected` when detected
- Enabled via `checkAutomation`

### 8. IFrame Embedding
- Detects when content is embedded in iframes
- Can detect cross-origin iframe embedding
- Triggers `contentProtection` event with type `iframe_embedding_detected` when detected
- Enabled via `checkIFrameEmbedding`

## Event Types

Content protection triggers events with the following types:

- `automation_detected`: When browser automation tools are detected
- `iframe_embedding_detected`: When content is embedded in an iframe
- `developer_tools`: When opening developer tools is attempted
- `select_all`: When select-all is attempted
- `suspicious_selection`: When suspicious text selection patterns are detected
- `bulk_copy`: When bulk copying is detected
- `drag_detected`: When content is dragged
- `drop_detected`: When content is dropped
- `print`: When printing is attempted
- `save`: When save is attempted
- `context_menu`: When opening context menu is attempted
- `blocked_keyboard_shortcut`: When a blocked keyboard shortcut is used
- `custom:*`: Custom shortcut types (prefixed with `custom:`)

### Example Configuration

```typescript
const navigator = new EpubNavigator(container, publication, listeners, {
    contentProtection: {
        // Basic protection
        disableContextMenu: true,
        disableDragAndDrop: true,
        
        // Keyboard shortcuts to disable
        disableKeyboardShortcuts: [
            "devTools",   // Disable F12, Cmd+Option+I, etc.
            "selectAll",  // Disable Cmd+A/Ctrl+A
            "save",       // Disable Cmd+S/Ctrl+S
            "print",      // Disable Cmd+P/Ctrl+P
        ],
        
        // Print protection
        protectPrinting: {
            disable: true,
            watermark: "Printing disabled"
        },
        
        // Advanced protection
        monitorSelection: {
            maxSelectionsPerSecond: 400,  // More sensitive to fast selections
            minVariance: 30,             // Lower threshold for more aggressive detection
            historySize: 30              // Larger history for better pattern detection
        },
        protectCopy: {
            maxSelectionPercent: 0.7,
            minThreshold: 100,
            absoluteMaxChars: 50000,
            historySize: 30
        },
        
        // Security features
        checkAutomation: true,
        checkIFrameEmbedding: true
    }
});
```

## Event Handling

The content protection system emits events for various protection-related activities. You can listen for these events through the `contentProtection` event handler:

```typescript
navigator.listeners.contentProtection = (type: string, detail: any) => {
    console.log(`[Content Protection] ${type}`, detail);
    
    switch (type) {
        // Automation detection
        case "automation_detected":
            // Fired when an automation tool is detected
            // detail: { tool: string, timestamp: number }
            console.log("Automation tool detected:", detail.tool);
            break;
            
        // IFrame embedding
        case "iframe_embedding_detected":
            // Fired when content is embedded in an iframe
            // detail: { isCrossOrigin: boolean, timestamp: number }
            console.log("Embedding detected in iframe");
            break;
            
        // Context menu
        case "context_menu":
            // Fired when context menu is accessed
            // detail: { button: number, buttons: number, clientX: number, clientY: number, timestamp: number }
            console.log("Context menu accessed at:", detail.clientX, detail.clientY);
            break;
            
        // Drag and drop
        case "drag_detected":
            // Fired when content is dragged
            // detail: { dataTransferTypes: string[], timestamp: number }
            console.log("Drag detected with types:", detail.dataTransferTypes);
            break;
            
        case "drop_detected":
            // Fired when content is dropped
            // detail: { dataTransferTypes: string[], fileCount: number, timestamp: number }
            console.log("Drop detected with", detail.fileCount, "files");
            break;
            
        // Bulk copy protection
        case "bulk_copy":
            // Fired when bulk copy is detected and prevented
            // detail: { 
            //   clipboardTypes: string[], 
            //   selectedText?: string,
            //   selectionLength?: number,
            //   timestamp: number 
            // }
            console.log("Bulk copy prevented. Selection length:", detail.selectionLength);
            break;
            
        // Suspicious selection patterns
        case "suspicious_selection":
            // Fired when suspicious selection pattern is detected
            // detail: {
            //   selectionLength: number,
            //   selectedText?: string,
            //   eventType: string,
            //   timestamp: number
            // }
            console.log("Suspicious selection detected:", detail.selectionLength, "characters");
            break;
            
        // Keyboard shortcuts
        case "blocked_keyboard_shortcut":
            // Fired when a protected keyboard shortcut is used
            // detail: {
            //   key: string,      // The key value of the key pressed
            //   code: string,     // Physical key code
            //   keyCode: number,  // Legacy key code
            //   ctrlKey: boolean, // Whether Ctrl key was pressed
            //   altKey: boolean,  // Whether Alt/Option key was pressed
            //   shiftKey: boolean,// Whether Shift key was pressed
            //   metaKey: boolean, // Whether Meta/Command key was pressed
            //   type?: string,    // Custom type if specified in key combo
            //   timestamp: number // When the event occurred
            // }
            const keys = [
                detail.ctrlKey ? "Ctrl" : "",
                detail.altKey ? "Alt" : "",
                detail.shiftKey ? "Shift" : "",
                detail.metaKey ? (navigator.platform.includes("Mac") ? "Cmd" : "Win") : "",
                detail.key
            ].filter(Boolean).join("+");
            console.log("Blocked keyboard shortcut:", keys);
            break;
            
        // Print protection
        case "print":
            // Fired when print keyboard shortcuts are detected (e.g., Cmd+P/Ctrl+P)
            // detail: {
            //   timestamp: number,
            //   key: string,
            //   keyCode: number,
            //   code: string,
            //   ctrlKey: boolean,
            //   metaKey: boolean,
            //   shiftKey: boolean,
            //   altKey: boolean
            // }
            console.log("Print attempt detected:", detail);
            break;
            
        // Save protection
        case "save":
            // Fired when save is attempted (Cmd+S/Ctrl+S)
            // detail: {
            //   key: string,      // The key value of the key pressed
            //   code: string,     // Physical key code
            //   keyCode: number,  // Legacy key code
            //   ctrlKey: boolean, // Whether Ctrl key was pressed
            //   altKey: boolean,  // Whether Alt/Option key was pressed
            //   shiftKey: boolean,// Whether Shift key was pressed
            //   metaKey: boolean, // Whether Meta/Command key was pressed
            //   timestamp: number // When the event occurred
            // }
            console.log("Save attempt detected", detail);
            break;
    }
};
```
The idea is that you can add extra layers of protection to your content by responding to these events if you deem it necessary. 

```typescript
// Example of responding to protection events
navigator.listeners.contentProtection = (type, detail) => {
    switch (type) {
        case "bulk_copy":
            if (detail.selectionLength > 1000) {
                // Show a warning to the user
                showWarning("Copying large portions of content is not allowed.");
            }
            break;
            
        case "suspicious_selection":
            // Log potential scraping attempts
            logSuspiciousActivity({
                type: "suspicious_selection",
                length: detail.selectionLength,
                timestamp: new Date().toISOString()
            });
            break;
            
        case "automation_detected":
            // Notify server about automation tool detection
            reportAutomationAttempt(detail.tool);
            break;
    }
};
```

## Limitations

1. Client-side protection can be bypassed by determined attackers
2. Should be used in conjunction with server-side protection
3. Some protection features may affect user experience and accessibility