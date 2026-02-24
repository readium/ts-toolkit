# Configuring the AudioNavigator

The Readium AudioNavigator can be configured dynamically, as it implements the `Configurable` interface.

## Overview

You cannot directly overwrite the Navigator settings. Instead, you submit a set of Preferences to the Navigator, which will then recalculate its settings and update the audio playback.

For instance: "volume" is a setting, and the application can submit the volume value `0.8` as a preference.

```js
// 1. Create a set of preferences.
const preferences = {
  volume: 0.8,
  playbackRate: 1.25,
  preservePitch: true,
  skipForwardInterval: 15,
  skipBackwardInterval: 15
}

// 2. Submit the preferences, the Navigator will update its settings and the audio playback.
navigator.submitPreferences(preferences)
```

## Editing Preferences

To assist you in building a preferences user interface or modifying existing preferences, `AudioNavigator` offers a `PreferencesEditor`. This editor includes rules for adjusting preferences, such as the supported values or ranges.

```js
// 1. Create a preferences editor.
const editor = navigator.preferencesEditor;
    
// 2. Modify the preferences through the editor.
editor.volume.decrement(); // Decrease volume by 0.05
editor.playbackRate.increment(); // Increase playback rate by 0.25
editor.preservePitch.toggle();
editor.skipForwardInterval.increment(); // Increase skip interval by 5 seconds

// 3. Submit the edited preferences
navigator.submitPreferences(editor.preferences)
```

## Preferences are low-level

Preferences are low-level technical properties. While some of them can be exposed directly to the user, such as the volume, others should not be displayed as-is.

For instance, `pollInterval` controls how frequently the navigator emits position change events, which is typically not something users would configure directly.

## Setting the initial Navigator preferences and app defaults

When opening an audio publication, you can immediately apply the user preferences by providing them to the `AudioNavigator` constructor.

```js
const navigator = new AudioNavigator(
  publication,
  listeners,
  initialPosition,
  configuration: {
    preferences: {
      volume: 0.8,
      playbackRate: 1.25,
      preservePitch: true,
      skipForwardInterval: 15,
      skipBackwardInterval: 15,
      autoPlay: true,
      enableMediaSession: true
    },
    defaults: {
      volume: 1.0,
      playbackRate: 1.0,
      preservePitch: true,
      skipForwardInterval: 30,
      skipBackwardInterval: 30,
      pollInterval: 1000,
      autoPlay: true,
      enableMediaSession: true
    }
  }
);
```

The `defaults` are used as fallback values when the default Navigator settings are not suitable for your application.

## Building a Settings Interface

TBD.

## Appendix: Audio Preference Details

### Playback Control Preferences

| Preference | Type | Range | Step | Default | Description |
| ---------- | ---- | ---- | ---- | ------- | ----------- |
| volume | RangePreference<number> | [0.0, 1.0] | 0.05 | 1.0 | Audio volume level |
| playbackRate | RangePreference<number> | [0.25, 4.0] | 0.25 | 1.0 | Playback speed multiplier |
| preservePitch | BooleanPreference | - | - | true | Whether to preserve audio pitch when changing playback rate |
| autoPlay | BooleanPreference | - | - | true | Whether to automatically play the next track when current track ends |

### Navigation Preferences

| Preference | Type | Range | Step | Default | Description |
| ---------- | ---- | ---- | ---- | ------- | ----------- |
| skipForwardInterval | RangePreference<number> | [5, 120] | 5 | 30 | Seconds to skip forward when using skipForward() |
| skipBackwardInterval | RangePreference<number> | [5, 120] | 5 | 30 | Seconds to skip backward when using skipBackward() |

### System Preferences

| Preference | Type | Default | Description |
| ---------- | ---- | ------- | ----------- |
| pollInterval | Preference<number> | 1000 | Milliseconds between position change events |
| enableMediaSession | BooleanPreference | true | Whether to integrate with browser's Media Session API |

### Preference Constraints

#### Volume
- Range: 0.0 (muted) to 1.0 (maximum volume)
- Step: 0.05
- Values outside this range will be clamped by the browser

#### Playback Rate
- Range: 0.25 (quarter speed) to 4.0 (quadruple speed)
- Step: 0.25
- Browser support may vary for extreme values
- When `preservePitch` is true, the audio pitch remains constant despite speed changes

#### Skip Intervals
- Range: 5 to 120 seconds
- Step: 5 seconds
- Should be balanced between user convenience and navigation precision

#### Poll Interval
- Measured in milliseconds
- Direct value assignment only (not a range preference)
- Lower values provide more frequent position updates but may impact performance
- Recommended range: 500ms to 2000ms for most use cases

#### Media Session Integration
- When enabled, integrates with system media controls (notification center, lock screen, etc.)
- Provides track metadata and playback controls to the operating system
- Automatically handles media keys (play/pause, next/previous track)
- Supported in most modern browsers