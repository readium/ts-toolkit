# DivinaNavigator

`DivinaNavigator` renders Divina publications (comics, manga, webtoons). It follows the [Readium Architecture](https://readium.org/architecture/) and implements `VisualNavigator` and `Configurable` interfaces.

Pages are bitmap images displayed directly in the container, without iframes, in one of two modes:

- **Paged**: horizontal pages, with optional two-page spreads (comics, manga).
- **Scrolled**: a continuous vertical strip (webtoons).

Publications declaring `layout: scrolled` are always displayed in scrolled mode. Other publications are paged by default, and can be switched to scrolled mode with the `scrolled` preference.

## Instantiation, Loading, and Destruction

`DivinaNavigator` won’t load anything on instantiation. You have to call method `load` to display the publication and navigate through it.

### Instantiate

The constructor expects the following arguments:

- `container`: The `HTMLElement` that will contain the pages.
- `publication`: The Divina `Publication` object.
- `listeners`: An object that contains event listeners. See [Listeners](#listeners).
- `positions`: An array of `Locator` objects that represent the positions in the publication.
- `initialPosition`: A `Locator` object that represents the initial position in the publication.
- `configuration`: An object that contains configuration options.

```js
const navigator = new DivinaNavigator(
  container,
  publication,
  listeners,
  positions,
  initialPosition,
  configuration
);
```

To create an instance of `DivinaNavigator`, you only need a container element, a `Publication`, and listeners. All other arguments are optional.

To create a `Publication` object, please refer to the [Handling Publications](../HandlingPublications.md) document.

In the absence of a `positions` argument, `DivinaNavigator` will attempt to fetch the `PositionsList` from the publication. If it does not exist, it creates one position per page of the reading order.

The `initialPosition` is the position at which the `DivinaNavigator` will `load` the publication. Its `href` can be omitted: the navigator then uses `locations.position` or, failing that, `locations.totalProgression` to find the page. This is useful for progressions that only carry a total progression, such as OPDS progressions.

### Load

Once the `DivinaNavigator` instance is created, you can load the publication by calling the async `load` method.

```js
navigator.load().then(() => {
  console.log('Publication loaded');
});
```

### Destroy

To destroy the `DivinaNavigator` instance, call the async `destroy` method. It also removes the pages from the container.

```js
navigator.destroy().then(() => {
  console.log('Instance destroyed');
});
```

### Properties

- `publication`: The publication (`Publication`) rendered by this navigator.
- `currentLocator`: The current position (`Locator`) in the publication. Can be used to save a bookmark to the current position.
- `readingProgression`: The reading progression direction (`ReadingProgression`) of the publication.
- `layout`: `Layout.scrolled` in scrolled mode, `Layout.fixed` in paged mode.
- `viewport`: Information about what is visible in the current viewport (`Viewport`).
- `timeline`: The `Timeline` for the publication.

## Configuration

`DivinaNavigator` accepts the following options in its `configuration` argument:

1. **Preferences** - `preferences` and `defaults`, see [Configuring the DivinaNavigator](./ConfiguringDivinaNavigator.md)
2. **Content Protection** - `contentProtection`, see [Content Protection](#content-protection)
3. **Keyboard Peripherals** - `keyboardPeripherals`, see [Keyboard Peripherals](#keyboard-peripherals)

### Preferences API

- `submitPreferences(preferences)`: Submit a set of preferences.
- `settings`: Get the current settings.
- `preferencesEditor`: Get the preferences editor.

See [Configuring the DivinaNavigator](./ConfiguringDivinaNavigator.md) for more information.

### Content Protection

`contentProtection` uses the same configuration as the `EpubNavigator`, see [Content Protection](../epub/ContentProtection.md). The following options are supported:

- `disableContextMenu`
- `checkAutomation`
- `checkIFrameEmbedding`
- `monitorDevTools`
- `protectPrinting`
- `disableDragAndDrop`
- `protectCopy`

Since the pages are not in iframes, drag-and-drop and copy protection apply to the host page.

Events are reported through the `contentProtection` and `contextMenu` listeners.

### Keyboard Peripherals

`keyboardPeripherals` uses the same configuration as the `EpubNavigator`, see [Keyboard Peripherals](../epub/KeyboardPeripherals.md). Events are reported through the `peripheral` listener.

`DivinaNavigator` has no built-in keyboard navigation: map keys to navigation methods in your `peripheral` listener.

## Listeners

All listeners are optional.

- `positionChanged(locator)`: The current position changed.
- `timelineItemChanged(item)`: The current timeline item changed.
- `tap(event)` / `click(event)`: The user tapped or clicked the content. Return `true` to prevent the default handling (see [Pointer navigation](#pointer-navigation)).
- `miscPointer(amount)`: The user tapped or clicked the middle of the content, e.g. to toggle your UI.
- `zoom(scale)`: The zoom level changed (paged mode).
- `scroll(delta)`: The content was scrolled (scrolled mode).
- `handleLocator(locator)`: `go` was called with a locator that isn’t in the reading order. Return `true` if you handled it.
- `contentProtection(type, data)` / `contextMenu(data)`: See [Content Protection](#content-protection).
- `peripheral(data)`: See [Keyboard Peripherals](#keyboard-peripherals).
- `customEvent(key, data)`: Reserved for custom events.

## Navigation

`DivinaNavigator` implements the `VisualNavigator` navigation methods:

- `go(locator: Locator, animated: boolean, cb: callback)`: Moves to the page corresponding to the given Locator.
- `goLink(link: Link, animated: boolean, cb: callback)`: Moves to the page targeted by the given Link.
- `goForward(animated: boolean, cb: callback)`: Moves to the next spread (paged) or scrolls forward by 80% of the viewport height (scrolled).
- `goBackward(animated: boolean, cb: callback)`: Moves to the previous spread (paged) or scrolls backward by 80% of the viewport height (scrolled).
- `goLeft(animated: boolean, cb: callback)`: Moves to the left, relative to the reading progression direction.
- `goRight(animated: boolean, cb: callback)`: Moves to the right, relative to the reading progression direction.

It also provides:

- `scrollBy(px: number, animated: boolean, cb: callback)`: Scrolls by a number of pixels in scrolled mode, e.g. for arrow keys. In paged mode, it moves one spread forward or backward depending on the sign of `px`.

```js
navigator.go(locator, true, (ok) => {
  console.log('Navigated', ok);
});

navigator.scrollBy(100, true, () => {});
```

### Pointer navigation

Unless the `tap` or `click` listener returns `true`:

- In paged mode, tapping the left or right quarter of the content moves left or right, and the middle calls `miscPointer`.
- In scrolled mode, tapping the top or bottom quarter of the content moves backward or forward, and the middle calls `miscPointer`.

In paged mode, the mouse wheel turns pages, and pages can be zoomed with pinch, ctrl + wheel and double-click. The following methods control zoom:

- `zoomIn()`
- `zoomOut()`
- `zoomReset()`

## Helpers

- `canGoForward`: Returns `true` if the navigator can go forward in the publication.
- `canGoBackward`: Returns `true` if the navigator can go backward in the publication.
- `isScrollStart`: Returns `true` if the navigator is at the start of the pages in the viewport.
- `isScrollEnd`: Returns `true` if the navigator is at the end of the pages in the viewport.
