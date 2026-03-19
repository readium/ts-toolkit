# Customizing Audio Listeners

`AudioNavigatorListeners` allows you to bind callbacks for events happening inside the `AudioNavigator`.

The following events are exposed:
- `trackLoaded`: fires when an audio track has finished loading and is ready to play
- `positionChanged`: fires when the current playback position has changed
- `error`: fires when an error occurs during audio playback
- `ended`: fires when an audio track finishes playing
- `play`: fires when audio playback starts or resumes
- `pause`: fires when audio playback is paused
- `metadataLoaded`: fires when audio metadata (including duration) has loaded
- `stalled`: fires when the audio player stalls (buffering stopped)
- `seeking`: fires when the audio player starts or finishes seeking
- `seekable`: fires as media data is downloaded, with the current seekable `TimeRanges`

All listeners are required. Your listeners object must implement every callback:

```js
const listeners: AudioNavigatorListeners = {
  trackLoaded: function (media: HTMLMediaElement): void {},
  positionChanged: function (locator: Locator): void {},
  error: function (error: any, locator: Locator): void {},
  ended: function (locator: Locator): void {},
  play: function (locator: Locator): void {},
  pause: function (locator: Locator): void {},
  metadataLoaded: function (duration: number): void {},
  stalled: function (isStalled: boolean): void {},
  seeking: function (isSeeking: boolean): void {},
  seekable: function (seekable: TimeRanges): void {},
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

### ended

Fires when an audio track finishes playing completely.

```js
const listeners = {
  ended: function (locator: Locator): void {
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

Fires when audio metadata has been loaded, including the duration.

```js
const listeners = {
  metadataLoaded: function (duration: number): void {
    updateDurationDisplay(duration);
    setupProgressBar(duration);
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

  metadataLoaded: (duration) => {
    document.getElementById('total-time').textContent = formatTime(duration);
  },

  play: () => {
    document.getElementById('play-button').style.display = 'none';
    document.getElementById('pause-button').style.display = 'block';
  },

  pause: () => {
    document.getElementById('play-button').style.display = 'block';
    document.getElementById('pause-button').style.display = 'none';
  },

  ended: () => {
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
};

const navigator = new AudioNavigator(publication, listeners);
```
