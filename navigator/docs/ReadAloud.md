# Read Aloud

`ReadAloudNavigator` reads a publication aloud with a [`@readium/speech`](https://github.com/readium/speech) engine, alongside the navigator displaying it. The utterance and the word being spoken are highlighted, and the navigator follows them, turning pages as needed.

## Creating a ReadAloudNavigator

It takes the navigator displaying the publication, an `EpubNavigator`, `WebPubNavigator` or `DivinaNavigator`, once loaded.

```ts
import { WebSpeechEngine } from "@readium/speech";
import { EpubNavigator, ReadAloudNavigator, ReadAloudPreferences } from "@readium/navigator";

const navigator = new EpubNavigator(container, publication, listeners, positions);
await navigator.load();

const readAloud = new ReadAloudNavigator(navigator, new WebSpeechEngine(), {
  stateChanged: (state) => {},
  utteranceChanged: ({ text, locators }) => {},
  wordChanged: (locator, word) => {},
  error: (error) => {}
}, {
  preferences: { rate: 1.2 },
  defaults: { autoPause: "page" }
});
```

An utterance can run across several resources, for instance a sentence continuing on the next page of a fixed layout, so `utteranceChanged` receives one locator per resource.

The publication is read in units, one after the other, and what is highlighted depends on the navigator:

| Navigator | Read | Highlighting | Following |
|---|---|---|---|
| `EpubNavigator`, reflowable | One resource at a time | Utterance and word | Pages turned as needed |
| `EpubNavigator`, fixed layout | The whole publication, so sentences continue across pages | Utterance and word, on every page they're on | Pages turned as needed |
| `WebPubNavigator` | One resource at a time | Utterance and word | Pages turned as needed |
| `DivinaNavigator` | One page at a time | None | Page by page |

The `scope` configuration overrides how the publication is split, with `"publication"` or `"resource"`.

## Playback

```ts
await readAloud.play();        // From the navigator's current position, or resumes when paused
await readAloud.play(locator); // From a given locator
readAloud.pause();
readAloud.stop();
await readAloud.next();        // Next utterance
await readAloud.previous();    // Previous utterance
readAloud.state;               // "idle" | "loading" | "ready" | "playing" | "paused"
await readAloud.destroy();
```

Voices are listed and set with `getVoices()`, `setVoice()` and `getCurrentVoice()`.

## Preferences

`ReadAloudNavigator` follows the same preferences API as the navigators, with `submitPreferences()`, `settings` and `preferencesEditor`.

```ts
await readAloud.submitPreferences(new ReadAloudPreferences({
  rate: 1.5,
  autoPause: "spread",
  utteranceStyle: { type: "highlight", tint: "#ffeb3b80" },
  wordStyle: false
}));
```

It has the preferences of `@readium/speech` (`rate`, `pitch`, `volume`, `verbosity`, `segmentation`, etc.), plus:

- `autoPause`: in addition to speech's `"none"`, `"utterance"` and `"block"`, `"page"` pauses before the first utterance starting on another page, and `"spread"` before the first one starting outside the displayed spread. Reflowable publications have no pages to tell apart, so both pause at the next resource.
- `utteranceStyle` and `wordStyle`: the [decoration style](./epub/Decorations.md) of the utterance and the word being spoken, `false` to not decorate them. A custom template is used by registering it in the `EpubNavigator` or `WebPubNavigator` configuration's `decoratorConfig.decorationTemplates` and referencing it by name, e.g. `{ type: "myTemplate" }`.

Decorations are applied in the `readaloud-utterance` and `readaloud-word` groups.

By default, sentences are reconstructed across elements and pages (`segmentation: "sentence"`). With `"structure"`, every element is read on its own.

## Where the text comes from

For each resource, the publication's [Guided Navigation](https://github.com/readium/guided-navigation) document is used when every object with text can be located in the resource. Otherwise, one is generated from the resource's markup. Either way, the text is the resource's as published, not as modified by its scripts.

Divina has no markup, so it's only read when the publication has a Guided Navigation document.

You can provide your own `GuidedNavigationSource` with the `source` configuration.
