# @readium/decorator

Renders visual annotations over text ranges in HTML content — highlights, underlines, strikethroughs, and more. Works on any HTML document.

## Installation

```sh
npm install @readium/decorator
```

`@readium/decorator` depends on [`@readium/shared`](https://www.npmjs.com/package/@readium/shared) (for the `Locator` type, which identifies *where* a decoration goes) and `@readium/navigator-html-injectables` (the DOM renderer it wraps). Both are installed automatically as dependencies.

### Requirements

- A browser environment. The renderer (`Decorator`) mounts on a real `Window`/`document` and uses `ResizeObserver` and `MutationObserver` to keep decorations positioned as the page reflows — there's no server-side/Node rendering path.

## Concepts

- **Comms**: `DecorationController` (your app logic) and `Decorator` (the DOM renderer) talk over a small message-passing interface, handled for you by `DirectCommsChannel` (below).
- **Groups**: every decoration belongs to a `group` (an arbitrary string you choose — `"tts"`, `"search-results"`, `"annotations"`, etc). `applyDecorations` replaces *all* decorations for one group at a time, diffing against that group's previous state. Separate groups don't interfere with each other, and each can independently opt into activation (tap/click) and hover tracking depending on which callbacks its `DecorationObserver` declares.
- **Locators**: each decoration's `locator` is a `Locator` instance from `@readium/shared`, identifying the text range (or other target) to decorate within a resource.

## Usage

```ts
import { Locator, LocatorLocations } from "@readium/shared";
import { DirectCommsChannel, Decorator, DecorationController, DecorationStyleType } from "@readium/decorator";

// 1. Create the comms channel
const channel = new DirectCommsChannel();

// 2. Mount the Decorator module on the page
const decorator = new Decorator();
decorator.mount(window, channel.frame);

// 3. Create the controller
const ctrl = new DecorationController(channel.host);

// 4. Check style support before applying (TextColor requires the CSS Highlight API)
if (ctrl.supportsDecorationStyle(DecorationStyleType.TextColor)) {
    // safe to use
}

// 5. Apply decorations — call again with a new array to update, empty array to clear
const locator = new Locator({
    href: "chapter1.xhtml",
    type: "application/xhtml+xml",
    locations: new LocatorLocations({ /* e.g. fragments, progression, ... */ }),
});
ctrl.applyDecorations([
    {
        id: "tts-0",
        locator,
        style: { type: DecorationStyleType.Highlight, tint: "#FFFF00" },
    }
], "tts");

// 6. Cleanup
decorator.unmount(window, channel.frame);
ctrl.destroy();
channel.frame.destroy();
```

## API

### `DecorationController`

```ts
class DecorationController {
    constructor(host: DirectCommsHost, config?: DecorationControllerConfig)

    // Returns true if the given style ID can be rendered.
    // Returns false for TextColor when the CSS Highlight API is unavailable.
    // Returns true for any ID registered in config.decorationTemplates.
    supportsDecorationStyle(styleTypeId: string): boolean

    // Replaces all decorations for a group. Diffs against previous state.
    applyDecorations(decorations: Decoration[], group: string): void

    // Registers an observer for a group.
    // Activation is enabled for the group only when the observer declares onDecorationActivated.
    // Hover tracking is enabled when the observer declares onDecorationPointerEnter or onDecorationPointerLeave.
    registerDecorationObserver(group: string, observer: DecorationObserver): void
    unregisterDecorationObserver(observer: DecorationObserver): void

    destroy(): void
}

interface DecorationControllerConfig {
    // Named style templates. Register a template here and reference it by ID in decoration styles.
    decorationTemplates?: Record<string, HTMLDecorationTemplate>;
}
```

### `DecorationObserver`

```ts
interface DecorationObserver {
    // Called when a decoration is tapped/clicked. Return true to consume the event.
    // Activation is enabled for the group only when this method is declared.
    onDecorationActivated?(event: OnDecorationActivatedEvent): boolean;

    // Called when the pointer enters a decoration.
    // Registering either hover method automatically enables hover tracking for the group.
    onDecorationPointerEnter?(event: OnDecorationPointerEnterEvent): void;

    // Called when the pointer leaves a decoration.
    // rect is absent if the decoration was removed from the DOM before leave fired.
    // point is the current pointer position at the moment of leave.
    onDecorationPointerLeave?(event: OnDecorationPointerLeaveEvent): void;
}
```

### `DirectCommsChannel`

Connects the `DecorationController` to the `Decorator` module in the same JS context (e.g. controller and renderer sharing one `window`). For a controller and renderer split across a real iframe boundary, implement `IComms` yourself (e.g. over `postMessage`) instead.

```ts
const channel = new DirectCommsChannel();
channel.frame  // pass to Decorator.mount
channel.host   // pass to DecorationController constructor
```

### `Decorator`

Mounts and unmounts the decoration renderer on a `Window`/document.

```ts
class Decorator {
    mount(wnd: Window, comms: IComms): boolean
    unmount(wnd: Window, comms: IComms): boolean
}
```

### `IComms`

The message-passing interface between a `DecorationController` (host side) and a `Decorator` (frame side). `DirectCommsChannel` implements this for you when both sides share a JS context; implement it yourself over `postMessage` when the renderer lives in a real iframe.

```ts
interface IComms {
    // Registers a callback for one or more command keys, scoped to a module name.
    register(key: string | string[], module: string, callback: (data: unknown, ack: (ok: boolean) => void) => void): void
    unregister(key: string | string[], module: string): void
    unregisterAll(module: string): void

    // Sends an event with a payload. The receiving side dispatches it to matching register()'d callbacks.
    send(key: string, data: unknown): void

    log(...data: unknown[]): void
    readonly ready: boolean
    destroy(): void
}
```

## Types

| Name | Notes |
|------|-------|
| `Decoration` | `{ id, locator, style, extras? }` — `locator` is a `Locator` from `@readium/shared` |
| `DecorationStyle` | `BuiltinDecorationStyle \| HTMLDecorationTemplate \| NamedDecorationStyle` |
| `BuiltinDecorationStyle` | `{ type?, tint?, layout?, width?, enforceContrast?, expand? }` |
| `HTMLDecorationTemplate` | `{ type: "template", layout, width, element, stylesheet? }` — `element` is a function `(decoration) => string`, resolved to HTML per decoration before rendering |
| `NamedDecorationStyle` | `{ type: string }` — reference to a style registered in `DecoratorConfig.decorationTemplates` |
| `DecoratorConfig` | `{ decorationTemplates? }` — same shape as `DecorationControllerConfig` (the latter is a type alias of this) |
| `DecorationStyleType` | `"highlight" \| "highlightUnderline" \| "underline" \| "strikethrough" \| "outline" \| "textColor" \| "mask" \| "template"` |
| `DecorationLayout` | `"boxes" \| "bounds"` |
| `DecorationWidth` | `"wrap" \| "viewport" \| "bounds" \| "page"` |
| `DecorationObserver` | `{ onDecorationActivated?, onDecorationPointerEnter?, onDecorationPointerLeave? }` |
| `OnDecorationActivatedEvent` | `{ decoration, group, rect, point }` |
| `OnDecorationPointerEnterEvent` | `{ decoration, group, rect, point }` |
| `OnDecorationPointerLeaveEvent` | `{ decoration, group, rect?, point? }` — rect absent if decoration removed from DOM before leave fired |
| `IComms` | Interface for the comms channel module side — see [`IComms`](#icomms) above |
