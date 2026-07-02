# @readium/decorator

Renders visual annotations over text ranges on a page — highlights, underlines, strikethroughs, and more.

## Installation

```ts
import { DirectCommsChannel, Decorator, DecorationController, DecorationStyleType } from "@readium/decorator";
```

## Usage

```ts
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
ctrl.applyDecorations([
    {
        id: "tts-0",
        locator: /* Locator for the text range to decorate */,
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

Connects the `DecorationController` to the `Decorator` module in the same process.

```ts
const channel = new DirectCommsChannel();
channel.frame  // pass to Decorator.mount
channel.host   // pass to DecorationController constructor
```

### `Decorator`

Mounts and unmounts the decoration renderer on a page.

```ts
class Decorator {
    mount(wnd: Window, comms: IComms): boolean
    unmount(wnd: Window, comms: IComms): boolean
}
```

## Types

| Name | Notes |
|------|-------|
| `Decoration` | `{ id, locator, style, extras? }` |
| `DecorationStyle` | `BuiltinDecorationStyle \| HTMLDecorationTemplate \| NamedDecorationStyle` |
| `BuiltinDecorationStyle` | `{ type?, tint?, layout?, width?, enforceContrast?, expand? }` |
| `HTMLDecorationTemplate` | `{ type: "template", layout, width, element, stylesheet? }` — `element` is a function `(decoration) => string`, resolved to HTML per decoration before rendering |
| `NamedDecorationStyle` | `{ type: string }` — reference to a style registered in `DecorationControllerConfig.decorationTemplates` |
| `DecorationStyleType` | `"highlight" \| "highlightUnderline" \| "underline" \| "strikethrough" \| "outline" \| "textColor" \| "mask" \| "template"` |
| `DecorationLayout` | `"boxes" \| "bounds"` |
| `DecorationWidth` | `"wrap" \| "viewport" \| "bounds" \| "page"` |
| `DecorationObserver` | `{ onDecorationActivated?, onDecorationPointerEnter?, onDecorationPointerLeave? }` |
| `OnDecorationActivatedEvent` | `{ decoration, group, rect, point }` |
| `OnDecorationPointerEnterEvent` | `{ decoration, group, rect, point }` |
| `OnDecorationPointerLeaveEvent` | `{ decoration, group, rect?, point? }` — rect absent if decoration removed from DOM before leave fired |
| `IComms` | Interface for the comms channel module side |
