# Customizing Listeners

`EpubNavigatorListeners` allows you to bind callbacks for events happening inside the `EpubNavigator`.

The following events are exposed:
- `frameLoaded`: fires after the iframe containing the EPUB contents has been loaded
- `positionChanged`: fires when the current location has changed
- `tap`: fires when a tap has not been handled by default
- `click`: fires when a click has not been handled
- `zoom`: fires when the user has zoomed into the iframe
- `miscPointer`: fires when a tap or a click was made in the middle of the iframe e.g. show/hide UI
- `customEvent`: fires when the EpubNavigator doesn’t handle the event by default
- `handleLocator`: fires when a link has been tapped or clicked
- `textSelected`: fires when text was selected inside the iframe

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
  miscPointer: function (_amount: number): void {},
  customEvent: function (_key: string, _data: unknown): void {},
  handleLocator: function (locator: Locator): boolean {
    return false;
  },
  textSelected: function (_selection: BasicTextSelection): void {},
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

### miscPointer

Fires when a tap or a click was made in the middle of the iframe e.g. it can be used to show/hide UI.

### customEvent

Fires when the EpubNavigator doesn’t handle the event by default.

### handleLocator

Fires when an external link has been tapped or clicked.

### textSelected

Fires when text has been selected inside the iframe.