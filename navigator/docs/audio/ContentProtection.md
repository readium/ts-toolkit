# Content Protection

This is not a complete protection system, but rather a set of tools to help protect content from unauthorized use.

If you are looking for a complete protection system, you should have server-side authentication, content encryption, and proper access controls in place.

The content protection system provides client-side features to deter casual content extraction and make automated scraping more difficult. Note that these are not security measures and can be bypassed by determined users.

## Configuration

Pass a `contentProtection` object to the `AudioNavigator` constructor:

```typescript
const navigator = new AudioNavigator(publication, listeners, initialPosition, {
    preferences: {},
    defaults: {},
    contentProtection: {
        disableContextMenu: true,
        checkAutomation: true,
        monitorDevTools: true,
        protectPrinting: { disable: true },
        checkIFrameEmbedding: true,
        disableSave: true,
    }
});
```

## Available Options

```typescript
interface AudioContentProtectionConfig {
    // Disable right-click context menu
    // Default: false
    disableContextMenu?: boolean;

    // Disable drag and drop at the page level
    // Triggers "drag_detected" / "drop_detected" events
    // Default: false
    disableDragAndDrop?: boolean;

    // Block copy events (Ctrl+C / Cmd+C) at the page level
    // Triggers "bulk_copy" event when attempted
    // Default: false
    protectCopy?: boolean;

    // Print protection configuration
    protectPrinting?: {
        // Disable printing completely (blocks Ctrl+P / Cmd+P)
        // Default: false
        disable?: boolean;

        // Optional watermark text shown when printing is disabled
        // Default: "Printing has been disabled"
        watermark?: string;
    };

    // Disable Select All (Ctrl+A / Cmd+A) at the page level
    // Triggers "select_all" event through the peripheral listener
    // Default: false
    disableSelectAll?: boolean;

    // Disable Save functionality (Ctrl+S / Cmd+S)
    // Triggers "save" event through the peripheral listener
    // Default: false
    disableSave?: boolean;

    // Enable automation detection (e.g., Selenium, Puppeteer)
    // Triggers "automation_detected" event when detected
    // Default: false
    checkAutomation?: boolean;

    // Check for embedding in iframes
    // Triggers "iframe_embedding_detected" event when detected
    // Default: false
    checkIFrameEmbedding?: boolean;

    // Monitor dev tools
    // Triggers "developer_tools" event when dev tools are opened
    // Default: false
    monitorDevTools?: boolean;

    // Prevent the audio from being cast to remote devices (AirPlay, Chromecast, etc.)
    // via the Remote Playback API. Use for DRM-protected content.
    // Default: false
    disableRemotePlayback?: boolean;
}
```

> [!NOTE]
> Selection monitoring and scrolling monitoring are not available for `AudioNavigator` as they are specific to frame-based navigators.

## Protection Features

### 1. Context Menu
- Disables right-click context menu at the page level
- Configured via `disableContextMenu`

### 2. Drag and Drop
- Prevents dragging and dropping at the page level
- Triggers `contentProtection` with type `drag_detected` or `drop_detected`
- Configured via `disableDragAndDrop`

### 3. Copy Protection
- Blocks `copy` events (Ctrl+C / Cmd+C) at the page level
- Triggers `contentProtection` with type `bulk_copy`
- Configured via `protectCopy`

### 4. Print Protection
- Blocks print keyboard shortcuts (Ctrl+P / Cmd+P)
- Optionally replaces content with a watermark if printing occurs
- Configured via `protectPrinting`

### 5. Select All
- Blocks Ctrl+A / Cmd+A at the page level
- Triggers `peripheral` with type `select_all`
- Enabled via `disableSelectAll`

### 6. Automation Detection
- Detects common automation tools like Selenium and Puppeteer
- Triggers `contentProtection` with type `automation_detected`
- Enabled via `checkAutomation`

### 7. IFrame Embedding Detection
- Detects when the page is embedded in an iframe
- Triggers `contentProtection` with type `iframe_embedding_detected`
- Enabled via `checkIFrameEmbedding`

### 8. Developer Tools Monitoring
- Detects when browser developer tools are opened
- Triggers `contentProtection` with type `developer_tools`
- Enabled via `monitorDevTools`

### 9. Remote Playback
- Prevents the audio from being cast to AirPlay or Chromecast-enabled devices via the [Remote Playback API](https://developer.mozilla.org/en-US/docs/Web/API/Remote_Playback_API)
- No event is fired; the cast affordance is simply hidden by the browser
- Enabled via `disableRemotePlayback`
- See [Remote Playback](./RemotePlayback.md) for the full API

## Side effects

When setting some options, shortcuts will be prevented by default, and reported through the `peripheral` listener:

- `disableSelectAll`: Prevents common shortcuts (Ctrl+A / Cmd+A) and reports `select_all` through `peripheral`
- `disableSave`: Prevents common shortcuts (Ctrl+S / Cmd+S) and reports `save` through `peripheral`
- `monitorDevTools`: Prevents common shortcuts (Ctrl+Shift+I / Cmd+Option+I) and reports `developer_tools` through `peripheral`
- `protectPrinting.disable`: Prevents common shortcuts (Ctrl+P / Cmd+P) and reports `print` through `peripheral`

## Event Types

The `contentProtection` listener receives events with the following types:

- `automation_detected`: When browser automation tools are detected
- `iframe_embedding_detected`: When the page is embedded in an iframe
- `developer_tools`: When opening developer tools is attempted
- `drag_detected`: When a drag is initiated
- `drop_detected`: When a drop occurs
- `bulk_copy`: When a copy event is blocked

> [!NOTE]
> Context menu events are routed to the dedicated `contextMenu` listener, not to `contentProtection`.

## Event Handling

The content protection system emits events through the `contentProtection` listener. The handler receives two parameters:
1. `type`: The type of protection event (string)
2. `data`: The event data object (`SuspiciousActivityEvent`)

Context menu events are routed to the dedicated `contextMenu` listener.

```typescript
const listeners: AudioNavigatorListeners = {
    // ... other listeners

    contextMenu: (data: ContextMenuEvent) => {
        console.log("Context menu blocked at", data.clientX, data.clientY);
    },

    contentProtection: (type: string, data: SuspiciousActivityEvent) => {
        switch (type) {
            case "automation_detected":
                // data: { tool: string, timestamp: number }
                console.log("Automation tool detected:", data.tool);
                break;
            case "iframe_embedding_detected":
                // data: { isCrossOrigin: boolean, timestamp: number }
                console.log("Embedded in iframe, cross-origin:", data.isCrossOrigin);
                break;
            case "developer_tools":
                console.log("Developer tools access detected");
                break;
            case "drag_detected":
                // data: { dataTransferTypes: string[], targetFrameSrc: string }
                console.log("Drag blocked, types:", data.dataTransferTypes);
                break;
            case "drop_detected":
                // data: { dataTransferTypes: string[], fileCount: number, targetFrameSrc: string }
                console.log("Drop blocked, files:", data.fileCount);
                break;
            case "bulk_copy":
                console.log("Copy blocked");
                break;
        }
    },
};
```

## Limitations

1. Client-side protection can be bypassed by determined attackers
2. Should be used in conjunction with server-side protection
3. Some protection features may affect user experience and accessibility
