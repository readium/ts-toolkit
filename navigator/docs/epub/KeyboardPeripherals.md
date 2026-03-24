# Keyboard Peripherals Configuration

`EpubNavigator` allows you to configure custom keyboard shortcuts through the `keyboardPeripherals` configuration option. This feature enables you to define custom keyboard events that can be listened to and handled by your application.

## Overview

Keyboard peripherals allow you to define custom keyboard shortcuts that trigger specific events in your application. These events can be used to implement custom functionality, such as navigating between pages, changing settings, or triggering other actions.

Note these shortcuts will prevent the default browser behavior and you will have to handle them. Be very cautious not to break accessibility features.

## Configuration

The `keyboardPeripherals` configuration is an array of objects, where each object defines a custom keyboard event with the following properties:

```typescript
{
  type: string;                     // Custom event type (e.g., 'custom_navigation')
  keyCombos: Array<{                // Array of key combinations that trigger this event
    keyCode: number;                // Key code number (e.g., 37 for ArrowLeft, 39 for ArrowRight)
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
  // ... other configuration options
  keyboardPeripherals: [
    {
      type: 'navigate_forward',
      keyCombos: [
        { keyCode: 39 }, // ArrowRight
        { keyCode: 76 }  // l
      ]
    },
    {
      type: 'navigate_backward',
      keyCombos: [
        { keyCode: 37 }, // ArrowLeft
        { keyCode: 72 }  // h
      ]
    },
    {
      type: 'toggle_sidebar',
      keyCombos: [
        { keyCode: 66, ctrl: true },  // Ctrl+B
        { keyCode: 66, meta: true }   // Cmd+B on Mac
      ]
    }
  ]
};

const listeners = {
  // ... other listeners
  peripheral: (data) => {
    const { type, key, code, keyCode, ctrlKey, altKey, shiftKey, metaKey, timestamp, targetFrameSrc, selectedText } = data;
    
    switch (type) {
      case 'navigate_forward':
        // Handle forward navigation
        console.log(`Forward navigation triggered by key: ${key} (${code})`);
        break;
      case 'navigate_backward':
        // Handle backward navigation
        console.log(`Backward navigation triggered by key: ${key} (${code})`);
        break;
      case 'toggle_sidebar':
        // Toggle sidebar visibility
        console.log(`Sidebar toggle triggered by key: ${key} (${code})`);
        break;
    }
  }
};

const navigator = new EpubNavigator(container, publication, listeners, positions, initialPosition, configuration);
```

## Keyboard Peripheral Event Data

```ts
interface KeyboardPeripheralEvent {
    type: string;
    timestamp: number;
    targetFrameSrc: string;
    selectedText?: {
        text: string;
        x: number;
        y: number;
        width: number;
        height: number;
    };
    // Keyboard-specific data
    key: string;
    code: string;
    keyCode: number;
    ctrlKey: boolean;
    altKey: boolean;
    shiftKey: boolean;
    metaKey: boolean;
}
```

## Built-in Keyboard Shortcuts

`EpubNavigator` includes several built-in keyboard shortcuts that can be monitored or disabled through the `contentProtection` configuration. These shortcuts are handled by the `NavigatorProtector` and trigger specific events when activated.

> [!CAUTION]
> If your custom keyboard peripherals conflict with these built-in shortcuts, they will be automatically filtered out to ensure content protection takes priority. You cannot override these protected shortcuts with custom peripherals – note that the `type` field is also checked to make sure it doesn't accidentally or forcefully match any built-in.

### Protected Shortcuts

These shortcuts can be monitored or protected via the `contentProtection` configuration. When enabled, they will trigger their respective events in `peripheral` events and prevent the default browser behavior.

- **Select All**
  - `Ctrl+A` (Windows/Linux) / `Cmd+A` (Mac)
  - Event type: `select_all`
  - Enable protection: `contentProtection.disableSelectAll = true`

- **Print**
  - `Ctrl+P` (Windows/Linux) / `Cmd+P` (Mac)
  - `Ctrl+Shift+P` / `Cmd+Shift+P`
  - `Ctrl+Alt+P` / `Cmd+Alt+P`
  - Event type: `print`
  - Enable protection: `contentProtection.protectPrinting = { disable: true }`

- **Save**
  - `Ctrl+S` (Windows/Linux) / `Cmd+S` (Mac)
  - Event type: `save`
  - Enable protection: `contentProtection.disableSave = true`

- **Developer Tools**
  - `F12` (Windows/Linux) / `Cmd+Option+I` (Mac)
  - `F12+Shift` / `F12+Ctrl+Shift`
  - `Cmd+Option+J` / `Cmd+Option+U` / `Cmd+Option+C` (Mac)
  - `Ctrl+Shift+C` / `Ctrl+Shift+J` / `Ctrl+Shift+I` (Windows/Linux)
  - Event type: `developer_tools`
  - Enable protection: `contentProtection.monitorDevTools = true`

### Important Notes

1. These shortcuts are handled at a low level and will prevent default browser behavior when triggered.
2. The events can be listened to using the `peripheral` listener in your navigator configuration.
3. The actual key combinations that trigger these events may vary by operating system and browser, which is why we are using key codes instead of literal key names.

## Best Practices

1. **Be consistent**: Use standard keyboard shortcuts that users are familiar with (e.g., arrow keys for navigation).
2. **Provide alternatives**: Include multiple key combinations for common actions when it makes sense.
3. **Document shortcuts**: Make sure to document the available keyboard shortcuts in your application's help section.
4. **Consider accessibility**: Ensure that all functionality is accessible via keyboard and consider users who may be using screen readers or other assistive technologies.
5. **Avoid conflicts**: Be mindful of browser and operating system shortcuts that might conflict with your custom shortcuts.
