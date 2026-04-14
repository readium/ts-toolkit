# EpubNavigator

`EpubNavigator` follows the [Readium Architecture](https://readium.org/architecture/) and implements `VisualNavigator` and `Configurable` interfaces.

## Instantiation, Loading, and Destruction

`EpubNavigator` won’t load anything on instantiation. You have to call method `load` to display the publication and navigate through it.

### Instantiate

To use the `EpubNavigator`, you must first instantiate it by calling its constructor and passing in the required arguments. The constructor expects the following arguments:

- `container`: The `HTMLElement` that will contain the EPUB publication.
- `publication`: The EPUB `Publication` object.
- `listeners`: An object that contains event listeners for the EPUB publication.
- `positions`: An array of `Locator` objects that represent the positions in the publication.
- `initialPosition`: A `Locator` object that represents the initial position in the publication.
- `configuration`: An object that contains configuration options for the publications.

```js
const navigator = new EpubNavigator(
  container,
  publication,
  listeners,
  positions,
  initialPosition,
  configuration
);
```

To create an instance of `EpubNavigator`, you only need a container element, a `Publication`, and listeners. All other arguments are optional.

To create a `Publication` object, please refer to the [Handling Publications](../HandlingPublications.md) document.

To customize listeners, please refer to the [Customizing Listeners](./CustomizingListeners.md) document.

In the absence of a `positions` argument, `EpubNavigator` will attempt to fetch the `PositionsList` from the EPUB publication. If it does not exist, it will not operate. You can also provide it following the instructions in [Handling Publications > Fetching the Positions List](../HandlingPublications.md#Fetching-the-positions-list).

The `initialPosition` is the position at which the `EpubNavigator` will `load` the EPUB publication. It has to be a `Locator`.

## Configuration

`EpubNavigator` provides several configuration options that can be passed through the `configuration` parameter. These options are organized into different categories, each with its own documentation:

1. **Preferences Configuration** - For settings and preferences, see [Configuring the EpubNavigator](./ConfiguringEpubNavigator.md)
2. **Content Protection** - For security and protection features, see [Content Protection](./ContentProtection.md)
3. **Resource Injection** - For injecting custom resources into publications, see [Resource Injection](./ResourceInjection.md)
4. **Keyboard Peripherals** - For custom keyboard shortcuts, see [Keyboard Peripherals](./KeyboardPeripherals.md)

Each of these configuration aspects can be combined in the `configuration` object when creating a new `EpubNavigator` instance.

### Load

Once the `EpubNavigator` instance is created, you can load the EPUB publication by calling the async `load` method. This method takes no arguments and returns a promise that resolves when the publication is loaded.

```js
navigator.load().then(() => {
  console.log('Publication loaded');
});
```

### Destroy

To destroy the `EpubNavigator` instance, you can call the async `destroy` method. This method takes no arguments and returns a promise that resolves when the instance is destroyed.

```js
navigator.destroy().then(() => {
  console.log('Instance destroyed');
});
```

### Properties

Additionally, the `EpubNavigator` class provides the following properties:

- `publication`: The publication (`Publication`) rendered by this navigator.
- `currentLocator`: The current position (`Locator`) in the publication. Can be used to save a bookmark to the current position.
- `readingProgression`: The current reading progression direction (`ReadingProgression`).
- `viewport`: Information about what is visible into the current viewport (`Viewport`) i.e. the current resources, their progression, and the positions from the `PositionsList`. Can be used to update a progression affordance.

### Preferences API

The `EpubNavigator` class provides a Preferences API that allows you to apply styles to the publication. The Preferences API includes the following:

- `submitPreferences(preferences)`: Submit a set of preferences to the publication.
- `settings`: Get the current settings for the publication.
- `preferencesEditor`: Get the preferences editor for the publication.

See [Configuring the EpubNavigator](./ConfiguringEpubNavigator.md) for more information.

### Content Protection

The `EpubNavigator` class provides a Content Protection API that allows you to protect the publication from unauthorized access.

This can only be set during the creation of the `EpubNavigator` instance. It has its own dedicated listeners `contentProtection` and `contextMenu` to handle content protection events.

See [Content Protection](./ContentProtection.md) for more information.

### Resource Injection

The `EpubNavigator` class provides a Resource Injection API that allows you to inject custom resources into the publication.

The resources can only be set during the creation of the `EpubNavigator` instance.

See [Resource Injection](./ResourceInjection.md) for more information.

### Keyboard Peripherals

The `EpubNavigator` class provides a Keyboard Peripherals API that allows you to configure custom keyboard shortcuts. The Keyboard Peripherals API includes the following:

The keyboard shortcuts can only be set during the creation of the `EpubNavigator` instance and will prevent the default browser behavior. It has its own dedicated listener `peripheral` to handle keyboard events.

See [Keyboard Peripherals](./KeyboardPeripherals.md) for more information.

## Navigation

The `EpubNavigator` class exposes several methods for navigating the EPUB publication. These methods are defined in the `VisualNavigator` abstract class and include:

- `go(locator: Locator, animated: boolean, cb: callback)`: Moves to the position in the publication corresponding to the given Locator.
- `goLink(link: Link, animated: boolean, cb: callback)`: Moves to the position in the publication targeted by the given Link.
- `goForward(animated: boolean, cb: callback)`: Moves to the next content portion in the reading progression direction.
- `goBackward(animated: boolean, cb: callback)`: Moves to the previous content portion in the reading progression direction.
- `goLeft(animated: boolean, completion: callback)`: Moves to the left content portion relative to the reading progression direction.
- `goRight(animated: boolean, completion: callback)`: Moves to the right content portion relative to the reading progression direction.

```js
const locator = new Locator({ 
  href: 'epub/chapter-1.xhtml', 
  locations: { 
    position: 10, 
    progression: 0.1,
    totalProgression: 0.032
  } 
});
navigator.go(locator, true, () => {
  console.log('Navigated to Chapter 1 at position 10');
});

const link = new Link({ href: 'epub/chapter-2.xhtml' });
navigator.goLink(link, true, () => {
  console.log('Navigated to Chapter 2');
});

navigator.goForward(true, () => {
  console.log('Navigated forwards');
});

navigator.goBackward(true, () => {
  console.log('Navigated backwards');
});

navigator.goLeft(true, () => {
  console.log('Navigated to the left');
});

navigator.goRight(true, () => {
  console.log('Navigated to the right');
});
```

## Helpers

Finally, `EpubNavigator` provides a few helpers to help derive information about navigation:

- `canGoForward`: Returns `true` if the navigator can go forward in the publication.
- `canGoBackward`: Returns `true` if the navigator can go backward in the publication.
- `isScrollStart`: Returns `true` if the navigator is at the start of the resources in the viewport.
- `isScrollEnd`: Returns `true` if the navigator is at the end of the resources in the viewport.

These can come in handy if you want to disable navigation buttons when the user is at the start or end of the publication, or show the UI if the user is scrolling to the end of the resources in the viewport.