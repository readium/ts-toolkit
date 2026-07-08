# Decorations

`EpubNavigator` implements `DecorableNavigator`, which lets you visually annotate text in a publication — highlights, underlines, search results, TTS position indicators, and anything else that needs to sit on top of content.

The API is defined by [Readium Architecture RFC 008](https://readium.org/architecture/proposals/008-decorator-api.html).

## Concepts

### Decoration

A `Decoration` marks a single location in a publication with a visual style:

```ts
interface Decoration {
  id: string;                           // Must be unique within its group
  locator: Locator;                     // Where in the publication to render
  style: DecorationStyle;               // How it looks
  extras?: Record<string, unknown>;     // App-specific data (passed back on activation)
}
```

### DecorationStyle

`DecorationStyle` is a union of the built-in style types and `HTMLDecorationTemplate`:

```ts
type DecorationStyle = BuiltinDecorationStyle | HTMLDecorationTemplate;
```

#### BuiltinDecorationStyle

```ts
interface BuiltinDecorationStyle {
  type?: DecorationStyleType;   // Defaults to Highlight when omitted
  tint?: string;                // Any CSS color — "#ffff00", "rgba(255,200,0,0.4)", etc.
  layout?: DecorationLayout;    // Defaults to Boxes
  width?: DecorationWidth;      // Defaults to Wrap
  isActive?: boolean;           // Set to true to allow the user to click/tap this decoration
  enforceContrast?: boolean;    // When true (default), tint is adjusted for contrast against the background
}
```

**`DecorationStyleType`**

| Value | Description |
|---|---|
| `DecorationStyleType.Highlight` | Background-color overlay (default). |
| `DecorationStyleType.Underline` | Line drawn beneath the text. |
| `DecorationStyleType.Outline` | Border drawn around each text box. |
| `DecorationStyleType.TextColor` | Changes the text color directly. Requires CSS Highlight API; invisible in older browsers. **Note**: Due to CSS Highlight API limitations, viewport width behaves as wrap (fits text exactly) instead of stretching to full viewport width. Page and Bounds widths are supported for TextColor. **Vertical Writing**: Due to known browser bugs with `caretPositionFromPoint()` in vertical writing modes, bounds/page width falls back to wrap behavior to ensure reliability. |
| `DecorationStyleType.Mask` | Dims everything outside the selection rects. Use `width: Page` for block-level behavior. |
| `DecorationStyleType.Template` | Custom HTML template (see `HTMLDecorationTemplate`). |

**`DecorationLayout`**

| Value | Description |
|---|---|
| `DecorationLayout.Boxes` | One element per CSS border box (i.e. per line of text). Default. |
| `DecorationLayout.Bounds` | A single element covering the bounding box of the whole range. |

**`DecorationWidth`**

| Value | Description |
|---|---|
| `DecorationWidth.Wrap` | Fits the text exactly (default). |
| `DecorationWidth.Viewport` | Stretches to the full viewport width. **Note**: Works as expected for Highlight, Underline, and Outline styles. For TextColor, viewport behaves as wrap due to CSS Highlight API limitations. Page and Bounds widths are supported for TextColor. |
| `DecorationWidth.Page` | Fills the anchor page, useful for dual-page layouts. |
| `DecorationWidth.Bounds` | Fills the bounding region of all CSS border boxes. |

#### HTMLDecorationTemplate

For fully custom decoration rendering, use `HTMLDecorationTemplate`. The `element` function is called once per decoration to generate the HTML snippet that is sanitized before injection; the `stylesheet` is injected as a `<style>` element scoped to the decoration group.

```ts
interface HTMLDecorationTemplate {
  type: DecorationStyleType.Template;
  layout: DecorationLayout;                        // Required
  width: DecorationWidth;                          // Required
  element: (decoration: Decoration) => string;     // Returns an HTML snippet for each decoration
  stylesheet?: string;                             // CSS injected into the resource
  isActive?: boolean;
}
```

Because `element` receives the full `Decoration` object, the generated HTML can vary per-decoration — for example to embed the decoration's tint color or extra data as an inline style or attribute. The returned HTML is cloned once per positioned box (or once for `Bounds` layout). Use CSS classes and the injected `stylesheet` to style the elements. Prefix all class names and IDs with your app name to avoid conflicts — `r2-` and `readium-` are reserved.

> **Security** — The HTML returned by `element` is sanitized through an allowlist before injection. Script elements, event-handler attributes (`on*`), and `javascript:`/`data:` URLs are always stripped.

### Groups

Every decoration belongs to a named group. Groups let you manage unrelated sets of decorations independently — for example `"search"`, `"highlights"`, and `"tts"` can coexist without interfering with each other.

Decoration IDs must be **unique within their group**, but the same ID can appear in different groups.

## Applying Decorations

Call `applyDecorations` with the **complete desired state** for a group. The navigator diffs the new list against the previous one and sends only the necessary add / update / remove commands to the rendered frames.

```ts
import { Decoration, DecorationLayout, DecorationStyleType, DecorationWidth } from "@readium/navigator";

const highlights: Decoration[] = [
  {
    id: "highlight-1",
    locator: myLocator,
    style: {
      type: DecorationStyleType.Highlight,
      tint: "#ffff00",
    },
  },
];

navigator.applyDecorations(highlights, "user-highlights");
```

To update, simply call `applyDecorations` again with the new state:

```ts
navigator.applyDecorations([
  { id: "highlight-1", locator: locator1, style: { type: DecorationStyleType.Highlight, tint: "#90ee90" } },
  { id: "highlight-2", locator: locator2, style: { type: DecorationStyleType.Underline, tint: "#ffb6c1" } },
], "user-highlights");
```

To remove all decorations from a group, pass an empty array:

```ts
navigator.applyDecorations([], "user-highlights");
```

Decorations are **automatically reapplied** when the navigator loads a new resource (including after navigating away and back), so you do not need to call `applyDecorations` again on navigation.

## Checking DecorationStyle Support

Before enabling a feature that relies on a specific style, you can verify the navigator supports it by passing the style type ID:

```ts
if (navigator.supportsDecorationStyle(DecorationStyleType.Highlight)) {
  // safe to apply
}
```

For custom registered styles (see [Custom Named Styles](#custom-named-styles) below), pass the registered ID:

```ts
if (navigator.supportsDecorationStyle("app-sidemark")) {
  // safe to apply
}
```

`EpubNavigator` returns `true` for all built-in types and for any ID registered in `DecoratorConfig.decorationTemplates`. This method is mainly useful for navigator-agnostic code that may run against non-HTML navigators.

**Note**: While TextColor is supported, it has limitations with viewport width due to CSS Highlight API constraints. Page and Bounds widths are supported for TextColor. Use other decoration styles if viewport behavior is required.

## Activation (Click / Tap)

To make a decoration respond to user interaction, set `isActive: true` in its style and register a `DecorationObserver` for the group.

```ts
import { DecorationObserver, DecorationActivationEvent } from "@readium/navigator";

const highlightObserver: DecorationObserver = {
  onDecorationActivated(event: DecorationActivationEvent): boolean {
    console.log("Decoration tapped:", event.decoration.id);
    console.log("Group:", event.group);
    console.log("Bounding rect (navigator coords):", event.rect);
    console.log("Tap point (navigator coords):", event.point);
    console.log("App data:", event.decoration.extras);

    // Return true to indicate you handled the event.
    // This suppresses the default tap/click navigation (page turn, miscPointer, etc.).
    return true;
  },
};

navigator.registerDecorationObserver("user-highlights", highlightObserver);
```

Then create the decoration with `isActive: true`:

```ts
navigator.applyDecorations([
  {
    id: "highlight-1",
    locator: myLocator,
    style: {
      type: DecorationStyleType.Highlight,
      tint: "#ffff00",
      isActive: true,        // ← required for activation events
    },
    extras: { noteId: "note-42" },  // ← passed through to DecorationActivationEvent
  },
], "user-highlights");
```

### `DecorationActivationEvent`

```ts
interface DecorationActivationEvent {
  decoration: Decoration;   // The full decoration that was activated
  group: string;            // The group it belongs to
  rect?: {                  // Bounding rect in navigator container coordinates
    top: number;
    left: number;
    width: number;
    height: number;
  };
  point?: {                 // Tap/click point in navigator container coordinates
    x: number;
    y: number;
  };
}
```

`rect` and `point` are in CSS pixels relative to the navigator's container element — you can use them to position a popover:

```ts
onDecorationActivated(event: DecorationActivationEvent): boolean {
  if (!event.rect) return false;

  showPopover({
    content: lookupNote(event.decoration.extras?.noteId as string),
    anchorRect: event.rect,
  });

  return true;
}
```

### Return value

Returning `true` from `onDecorationActivated` tells the navigator that you handled the event. The navigator will **not** process the tap/click further — no page turn, no `miscPointer`, no `tap`/`click` listener call.

Returning `false` (or not having a registered observer) lets the tap/click fall through to normal navigation.

### Unregistering an observer

```ts
navigator.unregisterDecorationObserver(highlightObserver);
```

This removes the observer from **all** groups it was registered in.

## Complete Example — User Highlights

```ts
import {
  EpubNavigator,
  Decoration,
  DecorationObserver,
  DecorationActivationEvent,
  DecorationLayout,
  DecorationStyleType,
  DecorationWidth,
} from "@readium/navigator";

// 1. Keep your highlights in application state
let highlights: Decoration[] = [];

function syncHighlights() {
  navigator.applyDecorations(highlights, "highlights");
}

// 2. Register an observer before or after load
const observer: DecorationObserver = {
  onDecorationActivated(event: DecorationActivationEvent): boolean {
    const noteId = event.decoration.extras?.noteId as string | undefined;
    if (noteId && event.rect) {
      showNotePopover(noteId, event.rect);
      return true;
    }
    return false;
  },
};

navigator.registerDecorationObserver("highlights", observer);

// 3. Add a highlight (e.g. from a user selection)
function addHighlight(locator: Locator, color: string, noteId: string) {
  highlights = [
    ...highlights,
    {
      id: crypto.randomUUID(),
      locator,
      style: {
        type: DecorationStyleType.Highlight,
        tint: color,
        isActive: true,
      },
      extras: { noteId },
    },
  ];
  syncHighlights();
}

// 4. Remove a highlight
function removeHighlight(id: string) {
  highlights = highlights.filter(h => h.id !== id);
  syncHighlights();
}

// 5. Clean up when done
navigator.unregisterDecorationObserver(observer);
await navigator.destroy();
```

## Complete Example — Search Results

Search results are a good example of non-activatable decorations managed alongside activatable ones.

```ts
import { Decoration, DecorationStyleType } from "@readium/navigator";

function applySearchResults(locators: Locator[], currentMatchId: string) {
  const decorations: Decoration[] = locators.map((locator, i) => ({
    id: `match-${i}`,
    locator,
    style: {
      type: DecorationStyleType.Highlight,
      tint: `match-${i}` === currentMatchId ? "#ff8c00" : "#ffff99",
    },
  }));

  navigator.applyDecorations(decorations, "search");
}

function clearSearch() {
  navigator.applyDecorations([], "search");
}
```

Because `isActive` is not set, tapping a search result falls through to normal navigation — no observer needed.

## Complete Example — Custom Template (Sidemark)

`HTMLDecorationTemplate` lets you supply your own HTML and CSS for a decoration. The `element` function receives the full `Decoration` so it can embed per-decoration data (here, the tint color stored in `extras`). This example renders a colored sidebar mark next to each decorated paragraph.

```ts
import { Decoration, DecorationLayout, DecorationStyleType, DecorationWidth } from "@readium/navigator";

const SIDEMARK_CSS = `
  .app-sidemark {
    position: absolute;
    width: 4px;
    border-radius: 2px;
    background-color: var(--app-tint, blue);
    margin-left: -12px;
  }
  [dir=rtl] .app-sidemark {
    margin-left: 0;
    margin-right: -12px;
  }
`;

function sidemarkDecoration(id: string, locator: Locator, color: string): Decoration {
  return {
    id,
    locator,
    extras: { color },
    style: {
      type: DecorationStyleType.Template,
      layout: DecorationLayout.Bounds,
      width: DecorationWidth.Wrap,
      element: (decoration) => {
        const tint = (decoration.extras?.color as string | undefined) ?? "blue";
        return `<div class="app-sidemark" style="--app-tint: ${tint}"></div>`;
      },
      stylesheet: SIDEMARK_CSS,
    },
  };
}

navigator.applyDecorations(
  [sidemarkDecoration("mark-1", myLocator, "#4a90e2")],
  "sidemarks"
);
```

> Prefix all class names and IDs with your app name. `r2-` and `readium-` are reserved by the toolkit.

## Custom Named Styles

For styles you apply across many decorations, repeating the full `HTMLDecorationTemplate` inline in every `Decoration` object is verbose. You can instead register named styles in the navigator configuration and reference them by ID.

### Registering a style

Pass a `decoratorConfig` when constructing the navigator:

```ts
import { EpubNavigator, DecorationLayout, DecorationWidth } from "@readium/navigator";

const SIDEMARK_CSS = `...`;

const navigator = new EpubNavigator(container, publication, listeners, positions, undefined, {
  preferences: {},
  defaults: {},
  decoratorConfig: {
    decorationTemplates: {
      "app-sidemark": {
        type: "template",
        layout: DecorationLayout.Bounds,
        width: DecorationWidth.Wrap,
        element: (decoration) => {
          const tint = (decoration.extras?.color as string | undefined) ?? "blue";
          return `<div class="app-sidemark" style="--app-tint: ${tint}"></div>`;
        },
        stylesheet: SIDEMARK_CSS,
      },
    },
  },
});
```

### Using a registered style

Reference the registered ID in `style.type`. The navigator resolves the template automatically before sending the decoration to the iframe:

```ts
function sidemarkDecoration(id: string, locator: Locator, color: string): Decoration {
  return {
    id,
    locator,
    extras: { color },
    style: { type: "app-sidemark" },
  };
}

navigator.applyDecorations(
  [sidemarkDecoration("mark-1", myLocator, "#4a90e2")],
  "sidemarks"
);
```

### When to use each approach

| | Inline `HTMLDecorationTemplate` | Registered named style |
|---|---|---|
| Template defined | Per decoration | Once at navigator init |
| Best for | One-off or rare styles | Styles reused across many decorations |
| `supportsDecorationStyle` | Always true | Checks the registry |
