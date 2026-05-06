# AudioNavigator

`AudioNavigator` follows the [Readium Architecture](https://readium.org/architecture/) and implements `MediaNavigator` and `Configurable` interfaces.

## Instantiation and Destruction

`AudioNavigator` is ready to use immediately after instantiation. There is no separate `load()` method required - the navigator automatically initializes during construction.

### Instantiate

To use the `AudioNavigator`, you must first instantiate it by calling its constructor and passing in the required arguments. The constructor expects the following arguments:

- `publication`: The audio `Publication` object.
- `listeners`: An object that contains event listeners for the audio publication.
- `initialPosition`: A `Locator` object that represents the initial position in the publication (optional).
- `configuration`: An object that contains configuration options for the audio publication. This is relying on the Preferences API (optional). It also supports `contentProtection` and `keyboardPeripherals` options.

```js
const navigator = new AudioNavigator(
  publication,
  listeners,
  initialPosition,
  configuration
);
```

To create an instance of `AudioNavigator`, you only need a `Publication` and listeners. All other arguments are optional.

To create a `Publication` object, please refer to the [Handling Publications](../HandlingPublications.md) document.

To customize listeners, please refer to the [Customizing Audio Listeners](./CustomizingListeners.md) document.

The `initialPosition` is the position at which the `AudioNavigator` will start playback. It has to be a `Locator` with time-based locations.

Finally, `AudioNavigator` implements a `Configurable` interface, so that it can be configured dynamically through the `configuration` argument. Please refer to [Configuring the AudioNavigator](./ConfiguringAudioNavigator.md) for more information.

`AudioNavigator` also supports content protection and keyboard peripherals through the `configuration` argument:

- `contentProtection`: Configures navigator-level protection features (automation detection, dev tools monitoring, print protection, etc.). See [Content Protection](./ContentProtection.md).
- `keyboardPeripherals`: Configures custom keyboard shortcuts that are intercepted at the navigator level. See [Keyboard Peripherals](./KeyboardPeripherals.md).

### Destroy

To destroy the `AudioNavigator` instance, you can call the `destroy` method. This method takes no arguments and cleans up all resources.

```js
navigator.destroy();
console.log('Instance destroyed');
```

### Properties

Additionally, the `AudioNavigator` class provides the following properties:

- `publication`: The publication (`Publication`) rendered by this navigator.
- `currentLocator`: The current position (`Locator`) in the publication. Can be used to save a bookmark to the current position.
- `timeline`: The `Timeline` for the publication. See [Timeline](#timeline).
- `isPlaying`: Returns `true` if audio is currently playing.
- `isPaused`: Returns `true` if audio is currently paused.
- `duration`: Returns the duration of the current audio track in seconds.
- `currentTime`: Returns the current playback time in seconds.
- `remotePlayback`: The [`RemotePlayback`](https://developer.mozilla.org/en-US/docs/Web/API/RemotePlayback) object for the primary media element. Use it to prompt the device picker, watch device availability, and read the current connection state. See [Remote Playback](./RemotePlayback.md).

### Preferences API

The `AudioNavigator` class provides a Preferences API that allows you to configure audio playback. The Preferences API includes the following:

- `submitPreferences(preferences)`: Submit a set of preferences to the publication.
- `settings`: Get the current settings for the publication.
- `preferencesEditor`: Get the preferences editor for the publication.

See [Configuring the AudioNavigator](./ConfiguringAudioNavigator.md) for more information.

## Navigation

The `AudioNavigator` class exposes several methods for navigating the audio publication. These methods are defined in the `MediaNavigator` abstract class and include:

- `go(locator: Locator, animated: boolean, cb: callback)`: Moves to the position in the publication corresponding to the given Locator.
- `goLink(link: Link, animated: boolean, cb: callback)`: Moves to the position in the publication targeted by the given Link.
- `goForward(animated: boolean, cb: callback)`: Moves to the next track in the reading progression.
- `goBackward(animated: boolean, cb: callback)`: Moves to the previous track in the reading progression.

```js
const locator = new Locator({
  href: 'audio/track-1.mp3',
  locations: new LocatorLocations({
    progression: 0.5,
    fragments: ['t=30']
  })
});
navigator.go(locator, false, (success) => {
  if (success) {
    console.log('Navigated to Track 1 at 30 seconds');
  }
});

const link = new Link({ href: 'audio/track-2.mp3' });
navigator.goLink(link, false, (success) => {
  if (success) {
    console.log('Navigated to Track 2');
  }
});

navigator.goForward(false, (success) => {
  if (success) {
    console.log('Navigated to next track');
  }
});

navigator.goBackward(false, (success) => {
  if (success) {
    console.log('Navigated to previous track');
  }
});
```

## Playback Control

The `AudioNavigator` class provides methods for controlling audio playback:

- `play()`: Starts or resumes audio playback.
- `pause()`: Pauses audio playback.
- `stop()`: Stops audio playback and resets to the beginning.
- `seek(time: number)`: Seeks to a specific time in seconds.
- `jump(seconds: number)`: Jumps forward or backward by the specified number of seconds.
- `skipForward()`: Skips forward by the configured interval.
- `skipBackward()`: Skips backward by the configured interval.

```js
// Basic playback control
navigator.play();
navigator.pause();
navigator.stop();

// Navigation within tracks
navigator.seek(30); // Seek to 30 seconds
navigator.jump(10); // Jump forward 10 seconds
navigator.jump(-5); // Jump backward 5 seconds

// Skip by configured intervals
navigator.skipForward(); // Skip forward by skipForwardInterval
navigator.skipBackward(); // Skip backward by skipBackwardInterval
```

## Timeline

The `AudioNavigator` exposes a `timeline` property that contextualizes the publication's reading order and table of contents. See [Timeline](./Timeline.md) for full documentation.

## Remote Playback

The `AudioNavigator` exposes a `remotePlayback` property that gives access to the browser's [Remote Playback API](https://developer.mozilla.org/en-US/docs/Web/API/Remote_Playback_API), enabling users to cast audio to AirPlay or Chromecast devices. See [Remote Playback](./RemotePlayback.md) for full documentation.

## Helpers

Finally, `AudioNavigator` provides helpers to help derive information about navigation and playback state:

- `canGoForward`: Returns `true` if the navigator can go to the next track.
- `canGoBackward`: Returns `true` if the navigator can go to the previous track.
- `isTrackStart`: Returns `true` if at the beginning of the current track.
- `isTrackEnd`: Returns `true` if at the end of the current track.

These can come in handy if you want to disable navigation buttons when the user is at the start or end of a track, or show different UI controls based on the current playback state.

```js
// Update UI based on navigation state
const nextButton = document.getElementById('next-button');
nextButton.disabled = !navigator.canGoForward;

const prevButton = document.getElementById('prev-button');
prevButton.disabled = !navigator.canGoBackward;

// Update UI based on track position
if (navigator.isTrackStart) {
  console.log('At the beginning of the track');
}

if (navigator.isTrackEnd) {
  console.log('At the end of the track');
}
```