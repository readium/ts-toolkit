# Read Aloud

`ReadAloudNavigator` reads a publication aloud with a [`@readium/speech`](https://github.com/readium/speech) engine, alongside the navigator displaying it. The utterance and the word being spoken are highlighted, and the navigator follows them, turning pages as needed.

## Creating a ReadAloudNavigator

It takes the navigator displaying the publication, an `EpubNavigator`, `WebPubNavigator` or `DivinaNavigator`, once loaded.

```ts
import { EpubNavigator, ReadAloudNavigator, ReadAloudPreferences } from "@readium/navigator";

const navigator = new EpubNavigator(container, publication, listeners, positions);
await navigator.load();

const readAloud = new ReadAloudNavigator(navigator, {
  stateChanged: (state) => {},
  utteranceChanged: ({ text, locators }) => {},
  wordChanged: (locator, word) => {},
  error: (error) => {}
}, {
  preferences: { rate: 1.2 },
  defaults: { autoPause: "page" }
});
```

It speaks with `@readium/speech`'s `WebSpeechEngine`, with the voices of the publication's languages.

An utterance can run across several resources, for instance a sentence continuing on the next page of a fixed layout, so `utteranceChanged` receives one locator per resource.

What is read at once, and what is highlighted, depends on the navigator:

| Navigator | Read | Highlighting | Following |
|---|---|---|---|
| `EpubNavigator`, reflowable | One resource at a time | Utterance and word | Pages turned as needed |
| `EpubNavigator`, fixed layout | The displayed spread, then the next one, so sentences continue across its pages but are split at its edges | Utterance and word, on every page they're on | Spreads turned as needed |
| `WebPubNavigator` | One resource at a time | Utterance and word | Pages turned as needed |
| `DivinaNavigator` | One page at a time | None | Page by page |

## Using another engine

Any `ReadiumSpeechPlaybackEngine` can be given in the `engine` configuration, for instance a `SpeechServerEngine` speaking with a [Readium Speech Server](https://github.com/readium/speech-server):

```ts
import { SpeechServerEngine } from "@readium/speech";

const readAloud = new ReadAloudNavigator(navigator, listeners, {
  engine: new SpeechServerEngine({
    endpoints: {
      voices: "https://example.com/voices",
      synthesize: "https://example.com/synthesize",
      service: "https://example.com/service"
    }
  })
});
```

The engine is used as given: its voices aren't limited to the publication's languages. See [`@readium/speech`](https://github.com/readium/speech)'s documentation for its engines and their options, including falling back from one to another.

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

### Reading from a click or tap

`readFromPointer(event)` starts reading from the utterance under a click or tap in a displayed resource. Call it from the navigator's `tap` and `click` listeners while reading aloud is on. It loads the pressed resource when it isn't the one being read, for instance after pausing and turning pages.

It resolves `false`, leaving playback untouched, when the press is on a link or another interactive element, on empty space, or on content that isn't read aloud. Handle the event as usual then:

```ts
const onPointer = async (event: FrameClickEvent) => {
  if (readAloudIsOn && await readAloud.readFromPointer(event)) return;
  handleTapClick(event); // Your own handling, e.g. turning pages
};

const listeners: EpubNavigatorListeners = {
  ...
  tap: (event) => { onPointer(event); return true; },
  click: (event) => { onPointer(event); return true; },
  ...
};
```

As `readFromPointer` is asynchronous, the listeners return `true` and handle page turns themselves. It is supported by `EpubNavigator` and `WebPubNavigator`.

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

- `autoPause`: in addition to speech's `"none"`, `"utterance"` and `"block"`, `"page"` pauses on reaching another page, and `"spread"` on reaching another spread, with the first utterance there highlighted. In reflowable publications, `"page"` pauses on reaching the next set of columns or the next resource, and `"spread"` doesn't apply. Neither has an effect when scrolled.
- `speakInContentLanguage`: whether an utterance in another language than the selected voice's is spoken with a voice of its own language, `false` by default. It has no effect when `language` is `"none"`.
- `utteranceStyle` and `wordStyle`: the [decoration style](./epub/Decorations.md) of the utterance and the word being spoken, `false` to not decorate them. A custom template is used by registering it in the `EpubNavigator` or `WebPubNavigator` configuration's `decoratorConfig.decorationTemplates` and referencing it by name, e.g. `{ type: "myTemplate" }`.

Decorations are applied in the `readaloud-utterance` and `readaloud-word` groups.

By default, sentences are reconstructed across elements and pages (`segmentation: "sentence"`). With `"structure"`, every element is read on its own.

## Where the text comes from

For each resource, the publication's [Guided Navigation](https://github.com/readium/guided-navigation) document is used when every object with text can be located in the resource. Otherwise, one is generated from the resource's markup. Either way, the text is the resource's as published, not as modified by its scripts.

Divina has no markup, so it's only read when the publication has a Guided Navigation document.

To always generate it from the markup, give a `PublicationGuidedNavigationProvider` with `generateFromMarkup` in the `provider` configuration. Divina then has nothing to read.

```ts
import { PublicationGuidedNavigationProvider } from "@readium/navigator";

const readAloud = new ReadAloudNavigator(navigator, listeners, {
  provider: new PublicationGuidedNavigationProvider(publication, { generateFromMarkup: true })
});
```

You can also provide your own `GuidedNavigationProvider` in the `provider` configuration.
