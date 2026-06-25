# @readium/decorator

Standalone decoration controller for Readium publications. Lets `@readium/speech` (or any host) drive highlight decorations on a plain page **without** a Navigator or iframe.

## Why this package exists

The `Decorator` module that renders highlights lives in `@readium/navigator-html-injectables`. Normally it is mounted inside an iframe and receives commands via `postMessage` (`Comms`). This package adds:

- **`DirectCommsChannel`** — a same-process, synchronous replacement for `postMessage`. Instead of crossing a frame boundary, host and module talk directly in memory.
- **`DecorationController`** — the diff algorithm and group state that live inside `EpubNavigator`, extracted so any host can drive decorations without a Navigator.

`Decorator` itself still lives in `navigator-html-injectables` (it shares DOM helpers with Snappers and Setup — moving it would create circular deps). This package re-exports it, so speech only needs one import source.

## Dependency graph

```
@readium/shared
      ↓
@readium/navigator-html-injectables
      ↓
@readium/decorator          ← this package
      ↑
@readium/speech   @readium/navigator   (and any other consumer)
```

## Usage

```ts
import { DirectCommsChannel, Decorator, DecorationController } from "@readium/decorator";

// 1. Create the in-process comms channel
const channel = new DirectCommsChannel();

// 2. Mount the Decorator module directly on the host window
const decorator = new Decorator();
decorator.mount(window, channel.frame);

// 3. Create the controller — it owns the diff state and sends commands through channel.host
const ctrl = new DecorationController(channel.host);

// 4. Apply decorations (call again with a new array to update)
ctrl.applyDecorations([
    {
        id: "tts-0",
        locator: /* Locator pointing at the text to highlight */,
        style: { type: "highlight", tint: "#FFFF00" },
    }
], "tts");

// 5. Cleanup
decorator.unmount(window, channel.frame);
ctrl.destroy();
channel.frame.destroy();
```

## API

### `DirectCommsChannel`

Pairs a `DirectCommsFrame` (implements `IComms` — pass to `Decorator.mount`) with a `DirectCommsHost` (used by `DecorationController` to send commands). No postMessage, no async.

```ts
const channel = new DirectCommsChannel();
channel.frame  // IComms — module side
channel.host   // DirectCommsHost — controller side
```

### `DecorationController`

```ts
class DecorationController {
    constructor(host: DirectCommsHost)

    // Replace all decorations for a group. Diffs against previous state.
    applyDecorations(decorations: Decoration[], group: string): void

    // Register an observer for activation (tap/click) and optional hover events on a group.
    // All decorations in the group become tappable once an observer is registered.
    // Hover tracking is enabled automatically when the observer declares onDecorationPointerEnter
    // or onDecorationPointerLeave.
    registerDecorationObserver(group: string, observer: DecorationObserver): void
    unregisterDecorationObserver(observer: DecorationObserver): void

    destroy(): void
}
```

### `DecorationObserver`

```ts
interface DecorationObserver {
    // Called when a decoration is tapped/clicked. Return true to consume the event
    // (suppresses default navigation). All decorations in the group fire this once
    // an observer is registered — no per-decoration flag required.
    onDecorationActivated(event: DecorationActivatedEvent): boolean;

    // Called when the pointer enters a decoration. Registering either hover method
    // automatically enables hover tracking for the group.
    onDecorationPointerEnter?(event: DecorationPointerEnterEvent): void;

    // Called when the pointer leaves a decoration.
    onDecorationPointerLeave?(event: { decoration: Decoration; group: string }): void;
}
```

### `Decorator` (re-exported from `@readium/navigator-html-injectables`)

```ts
class Decorator {
    mount(wnd: Window, comms: IComms): boolean
    unmount(wnd: Window, comms: IComms): boolean
}
```

### Types (re-exported from `@readium/navigator-html-injectables`)

| Name | Notes |
|------|-------|
| `Decoration` | `{ id, locator, style, extras? }` |
| `DecorationStyle` | `BuiltinDecorationStyle \| HTMLDecorationTemplate` |
| `BuiltinDecorationStyle` | `{ type?, tint?, layout?, width?, enforceContrast? }` |
| `DecorationStyleType` | `"highlight" \| "underline" \| "outline" \| "textColor" \| "mask" \| "template"` |
| `DecorationLayout` | `"boxes" \| "bounds"` |
| `DecorationWidth` | `"wrap" \| "viewport" \| "bounds" \| "page"` |
| `DecorationObserver` | `{ onDecorationActivated, onDecorationPointerEnter?, onDecorationPointerLeave? }` |
| `DecorationActivatedEvent` | `{ decoration, group, rect?, point? }` |
| `DecorationPointerEnterEvent` | `{ decoration, group, rect?, point? }` |
| `IComms` | Interface implemented by both `Comms` (postMessage) and `DirectCommsFrame` |
