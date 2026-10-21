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

The word is highlighted, and `wordChanged` called, only with voices `@readium/speech` lists as reporting word boundaries. Voices listed without them may still report some, but unreliably, so they're ignored, and pages are turned by timing the speech instead.

When scrolled, the text is followed once it goes under the `scrollPaddingTop` or `scrollPaddingBottom` of `EpubNavigator`, so set them to the height of the UI overlaying the content.

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

Voices are listed with `getVoices()`, and set with the `voice` preference. `getLanguages()` lists the base languages voices can be had in, for instance to pick a `languageOverride`: with the default engine, those of every voice of the browser, without loading the voices of languages other than the publication's. `getPublicationLanguages()` returns the publication's languages as voices are loaded for them, with `languageOverride` in place of the primary one.

### Reading from a click or tap

`readFromPointer(event)` starts reading from the utterance under a click or tap in a displayed resource. Call it from the navigator's `tap` and `click` listeners while reading aloud is on. It loads the pressed resource when it isn't the one being read, for instance after pausing and turning pages.

It resolves `false`, leaving playback untouched, when the `readFromPointer` preference is off, or the press is on a link or another interactive element, on empty space, or on content that isn't read aloud. Handle the event as usual then:

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

### Moving away while reading

By default, the reader can scroll, turn pages or follow links while reading aloud. The navigator then stops following the spoken text until the reader is back on it, or plays, moves to the next or previous utterance, or reads from a click or tap. In fixed layouts, reading goes on one page at a time without turning pages.

`readAloud.detached` tells whether the reader moved away, and the `detachedChanged` listener reports it. To offer a way back, call `readAloud.reattach()`: it goes to the spoken text and follows it again, without changing whether it's playing or paused.

```ts
const readAloud = new ReadAloudNavigator(navigator, {
  detachedChanged: detached => backButton.hidden = !detached,
});
backButton.onclick = () => readAloud.reattach();
```

With the `detachable` preference set to `false`, the reader can't move away while playing: scrolling, swiping, tapping the edges and following links in the content are locked, and unlocked when paused or stopped. Read aloud still turns pages, and taps and clicks are still reported. Your own navigation, such as a table of contents or page buttons, isn't locked: check `readAloud.detachable` to disable it while playing. Changing it applies right away, also while playing. It is supported by `EpubNavigator` and `WebPubNavigator`.

```ts
const readAloud = new ReadAloudNavigator(navigator, listeners, { defaults: { detachable: false } });
```

### Keeping the screen awake

While playing, `ReadAloudNavigator` requests a screen wake lock, where the browser grants one, and releases it when paused or stopped. If your app manages the screen itself, disable it with `keepAwake: false`.

```ts
const readAloud = new ReadAloudNavigator(navigator, listeners, { keepAwake: false });
```

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

- `autoPause`: in addition to speech's `"none"`, `"utterance"` and `"block"`, `"page"` pauses on reaching another page, and `"spread"` on reaching another spread, with the first utterance there highlighted. In reflowable publications, `"page"` pauses on reaching the next set of columns or the next resource, and `"spread"` doesn't apply. Neither has an effect when scrolled. In fixed-layout publications, with any value but `"none"`, playback pauses before reaching a page that isn't displayed, without turning to it, and resumes once the reader turns to the next page or spread. Other moves leave it paused. With one page displayed, `"spread"` pauses at every page, as `"page"` does. After any auto-pause, `next()` and `previous()` resume playback, `next()` from the highlighted utterance when it hasn't been spoken yet; after `pause()`, they stay paused.
- `voice`: a voice id (`getVoiceId(voice)`: a voice's `voiceURI`, or `identifier` for a server voice) for all content, or one per language, e.g. `{ en: "…", fr: "…" }`. Content in a language without one is spoken with the engine's voice, which `settings.voice` falls back to, as in `@readium/speech`: unset or a record without the engine voice's language, it gets an entry for it, e.g. `{ en: "…" }`, so submitting it back keeps other languages following their own. The default engine picks its voice in the publication's language, so the publication's voice is always `settings.voice`'s entry for the publication's language.
- `languageOverride`: the BCP 47 tag of the language the publication is actually in, when its metadata's primary language is wrong, `null` by default. Content in the metadata's primary language is spoken in it instead, and the voices, their `getVoices()` ranking and the default voice follow it. Content in other languages is left as is.
- `startInViewport`: whether `play()` without a locator, when idle, starts at the first utterance starting in view rather than at the start of the resource, `false` by default. When none starts in view, it starts at the one going on at the top. It has no effect in fixed-layout publications.
- `keepCentered`: whether, when scrolled, the spoken line is kept in the middle of the frame rather than followed once it goes out of view, `false` by default.
- `detachable`: whether the reader can move away while reading aloud, `true` by default. See [Moving away while reading](#moving-away-while-reading).
- `readFromPointer`: whether `readFromPointer()` starts reading from a click or tap, `true` by default. See [Reading from a click or tap](#reading-from-a-click-or-tap).
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
