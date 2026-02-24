# Customizing Audio Listeners

`AudioNavigatorListeners` allows you to bind callbacks for events happening inside the `AudioNavigator`.

The following events are exposed:
- `trackLoaded`: fires when an audio track has finished loading
- `positionChanged`: fires when the current playback position has changed
- `onError`: fires when an error occurs during audio playback
- `onEnded`: fires when an audio track finishes playing
- `onPlay`: fires when audio playback starts or resumes
- `onPause`: fires when audio playback is paused
- `onLoadedMetadata`: fires when audio metadata (including duration) has loaded
- `onBuffering`: fires when the audio player starts or stops buffering

Your listeners object should look like this if you do not customize them at all.

```js
const listeners: AudioNavigatorListeners = {
  trackLoaded: function (media: HTMLMediaElement): void {},
  positionChanged: function (locator: Locator): void {},
  onError: function (error: any, locator: Locator): void {},
  onEnded: function (locator: Locator): void {},
  onPlay: function (locator: Locator): void {},
  onPause: function (locator: Locator): void {},
  onLoadedMetadata: function (duration: number): void {},
  onBuffering: function (isBuffering: boolean): void {},
};
```

## Listeners

### Track Loaded

Fires when an audio track has finished loading and is ready to be played. This is useful for updating UI elements that depend on the media element being available.

```js
const listeners = {
  trackLoaded: function (media: HTMLMediaElement): void {
    console.log('Track loaded:', media.src);
    // Update UI to show track is ready
    updatePlayButton(true);
  }
};
```

### Position Changed

Fires when the current playback position changes. The frequency of this event is controlled by the `pollInterval` preference.

```js
const listeners = {
  positionChanged: function (locator: Locator): void {
    console.log('Position changed:', locator.locations?.otherLocations?.get('time'));
    // Update progress bar
    updateProgress(locator.locations?.progression || 0);
  }
};
```

### On Error

Fires when an error occurs during audio playback, such as network issues or unsupported formats.

```js
const listeners = {
  onError: function (error: any, locator: Locator): void {
    console.error('Audio error:', error, 'at:', locator.href);
    // Show error message to user
    showErrorMessage('Failed to play audio track');
  }
};
```

### On Ended

Fires when an audio track finishes playing completely. This is different from `positionChanged` reaching the end - this event specifically indicates track completion.

```js
const listeners = {
  onEnded: function (locator: Locator): void {
    console.log('Track ended:', locator.href);
    // Handle track completion (e.g., auto-play next track is handled automatically)
    updateUIForTrackEnd();
  }
};
```

### On Play

Fires when audio playback starts or resumes, either through user action or programmatic calls.

```js
const listeners = {
  onPlay: function (locator: Locator): void {
    console.log('Playback started:', locator.href);
    // Update UI to show playing state
    updatePlayButton(false);
    updatePauseButton(true);
  }
};
```

### On Pause

Fires when audio playback is paused, either through user action or programmatic calls.

```js
const listeners = {
  onPause: function (locator: Locator): void {
    console.log('Playback paused:', locator.href);
    // Update UI to show paused state
    updatePlayButton(true);
    updatePauseButton(false);
  }
};
```

### On Loaded Metadata

Fires when audio metadata has been loaded, including the duration. This is useful for initializing progress bars and time displays.

```js
const listeners = {
  onLoadedMetadata: function (duration: number): void {
    console.log('Metadata loaded, duration:', duration);
    // Initialize UI with duration
    updateDurationDisplay(duration);
    setupProgressBar(duration);
  }
};
```

### On Buffering

Fires when the audio player starts or stops buffering. This is useful for showing buffering indicators to users.

```js
const listeners = {
  onBuffering: function (isBuffering: boolean): void {
    console.log('Buffering:', isBuffering);
    // Show/hide buffering indicator
    if (isBuffering) {
      showBufferingIndicator();
    } else {
      hideBufferingIndicator();
    }
  }
};
```

## Usage Example

Here's a complete example of setting up listeners for an audio player:

```js
const listeners: AudioNavigatorListeners = {
  trackLoaded: (media) => {
    console.log('Audio track ready:', media.src);
    document.getElementById('play-button').disabled = false;
  },
  
  positionChanged: (locator) => {
    const currentTime = locator.locations?.otherLocations?.get('time') || 0;
    const progression = locator.locations?.progression || 0;
    
    // Update time display
    document.getElementById('current-time').textContent = formatTime(currentTime);
    
    // Update progress bar
    const progressBar = document.getElementById('progress-bar') as HTMLInputElement;
    progressBar.value = progression.toString();
  },
  
  onLoadedMetadata: (duration) => {
    document.getElementById('total-time').textContent = formatTime(duration);
  },
  
  onPlay: () => {
    document.getElementById('play-button').style.display = 'none';
    document.getElementById('pause-button').style.display = 'block';
  },
  
  onPause: () => {
    document.getElementById('play-button').style.display = 'block';
    document.getElementById('pause-button').style.display = 'none';
  },
  
  onEnded: () => {
    console.log('Track finished');
    // UI will be updated by positionChanged event
  },
  
  onError: (error, locator) => {
    console.error('Playback error:', error);
    alert(`Error playing ${locator.href}: ${error.message}`);
  },
  
  onBuffering: (isBuffering) => {
    const indicator = document.getElementById('buffering-indicator');
    indicator.style.display = isBuffering ? 'block' : 'none';
  }
};

const navigator = new AudioNavigator(publication, listeners);
```
