# Customizing Audio Listeners

`AudioNavigatorListeners` allows you to bind callbacks for events happening inside the `AudioNavigator`.

The following events are exposed:
- `trackLoaded`: fires when an audio track has finished loading and is ready to play
- `positionChanged`: fires when the current playback position has changed
- `timelineItemChanged`: fires when the active `TimelineItem` changes (optional)
- `error`: fires when an error occurs during audio playback
- `trackEnded`: fires when an audio track finishes playing
- `play`: fires when audio playback starts or resumes
- `pause`: fires when audio playback is paused
- `metadataLoaded`: fires when audio metadata has loaded, including duration, text tracks, and loading state
- `stalled`: fires when the audio player stalls (buffering stopped)
- `seeking`: fires when the audio player starts or finishes seeking
- `seekable`: fires as media data is downloaded, with the current seekable `TimeRanges`
- `contextMenu`: fires when a right-click context menu is blocked (requires `contentProtection.disableContextMenu`). See [Content Protection](./ContentProtection.md).
- `contentProtection`: fires when a content protection event occurs (automation detected, dev tools opened, drag/drop blocked, etc.). See [Content Protection](./ContentProtection.md).
- `peripheral`: fires when a configured keyboard peripheral shortcut is triggered. See [Keyboard Peripherals](./KeyboardPeripherals.md).
- `remotePlaybackStateChanged`: fires when the Remote Playback connection state changes. See [Remote Playback](./RemotePlayback.md).

All listeners are required. Your listeners object must implement every callback:

```js
const listeners: AudioNavigatorListeners = {
  trackLoaded: function (media: HTMLMediaElement): void {},
  positionChanged: function (locator: Locator): void {},
  error: function (error: any, locator: Locator): void {},
  trackEnded: function (locator: Locator): void {},
  play: function (locator: Locator): void {},
  pause: function (locator: Locator): void {},
  metadataLoaded: function (metadata: AudioMetadata): void {},
  stalled: function (isStalled: boolean): void {},
  seeking: function (isSeeking: boolean): void {},
  seekable: function (seekable: TimeRanges): void {},
  timelineItemChanged: function (item: TimelineItem | undefined): void {},
  remotePlaybackStateChanged: function (state: RemotePlaybackState): void {},
};
```

## Listeners

### trackLoaded

Fires when an audio track has finished loading and is ready to be played.

```js
const listeners = {
  trackLoaded: function (media: HTMLMediaElement): void {
    console.log('Track loaded:', media.src);
    updatePlayButton(true);
  }
};
```

### positionChanged

Fires when the current playback position changes. The frequency is controlled by the `pollInterval` preference.

### timelineItemChanged

Fires when the active `TimelineItem` changes — not on every position tick, only when the item actually changes. Receives `undefined` when no item is active. This listener is optional; omitting it is equivalent to a no-op.

Use this to keep chapter titles, breadcrumbs, or previous/next navigation in sync without polling. See [Timeline](./Timeline.md) for the full API.

```js
const listeners = {
  timelineItemChanged: function (item: TimelineItem | undefined): void {
    chapterTitle.textContent = item?.title ?? '';

    if (item) {
      const { previous, next } = publication.timeline.adjacentTo(item);
      prevButton.disabled = !previous;
      nextButton.disabled = !next;
    }
  }
};
```
```js
const listeners = {
  positionChanged: function (locator: Locator): void {
    const currentTime = locator.locations?.time() ?? 0;
    const progression = locator.locations?.progression ?? 0;
    updateProgress(currentTime, progression);
  }
};
```

### error

Fires when an error occurs during audio playback, such as network issues or unsupported formats.

```js
const listeners = {
  error: function (error: any, locator: Locator): void {
    console.error('Audio error:', error, 'at:', locator.href);
    showErrorMessage('Failed to play audio track');
  }
};
```

### trackEnded

Fires when an audio track finishes playing completely.

```js
const listeners = {
  trackEnded: function (locator: Locator): void {
    console.log('Track ended:', locator.href);
    updateUIForTrackEnd();
  }
};
```

### play

Fires when audio playback starts or resumes.

```js
const listeners = {
  play: function (locator: Locator): void {
    updatePlayButton(false);
    updatePauseButton(true);
  }
};
```

### pause

Fires when audio playback is paused.

```js
const listeners = {
  pause: function (locator: Locator): void {
    updatePlayButton(true);
    updatePauseButton(false);
  }
};
```

### metadataLoaded

Fires when audio metadata has been loaded. Provides an `AudioMetadata` object containing:

- `duration`: Audio length in seconds
- `textTracks`: Available subtitle/caption tracks (`TextTrackList`)
- `readyState`: Current loading state (0-4)
- `networkState`: Network loading state (0-3)

```js
const listeners = {
  metadataLoaded: function (metadata: AudioMetadata): void {
    updateDurationDisplay(metadata.duration);
    
    // Setup subtitle/caption UI
    for (let i = 0; i < metadata.textTracks.length; i++) {
      const track = metadata.textTracks[i];
      if (track.kind === 'subtitles' || track.kind === 'captions') {
        addSubtitleOption(track.label, track.language);
      }
    }
    
    // Show loading state
    showLoadingIndicator(metadata.readyState < 3);
  }
};
```

### stalled

Fires when the browser stops fetching audio data. Clears when playback resumes (`playing` event).

```js
const listeners = {
  stalled: function (isStalled: boolean): void {
    showBufferingIndicator(isStalled);
  }
};
```

### seeking

Fires `true` when a seek begins (or playback is waiting for data), and `false` when it completes.

```js
const listeners = {
  seeking: function (isSeeking: boolean): void {
    showSeekingIndicator(isSeeking);
  }
};
```

### seekable

Fires as the browser downloads media data. The callback receives the [`TimeRanges`](https://developer.mozilla.org/en-US/docs/Web/API/TimeRanges) object from `HTMLMediaElement.seekable`, which describes which portions of the track can currently be seeked to.

```js
const listeners = {
  seekable: function (seekable: TimeRanges): void {
    for (let i = 0; i < seekable.length; i++) {
      console.log(`Range ${i}: ${seekable.start(i)}s – ${seekable.end(i)}s`);
    }
  }
};
```

### remotePlaybackStateChanged

Fires when the Remote Playback connection state changes. The state is `'connecting'`, `'connected'`, or `'disconnected'`. Use it to update a cast button or display a status indicator. See [Remote Playback](./RemotePlayback.md) for the full API including device availability and prompting.

```js
const listeners = {
  remotePlaybackStateChanged: function (state: RemotePlaybackState): void {
    const castButton = document.getElementById('cast-button');
    castButton.textContent =
      state === 'connected'  ? 'Casting'     :
      state === 'connecting' ? 'Connecting…' :
                               'Cast';
  }
};
```

## Usage Example

```js
const listeners: AudioNavigatorListeners = {
  trackLoaded: (media) => {
    console.log('Audio track ready:', media.src);
    document.getElementById('play-button').disabled = false;
  },

  positionChanged: (locator) => {
    const currentTime = locator.locations?.time() ?? 0;
    const progression = locator.locations?.progression ?? 0;
    document.getElementById('current-time').textContent = formatTime(currentTime);
    (document.getElementById('progress-bar') as HTMLInputElement).value = progression.toString();
  },

  metadataLoaded: (metadata) => {
    document.getElementById('total-time').textContent = formatTime(metadata.duration);
    
    // Setup subtitle options
    for (let i = 0; i < metadata.textTracks.length; i++) {
      const track = metadata.textTracks[i];
      if (track.kind === 'subtitles' || track.kind === 'captions') {
        addSubtitleOption(track.label, track.language);
      }
    }
  },

  play: () => {
    document.getElementById('play-button').style.display = 'none';
    document.getElementById('pause-button').style.display = 'block';
  },

  pause: () => {
    document.getElementById('play-button').style.display = 'block';
    document.getElementById('pause-button').style.display = 'none';
  },

  trackEnded: () => {
    console.log('Track finished');
  },

  error: (error, locator) => {
    console.error('Playback error:', error);
    alert(`Error playing ${locator.href}: ${error.message}`);
  },

  stalled: (isStalled) => {
    document.getElementById('buffering-indicator').style.display = isStalled ? 'block' : 'none';
  },

  seeking: (isSeeking) => {
    document.getElementById('seeking-indicator').style.display = isSeeking ? 'block' : 'none';
  },

  seekable: (seekable) => {
    for (let i = 0; i < seekable.length; i++) {
      console.log(`Seekable range ${i}: ${seekable.start(i)}s – ${seekable.end(i)}s`);
    }
  },

  remotePlaybackStateChanged: (state) => {
    document.getElementById('cast-button').dataset.state = state;
  },
};

const navigator = new AudioNavigator(publication, listeners);
```
