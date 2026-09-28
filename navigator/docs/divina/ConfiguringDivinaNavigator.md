# Configuring the DivinaNavigator

The Readium Navigator can be configured dynamically, as it implements the `Configurable` interface.

## Overview

You cannot directly overwrite the Navigator settings. Instead, you submit a set of Preferences to the Navigator, which will then recalculate its settings and update the presentation.

```js
// 1. Create a set of preferences.
const preferences = {
  scrolled: true,
  stripWidth: 800
}

// 2. Submit the preferences, the Navigator will update its settings and the presentation.
navigator.submitPreferences(preferences)
```

Switching between paged and scrolled mode keeps the current position.

## Editing Preferences

`DivinaNavigator` offers a `PreferencesEditor`, which includes rules for adjusting preferences, such as the supported values or ranges.

```js
// 1. Create a preferences editor.
const editor = navigator.preferencesEditor;

// 2. Modify the preferences through the editor.
editor.backgroundColor.value = "#000000";
editor.spreads.toggle();
editor.stripWidth.increment();

// 3. Submit the edited preferences
navigator.submitPreferences(editor.preferences)
```

## Inactive settings

A setting may be inactive if its activation conditions are not met. The Navigator will ignore inactive settings when updating its presentation.

You can check if a setting is effective using the PreferencesEditor:

```js
const editor = navigator.preferencesEditor;
editor.spreads.isEffective
```

## Setting the initial Navigator preferences and app defaults

When opening a publication, you can immediately apply the user preferences by providing them to the `DivinaNavigator` constructor.

```js
const navigator = new DivinaNavigator(
  container,
  publication,
  listeners,
  positions,
  initialPosition,
  {
    preferences: {
      spreads: false
    },
    defaults: {
      backgroundColor: "#1a1a1a",
      stripWidth: 900
    }
  }
);
```

The `defaults` are used as fallback values when the default Navigator settings are not suitable for your application.

## Appendix: Preferences

Depending on whether the publication is displayed paged or scrolled (its `layout`, or the `scrolled` preference), the following preferences apply:

| Preference      | Paged | Scrolled |
| --------------- | ----- | -------- |
| backgroundColor | ✅    | ✅       |
| constraint      | ✅    | ✅       |
| quality         | ✅    | ✅       |
| scrolled        | ✅    | ✅       |
| spreads         | ✅    |          |
| stripWidth      |       | ✅       |

### backgroundColor

The color behind the pages. The scrollbar colors are adjusted to match it.

### constraint

The number of pixels to remove from the container width, e.g. for docked panels.

### quality

Picks an image when a page provides alternate resolutions (`alternate` links with `width` and `height`):

- `auto`: the smallest image that covers the display size.
- `low`: the smallest image.
- `high`: one step above `auto`.
- `max`: the largest image.

On iOS and Android devices, images are capped to limit memory use.

### scrolled

Displays the publication as a vertical strip instead of horizontal pages. It has no effect on publications declaring `layout: scrolled`, which are always scrolled.

### spreads

Displays two pages side by side when the container is wider than it is tall. Spreads follow the `page` (left, right, center) properties of the reading order links when present. Landscape pages and `center` pages are displayed on their own.

### stripWidth

The maximum width, in pixels, of the strip in scrolled mode.
