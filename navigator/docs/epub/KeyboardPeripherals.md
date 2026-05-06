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
    ctrl?: boolean;                 // Whether Ctrl key must be pressed
    alt?: boolean;                  // Whether Alt/Option key must be pressed
    shift?: boolean;                // Whether Shift key must be pressed
    meta?: boolean;                 // Whether Cmd/Windows key must be pressed
    suppressOnInteractiveElement?: boolean | string[]; // Whether to suppress when focus is on an interactive element (default: false)
    condition?: ObservableCondition; // Reactive condition — combo is only active while condition emits true
  }>;
}
```

**Note:** Use `keyCode` (number) instead of `key` (string) as it provides more consistent behavior across different keyboard layouts. You can find key codes at [keycode.info](https://keycode.info/).

### `suppressOnInteractiveElement`

By default, shortcuts fire regardless of where focus is. Use `suppressOnInteractiveElement` on combos that would interfere with native browser behavior when an interactive element is focused:

- `true` — suppress using the full interactive element check (tag name, ARIA role, `tabindex`, `contenteditable`)
- `string[]` — suppress only when `document.activeElement` matches one of the provided CSS selectors, for more targeted control

For example, bare arrow keys or space should set `true` so cursor movement and button activation work natively. A combo that only conflicts with text inputs could use `["input", "textarea", "[contenteditable]"]` instead.

### `condition`

The `condition` property takes an `ObservableCondition` — a reactive value that the navigator subscribes to. When the condition emits `false`, the combo is removed from the iframe's active set and the browser handles the key natively. When it emits `true` again, the combo is re-registered automatically.

```typescript
interface ObservableCondition {
  // Must fire immediately with the current value, then again on each change.
  subscribe(cb: (value: boolean) => void): () => void;
}
```

Because keyboard events are handled inside an iframe and `preventDefault()` must be called synchronously there, conditions cannot be plain functions evaluated after the fact — the navigator needs to know about state changes ahead of time and keep the iframe in sync.

#### Creating a condition

A condition can be wired to any reactive primitive in your app. Here is a minimal helper that implements the interface:

```typescript
function createCondition(initial: boolean) {
  let value = initial;
  const listeners = new Set<(v: boolean) => void>();
  return {
    subscribe(cb: (v: boolean) => void) {
      listeners.add(cb);
      cb(value); // fire immediately with current value
      return () => listeners.delete(cb);
    },
    set(next: boolean) {
      if (next === value) return;
      value = next;
      listeners.forEach(cb => cb(value));
    },
  };
}

// Create once, outside of any render/update cycle
const scrollCondition = createCondition(false); // starts active (not in scroll mode)

// Call set() whenever your app state changes
scrollCondition.set(isScrollMode);

// Pass to the combo
{
  keyCode: 37, // ArrowLeft
  condition: scrollCondition,
  suppressOnInteractiveElement: true
}
```

## Example

```javascript
// Reactive conditions
const scrollCondition = createCondition(false);   // true = in scroll mode
const sidebarCondition = createCondition(false);  // true = sidebar visible

// Update them when app state changes
function setScrollMode(enabled) {
  isScrollMode = enabled;
  scrollCondition.set(!enabled); // combo active when NOT in scroll mode
}
function setSidebarVisible(visible) {
  sidebarVisible = visible;
  sidebarCondition.set(!visible); // combo active when sidebar is hidden
}

const configuration = {
  // ... other configuration options
  keyboardPeripherals: [
    {
      type: 'navigate_forward',
      keyCombos: [
        { 
          keyCode: 39, // ArrowRight
          suppressOnInteractiveElement: true,
          condition: scrollCondition
        },
        { 
          keyCode: 76, // l
          suppressOnInteractiveElement: true,
          condition: scrollCondition
        }
      ]
    },
    {
      type: 'navigate_backward',
      keyCombos: [
        { 
          keyCode: 37, // ArrowLeft
          suppressOnInteractiveElement: true,
          condition: scrollCondition
        },
        { 
          keyCode: 72, // h
          suppressOnInteractiveElement: true,
          condition: scrollCondition
        }
      ]
    },
    {
      type: 'toggle_sidebar',
      keyCombos: [
        { 
          keyCode: 66, // Ctrl+B / Cmd+B
          ctrl: true,
          condition: sidebarCondition
        },
        { 
          keyCode: 66, // Ctrl+B / Cmd+B
          meta: true,
          condition: sidebarCondition
        }
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
    interactiveElement?: string; // The interactive element (if any) that is currently focused
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
  - `F12` / `Shift+F12` / `Ctrl+Shift+F12` / `Cmd+Option+F12`
  - `Cmd+Option+I` / `Cmd+Option+J` / `Cmd+Option+U` / `Cmd+Option+C` (Mac)
  - `Cmd+Shift+C` (Mac) / `Ctrl+Shift+C` / `Ctrl+Shift+I` / `Ctrl+Shift+J` (Windows/Linux)
  - `Cmd+Option+A` / `Cmd+Shift+Option+T` / `Shift+Option+C` (Safari)
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
6. **Use conditions wisely**: Leverage conditions to allow browser fallback behavior when appropriate (e.g., don't handle arrow keys in scroll mode, let browser handle scrolling natively).
7. **Share condition objects**: A single `ObservableCondition` can be referenced by multiple key combos. Calling `.set()` once updates all of them simultaneously.
