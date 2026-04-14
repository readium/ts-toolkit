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
editor.volume.decrement(); // Decrease volume by 0.1
editor.playbackRate.increment(); // Increase playback rate by 0.1
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
  {
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

You can also provide `contentProtection` and `keyboardPeripherals` in the same configuration object:

```js
const navigator = new AudioNavigator(
  publication,
  listeners,
  initialPosition,
  {
    preferences: { volume: 0.8 },
    defaults: {},
    contentProtection: {
      disableContextMenu: true,
      monitorDevTools: true,
      protectPrinting: { disable: true },
    },
    keyboardPeripherals: [
      {
        type: 'toggle_playback',
        keyCombos: [{ keyCode: 32 }] // Space
      }
    ]
  }
);
```

See [Content Protection](./ContentProtection.md) and [Keyboard Peripherals](./KeyboardPeripherals.md) for full details.

## Building a Settings Interface

TBD.

## Appendix: Audio Preference Details

Exact ranges, steps, and defaults are defined in [`src/preferences/Types.ts`](../../src/preferences/Types.ts) and [`src/audio/preferences/AudioPreferencesEditor.ts`](../../src/audio/preferences/AudioPreferencesEditor.ts). Refer to those files as the source of truth — the descriptions below are intentionally free of specific values.

### Playback Control Preferences

| Preference | Type | Description |
| ---------- | ---- | ----------- |
| volume | RangePreference<number> | Audio volume level (`volumeRangeConfig`) |
| playbackRate | RangePreference<number> | Playback speed multiplier (`playbackRateRangeConfig`) |
| preservePitch | BooleanPreference | Best-effort pitch preservation when changing playback rate: uses native browser support if available, otherwise falls back to an audio worklet (requires CORS) |
| autoPlay | BooleanPreference | Whether to automatically play the next track when the current one ends |

### Navigation Preferences

| Preference | Type | Description |
| ---------- | ---- | ----------- |
| skipForwardInterval | RangePreference<number> | Seconds to skip forward when using `skipForward()` (`skipIntervalRangeConfig`) |
| skipBackwardInterval | RangePreference<number> | Seconds to skip backward when using `skipBackward()` (`skipIntervalRangeConfig`) |

### System Preferences

| Preference | Type | Description |
| ---------- | ---- | ----------- |
| pollInterval | Preference<number> | Milliseconds between position change events |
| enableMediaSession | BooleanPreference | Whether to integrate with the browser's Media Session API |

### Notes

- `pollInterval`: lower values give more frequent position updates but may impact performance.
- `enableMediaSession`: when enabled, integrates with system media controls (lock screen, notification center, media keys).
- `preservePitch` is best-effort: pitch preservation relies on native browser support when available, and falls back to an audio worklet otherwise. The worklet requires CORS headers from the server for the audio resource.