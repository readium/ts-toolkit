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

    // Monitor dev tools
    // Triggers "developer_tools" event when dev tools are opened
    // Default: false
    monitorDevTools?: boolean;

    // Disable Select All functionality (Ctrl+A/Cmd+A)
    // Triggers "select_all" event when attempted
    // Default: false
    disableSelectAll?: boolean;

    // Disable Save functionality (Ctrl+S/Cmd+S)
    // Triggers "save" event when attempted
    // Default: false
    disableSave?: boolean;

    // Monitor scrolling behavior (Experimental)
    // Triggers "suspicious_scrolling" or "suspicious_snapping" event when scrolling is detected
    // Default: false
    monitorScrollingExperimental?: boolean;
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
- **Important**: this triggers its own listener when disabled. See [Customizing Listeners](./CustomizingListeners.md#contextMenu) for more information.

### 4. Drag and Drop
- Prevents dragging content out of the reader
- Configurable via `disableDragAndDrop`

### 5. Print
- Blocks print keyboard shortcuts (Cmd+P/Ctrl+P)
- If print attempt is successful, replaces the content with a watermark

### 6. Automation
- Detects common automation tools like Selenium and Puppeteer
- Triggers the `contentProtection` event with type `automation_detected` when detected
- Enabled via `checkAutomation`

### 7. IFrame Embedding
- Detects when content is embedded in iframes
- Can detect cross-origin iframe embedding
- Triggers `contentProtection` event with type `iframe_embedding_detected` when detected
- Enabled via `checkIFrameEmbedding`

### 8. Developer Tools Monitoring
- Detects when browser developer tools are opened
- Triggers the `contentProtection` event with type `developer_tools` when detected
- Enabled via `monitorDevTools`

### 9. Scrolling Monitoring (Experimental)
- This is experimental and should not be used as the only way to act on suspicious activity
- Detects unusual scrolling patterns
- Triggers `suspicious_scrolling` or `suspicious_snapping` events when detected
- Enabled via `monitorScrollingExperimental`

## Layering

Protection features should be thought as layers. If one feature fails, the next one comes into play. 

For example, if the print shortcut fails, print protection can be used to prevent the user from printing the content. If the automation detection fails, selection monitoring and bulk copy monitoring can be used to prevent the user from copying the content. Etc.

It is really important to understand how to combine these features to reinforce the entire protection system.

## Event Types

Content protection triggers events with the following types:

- `automation_detected`: When browser automation tools are detected
- `iframe_embedding_detected`: When content is embedded in an iframe
- `developer_tools`: When opening developer tools is attempted
- `suspicious_selection`: When suspicious text selection patterns are detected
- `bulk_copy`: When bulk copying is detected
- `drag_detected`: When content is dragged
- `drop_detected`: When content is dropped
- `suspicious_scrolling`: When suspicious scrolling patterns are detected
- `suspicious_snapping`: When suspicious snapping patterns are detected

### Example Configuration

```typescript
const navigator = new EpubNavigator(container, publication, listeners, {
    contentProtection: {
        // Basic protection
        disableContextMenu: true,
        disableDragAndDrop: true,
        
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
        checkIFrameEmbedding: true,
        monitorDevTools: true,
        disableSelectAll: true,
        disableSave: true,
        monitorScrollingExperimental: true
    }
});
```

## Side effects

When setting some options, shortcuts will be prevented by default, and reported through `eventListener.peripheral`. 

- `disableSelectAll`: Prevents common shortcuts (Ctrl+A/Cmd+A) and reports `select_all` through `peripheral` eventListener
- `disableSave`: Prevents common shortcuts (Ctrl+S/Cmd+S) and reports `save` through `peripheral` eventListener
- `monitorDevTools`: Prevents common shortcuts (Ctrl+Shift+I/Cmd+Option+I) and reports `devtools` through `peripheral` eventListener
- `protectPrinting.disabled`: Prevents common shortcuts (Ctrl+P/Cmd+P) and reports `print` through `peripheral` eventListener

## Event Handling

The content protection system emits events for various protection-related activities. You can listen for these events through the `contentProtection` event handler. The handler receives two parameters:
1. `type`: The type of protection event (string)
2. `data`: The event data object (SuspiciousActivityEvent)

```typescript
navigator.listeners.contentProtection = (type: string, data: SuspiciousActivityEvent) => {
    console.log(`[Content Protection] ${type}`, data);
    
    switch (type) {
        // Automation detection
        case "automation_detected":
            // Fired when an automation tool is detected
            // data: { 
            //   tool: string,
            //   timestamp: number
            // }
            console.log("Automation tool detected:", data.tool);
            break;
            
        // IFrame embedding
        case "iframe_embedding_detected":
            // Fired when content is embedded in an iframe
            // detail: {
            //   isCrossOrigin: boolean,
            //   timestamp: number
            // }
            console.log("Embedding detected in iframe");
            break;
            
        // Drag and drop
        case "drag_detected":
            // Fired when content is dragged
            // detail: { 
            //   dataTransferTypes: readonly string[], 
            //   timestamp: number,
            //   targetFrameSrc: string
            // }
            console.log("Drag detected with types:", detail.dataTransferTypes);
            break;
            
        case "drop_detected":
            // Fired when content is dropped
            // detail: { 
            //   dataTransferTypes: readonly string[], 
            //   fileCount: number, 
            //   timestamp: number,
            //   targetFrameSrc: string
            // }
            console.log("Drop detected with", detail.fileCount, "files");
            break;
            
        // Bulk copy protection
        case "bulk_copy":
            // Fired when bulk copy is detected and prevented
            // detail: { 
            //   clipboardTypes: readonly string[], 
            //   selectedText?: {
            //     text: string,
            //     x: number,
            //     y: number,
            //     width: number,
            //     height: number
            //   },
            //   selectionLength?: number,
            //   timestamp: number,
            //   targetFrameSrc: string
            // }
            console.log("Bulk copy prevented. Selection length:", detail.selectionLength);
            break;
            
        // Suspicious selection patterns
        case "suspicious_selection":
            // Fired when suspicious selection pattern is detected
            // detail: {
            //   selectionLength: number,
            //   selectedText: {
            //     text: string,
            //     x: number,
            //     y: number,
            //     width: number,
            //     height: number
            //   },
            //   eventType: string,
            //   timestamp: number,
            //   targetFrameSrc: string
            // }
            console.log("Suspicious selection detected:", detail.selectionLength, "characters");
            break;
            
        // Print protection
        case "print":
            // Fired when print keyboard shortcuts are detected (e.g., Cmd+P/Ctrl+P)
            // detail: {
            //   key: string,      // The key value of the key pressed
            //   code: string,     // Physical key code
            //   keyCode: number,  // Legacy key code
            //   ctrlKey: boolean, // Whether Ctrl key was pressed
            //   altKey: boolean,  // Whether Alt/Option key was pressed
            //   shiftKey: boolean,// Whether Shift key was pressed
            //   metaKey: boolean, // Whether Meta/Command key was pressed
            //   timestamp: number, // When the event occurred
            //   targetFrameSrc: string
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
            //   timestamp: number, // When the event occurred
            //   targetFrameSrc: string
            // }
            console.log("Save attempt detected", detail);
            break;

        // Developer tools detection
        case "developer_tools":
            // Fired when developer tools are opened (F12, Cmd+Option+I, etc.)
            // detail: {
            //   key: string,      // The key value of the key pressed
            //   code: string,     // Physical key code
            //   keyCode: number,  // Legacy key code
            //   ctrlKey: boolean, // Whether Ctrl key was pressed
            //   altKey: boolean,  // Whether Alt/Option key was pressed
            //   shiftKey: boolean,// Whether Shift key was pressed
            //   metaKey: boolean, // Whether Meta/Command key was pressed
            //   timestamp: number, // When the event occurred
            //   targetFrameSrc: string
            // }
            console.log("Developer tools access detected", detail);
            break;

        case "suspicious_scrolling":
            // Fired when suspicious scrolling patterns are detected
            // detail: {
            //   scrollDelta: number,
            //   scrollDirection: "up" | "down",
            //   timestamp: number,
            //   targetElement: { tagName: string } | null,
            //   targetFrameSrc: string
            // }
            console.log("Suspicious scrolling detected", detail);
            break;

        case "suspicious_snapping":
            // Fired when suspicious snapping patterns are detected
            // detail: {
            //   timestamp: number,
            //   event: null,
            //   targetFrameSrc: string
            // }
            console.log("Suspicious snapping detected", detail);
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