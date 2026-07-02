# Customizing Listeners

`EpubNavigatorListeners` allows you to bind callbacks for events happening inside the `EpubNavigator`.

The following events are exposed:
- `frameLoaded`: fires after the iframe containing the EPUB contents has been loaded
- `positionChanged`: fires when the current location has changed
- `tap`: fires when a tap has not been handled by default
- `click`: fires when a click has not been handled
- `zoom`: fires when the user has zoomed into the iframe
- `scroll`: fires when the user has scrolled into the iframe
- `miscPointer`: fires when a tap or a click was made in the middle of the iframe e.g. show/hide UI
- `customEvent`: fires when the EpubNavigator doesn’t handle the event by default
- `handleLocator`: fires when a link has been tapped or clicked
- `textSelected`: fires when text was selected inside the iframe
- `contentProtection`: fires when the content protection is triggered
- `contextMenu`: fires when the context menu is triggered (must be disabled in the `contentProtection` configuration, see [Content Protection](./ContentProtection.md) for more information)
- `peripheral`: fires when a configured keyboard shortcut is triggered – or it is implicitly set through `contentProtection` for the built-in types.

Your listeners object should look like this if you do not customize them at all.

```js
const listeners: EpubNavigatorListeners = {
  frameLoaded: function (_wnd: Window): void {},
  positionChanged: function (_locator: Locator): void {},
  tap: function (_e: FrameClickEvent): boolean {
    return false;
  },
  click: function (_e: FrameClickEvent): boolean {
    return false;
  },
  zoom: function (_scale: number): void {},
  scroll: function (_delta: number): void {},
  miscPointer: function (_amount: number): void {},
  customEvent: function (_key: string, _data: unknown): void {},
  handleLocator: function (locator: Locator): boolean {
    return false;
  },
  textSelected: function (_selection: BasicTextSelection): void {},
  contentProtection: function (_event: ContentProtectionEvent): void {},
  contextMenu: function (_event: ContextMenuEvent): void {},
  peripheral: function (_event: KeyboardPeripheralEvent): void {},
};
```

## Listeners

### Frame Loaded

Fires when the iframe containing the EPUB contents has been loaded, is ready to be interacted with, and is visible.

The iframes are kept in a pool and are disposed of and added dynamically. This means the event won’t fire if the iframe is still in the pool and you navigate back to it – it was not disposed of, but simply hidden, so it can’t be loaded. 

Consequently, you should not rely on this event to update the frames setup.

### Position Changed

Fires when the current location has changed.

This can be useful if you want to keep track of the progression throughout a publication.

### Tap & Click

Fires when a tap or click has not been handled by default. `EpubNavigator` indeeds intercept these events to check for link anchors (`a`), and either navigate to them (within the publication) or call the `handleLocator` event (external link).

Then, `EpubNavigator` has this logic implemented:

- if the left quarter of the screen is clicked, it goes left
- if the center half of the screen is clicked, it fires `miscPointer` e.g. you can use this to show/hide the app UI.
- if the right quarter of the screen is clicked, it goes right

You can disable this second part using `return true` in `tap` and `click` listeners.

```js
const handleTapClick = (event) => {
  // Your own implementation
}

const listeners: EpubNavigatorListeners = {
  ...
  tap: function (_e: FrameClickEvent): boolean {
    handleTapClick(_e);
    return true;
  },
  click: function (_e: FrameClickEvent): boolean {
    handleTapClick(_e);
    return true;
  },
  ...
};
```

### Zoom

Fires when the user has zoomed in a Fixed-Layout publication.

### Scroll

Fires when the user has scrolled in a Fixed-Layout publication. The `delta` is the number of pixels scrolled.

### miscPointer

Fires when a tap or a click was made in the middle of the iframe e.g. it can be used to show/hide UI.

### customEvent

Fires when a custom event has been triggered from the publication.

### handleLocator

Fires when an external link has been tapped or clicked.

### textSelected

Fires when text has been selected inside the iframe.

```ts
interface BasicTextSelection {
    text: string;           // The selected text
    x: number;             // X coordinate of the selection's bounding rect
    y: number;             // Y coordinate of the selection's bounding rect
    width: number;         // Width of the selection's bounding rect
    height: number;        // Height of the selection's bounding rect
    targetFrameSrc: string; // URL of the iframe where the selection occurred
    locator?: Locator;     // Ready-to-use locator with href, type, and text.highlight set — pass directly to applyDecorations
}
```

The locator has `href`, `type`, and `text.highlight` pre-filled. In Fixed-Layout spread mode it is also the only reliable way to determine which reading order item the selection belongs to — `currentLocator` always points to the first page of the spread.

### contentProtection

Fires when the content protection is triggered. See [Content Protection](./ContentProtection.md) for more information.

### contextMenu

Fires when the context menu is triggered. 

> [!WARNING] 
> Will not fire if the context menu is not disabled from the `contentProtection` configuration. See [Content Protection](./ContentProtection.md) for more information.

### peripheral

Fires when a configured keyboard shortcut is triggered within the EPUB content. This event allows you to intercept and handle custom keyboard combinations that you define through the keyboard peripherals system.

The event provides detailed information about the keyboard interaction:

```ts
interface KeyboardPeripheralEventData {
    type: string;           // The type of peripheral (e.g., "developer_tools", "select_all", "print", "save")
    timestamp: number;      // When the event occurred
    targetFrameSrc: string; // The source of the frame where the event originated
    selectedText?: {        // The selected text when the event occurred
        text: string;
        x: number;
        y: number;
        width: number;
        height: number;
    };
    interactiveElement?: Element; // The interactive element (if any) that is currently focused
    key: string;            // The key that was pressed
    code: string;           // The physical key code
    keyCode: number;        // The numeric key code
    ctrlKey: boolean;       // Whether Ctrl key was pressed
    altKey: boolean;        // Whether Alt key was pressed
    shiftKey: boolean;      // Whether Shift key was pressed
    metaKey: boolean;       // Whether Meta/Cmd key was pressed
}
```

The following built-ins are implicitly/automatically set when their associated `contentProtection` option is enabled:

- `"developer_tools"` - Developer tools shortcuts (F12, Cmd+Alt+I, etc.)
- `"select_all"` - Select all shortcuts (Cmd+A, Ctrl+A)
- `"print"` - Print shortcuts (Cmd+P, Ctrl+P)
- `"save"` - Save shortcuts (Cmd+S, Ctrl+S)

See [Content Protection](./ContentProtection.md#side-effects) for more information.