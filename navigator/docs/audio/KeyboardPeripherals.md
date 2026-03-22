# Keyboard Peripherals Configuration

`AudioNavigator` allows you to configure custom keyboard shortcuts through the `keyboardPeripherals` configuration option. This feature enables you to define custom keyboard events that can be listened to and handled by your application.

## Overview

Keyboard peripherals allow you to define custom keyboard shortcuts that trigger specific events in your application. These events can be used to implement custom functionality, such as controlling playback, adjusting volume, or triggering other actions.

Note these shortcuts will prevent the default browser behavior and you will have to handle them. Be very cautious not to break accessibility features.

## Configuration

The `keyboardPeripherals` configuration is an array of objects, where each object defines a custom keyboard event:

```typescript
{
  type: string;                     // Custom event type (e.g., 'toggle_playback')
  keyCombos: Array<{                // Array of key combinations that trigger this event
    keyCode: number;                // Key code number (e.g., 32 for Space, 75 for k)
    ctrl?: boolean;                 // Whether the Ctrl key must be pressed
    alt?: boolean;                  // Whether the Alt/Option key must be pressed
    shift?: boolean;                // Whether the Shift key must be pressed
    meta?: boolean;                 // Whether the Cmd/Windows key must be pressed
  }>;
}
```

**Note:** Use `keyCode` (number) instead of `key` (string) as it provides more consistent behavior across different keyboard layouts. You can find key codes at [keycode.info](https://keycode.info/).

## Example

```javascript
const configuration = {
  preferences: {},
  defaults: {},
  keyboardPeripherals: [
    {
      type: 'toggle_playback',
      keyCombos: [
        { keyCode: 32 }, // Space
        { keyCode: 75 }  // k
      ]
    },
    {
      type: 'skip_forward',
      keyCombos: [
        { keyCode: 39 }, // ArrowRight
        { keyCode: 76 }  // l
      ]
    },
    {
      type: 'skip_backward',
      keyCombos: [
        { keyCode: 37 }, // ArrowLeft
        { keyCode: 74 }  // j
      ]
    },
    {
      type: 'volume_up',
      keyCombos: [
        { keyCode: 38 }  // ArrowUp
      ]
    },
    {
      type: 'volume_down',
      keyCombos: [
        { keyCode: 40 }  // ArrowDown
      ]
    }
  ]
};

const navigator = new AudioNavigator(publication, listeners, initialPosition, configuration);
```

## Listening to Keyboard Events

Handle custom keyboard events via the `peripheral` listener:

```javascript
const listeners = {
  // ... other listeners

  peripheral: (data) => {
    switch (data.type) {
      case 'toggle_playback':
        navigator.isPlaying ? navigator.pause() : navigator.play();
        break;
      case 'skip_forward':
        navigator.skipForward();
        break;
      case 'skip_backward':
        navigator.skipBackward();
        break;
      case 'volume_up':
        navigator.submitPreferences({ volume: Math.min(1, navigator.settings.volume + 0.1) });
        break;
      case 'volume_down':
        navigator.submitPreferences({ volume: Math.max(0, navigator.settings.volume - 0.1) });
        break;
    }
  }
};
```

## Keyboard Peripheral Event Data

```typescript
interface KeyboardPeripheralEvent {
    type: string;
    timestamp: number;
    targetFrameSrc: string;
    key: string;
    code: string;
    keyCode: number;
    ctrlKey: boolean;
    altKey: boolean;
    shiftKey: boolean;
    metaKey: boolean;
}
```

## Built-in Protected Shortcuts

`AudioNavigator` includes several built-in keyboard shortcuts that are activated through the `contentProtection` configuration. When enabled, they are handled before any custom peripherals.

> [!CAUTION]
> If your custom keyboard peripherals conflict with these built-in shortcuts, they will be automatically filtered out. You cannot override protected shortcuts with custom peripherals.

- **Print** — `Ctrl+P` / `Cmd+P` — enabled via `contentProtection.protectPrinting.disable`
- **Save** — `Ctrl+S` / `Cmd+S` — enabled via `contentProtection.disableSave`
- **Developer Tools** — `F12`, `Ctrl+Shift+I`, `Cmd+Option+I`, etc. — enabled via `contentProtection.monitorDevTools`

See [Content Protection](./ContentProtection.md) for details.

## Best Practices

1. **Be consistent**: Use standard keyboard shortcuts that users are familiar with (e.g., Space to play/pause).
2. **Provide alternatives**: Include multiple key combinations for common actions when it makes sense.
3. **Consider accessibility**: Ensure that all functionality is accessible via keyboard and consider users who may be using screen readers or other assistive technologies.
4. **Avoid conflicts**: Be mindful of browser and operating system shortcuts that might conflict with your custom shortcuts.
