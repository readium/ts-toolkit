# Remote Playback

The `AudioNavigator` supports the [Remote Playback API](https://developer.mozilla.org/en-US/docs/Web/API/Remote_Playback_API), which lets users cast audio to external devices such as AirPlay speakers or Chromecast-enabled devices.

> **Browser support**: the Remote Playback API is supported in Chromium-based browsers and Safari. It is not currently supported in Firefox.

## How it works

The Remote Playback API is attached to a specific `HTMLMediaElement` instance via its `remote` property. The `AudioNavigator` keeps a single persistent media element for the lifetime of the navigator — track changes update its `src` rather than swapping the element. This means the remote session survives navigation between tracks without interruption.

## Accessing the RemotePlayback object

Use the `remotePlayback` getter to access the [`RemotePlayback`](https://developer.mozilla.org/en-US/docs/Web/API/RemotePlayback) object directly:

```js
const remote = navigator.remotePlayback;
```

The returned object is the same reference for the entire lifetime of the navigator. You can store it once and reuse it.

## Prompting the user to connect

Call `prompt()` to show the browser's built-in device picker. It resolves when the user connects to a device, or rejects if they dismiss the dialog or no devices are available.

```js
castButton.addEventListener('click', async () => {
  try {
    await navigator.remotePlayback.prompt();
    // The remotePlaybackStateChanged listener handles the resulting state change.
  } catch {
    // User dismissed the picker or no devices are available.
  }
});
```

> `prompt()` must be called from a user gesture (click, keypress, etc.).

## Watching device availability

Use `watchAvailability()` to show or hide a cast button depending on whether compatible devices are in range:

```js
let watchId: number;

async function startWatchingAvailability() {
  try {
    watchId = await navigator.remotePlayback.watchAvailability((available) => {
      castButton.style.display = available ? 'block' : 'none';
    });
  } catch {
    // The browser does not support watching availability,
    // or the media element has disableRemotePlayback set.
    // Fall back to always showing the button.
    castButton.style.display = 'block';
  }
}

function stopWatchingAvailability() {
  navigator.remotePlayback.cancelWatchAvailability(watchId);
}
```

## Reacting to state changes

The `remotePlaybackStateChanged` listener fires whenever the connection state changes. The state is one of:

| State | Meaning |
|-------|---------|
| `connecting` | The browser is establishing a connection to the remote device |
| `connected` | Playback is active on the remote device |
| `disconnected` | The session has ended (user disconnected, or device lost) |

```js
const listeners: AudioNavigatorListeners = {
  // ...other listeners...
  remotePlaybackStateChanged: (state) => {
    switch (state) {
      case 'connecting':
        castButton.textContent = 'Connecting…';
        break;
      case 'connected':
        castButton.textContent = 'Casting';
        castButton.classList.add('active');
        break;
      case 'disconnected':
        castButton.textContent = 'Cast';
        castButton.classList.remove('active');
        break;
    }
  },
};
```

## Full example

```js
const castButton = document.getElementById('cast-button') as HTMLButtonElement;

// --- Navigator setup ---

const listeners: AudioNavigatorListeners = {
  trackLoaded: (_media) => { /* ... */ },
  positionChanged: (_locator) => { /* ... */ },
  // ...other required listeners...

  remotePlaybackStateChanged: (state) => {
    castButton.dataset.state = state;
    castButton.textContent =
      state === 'connected'   ? 'Casting'      :
      state === 'connecting'  ? 'Connecting…'  :
                                'Cast';
  },
};

const navigator = new AudioNavigator(publication, listeners);

// --- Device availability ---

navigator.remotePlayback.watchAvailability((available) => {
  castButton.style.display = available ? 'inline-flex' : 'none';
}).catch(() => {
  // Availability monitoring not supported; always show the button.
  castButton.style.display = 'inline-flex';
});

// --- Cast button ---

castButton.addEventListener('click', async () => {
  if (navigator.remotePlayback.state === 'connected') {
    // Already casting — nothing to do; the user disconnects via the browser UI.
    return;
  }
  try {
    await navigator.remotePlayback.prompt();
  } catch {
    // User cancelled or no devices found.
  }
});
```

## Disabling remote playback

If you want to prevent remote playback for a specific publication (e.g. for DRM reasons), set `disableRemotePlayback` in the content protection configuration:

```js
const navigator = new AudioNavigator(publication, listeners, undefined, {
  preferences: {},
  defaults: {},
  contentProtection: {
    disableRemotePlayback: true,
  },
});
```
