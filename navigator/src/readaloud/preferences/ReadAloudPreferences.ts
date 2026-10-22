import type { GndRole } from "@readium/guided-navigation";
import { ExtractionFormat, Interruption, LanguageMode, Segmentation, SpeechPreferences, VerbosityPreset, VoicePreference } from "@readium/speech";
import { ConfigurablePreferences } from "../../preferences/Configurable.ts";
import { ensureBoolean, ensureDecorationStyle, ensureEnumValue, ensureString } from "../../preferences/guards.ts";
import { BuiltinDecorationStyle, NamedDecorationStyle } from "../../decorations/index.ts";

/**
 * When playback pauses on its own: never, after every utterance, before every block,
 * or before the first utterance starting on another page or outside the displayed spread.
 */
export const ReadAloudAutoPause = {
  none: "none",
  utterance: "utterance",
  block: "block",
  page: "page",
  spread: "spread",
} as const;
export type ReadAloudAutoPause = typeof ReadAloudAutoPause[keyof typeof ReadAloudAutoPause];

/** A decoration style, or `false` to not decorate at all. */
export type ReadAloudDecorationStyle = BuiltinDecorationStyle | NamedDecorationStyle | false;

export interface IReadAloudPreferences {
  format?: ExtractionFormat | null,
  interruptions?: Partial<Record<GndRole, Interruption>> | null,
  verbosity?: VerbosityPreset | null,
  skip?: GndRole[] | null,
  contextualize?: GndRole[] | null,
  language?: LanguageMode | null,
  segmentation?: Segmentation | null,
  pauseDuration?: number | null,
  /** A voice id for all content, or one per language */
  voice?: VoicePreference | null,
  autoPause?: ReadAloudAutoPause | null,
  /** BCP 47 tag of the language the publication is actually in, when its metadata is wrong */
  languageOverride?: string | null,
  startInViewport?: boolean | null,
  keepCentered?: boolean | null,
  detachable?: boolean | null,
  readFromPointer?: boolean | null,
  rate?: number | null,
  pitch?: number | null,
  volume?: number | null,
  /** Style of the utterance being spoken */
  utteranceStyle?: ReadAloudDecorationStyle | null,
  /** Style of the word being spoken */
  wordStyle?: ReadAloudDecorationStyle | null
}

export class ReadAloudPreferences implements ConfigurablePreferences<ReadAloudPreferences> {
  format?: ExtractionFormat | null;
  interruptions?: Partial<Record<GndRole, Interruption>> | null;
  verbosity?: VerbosityPreset | null;
  skip?: GndRole[] | null;
  contextualize?: GndRole[] | null;
  language?: LanguageMode | null;
  segmentation?: Segmentation | null;
  pauseDuration?: number | null;
  voice?: VoicePreference | null;
  autoPause?: ReadAloudAutoPause | null;
  languageOverride?: string | null;
  startInViewport?: boolean | null;
  keepCentered?: boolean | null;
  detachable?: boolean | null;
  readFromPointer?: boolean | null;
  rate?: number | null;
  pitch?: number | null;
  volume?: number | null;
  utteranceStyle?: ReadAloudDecorationStyle | null;
  wordStyle?: ReadAloudDecorationStyle | null;

  constructor(preferences: IReadAloudPreferences = {}) {
    const { languageOverride, startInViewport, keepCentered, detachable, readFromPointer, ...speechPreferences } = preferences;
    const speech = new SpeechPreferences({ ...speechPreferences, autoPause: undefined });
    this.format = speech.format;
    this.interruptions = speech.interruptions;
    this.verbosity = speech.verbosity;
    this.skip = speech.skip;
    this.contextualize = speech.contextualize;
    this.language = speech.language;
    this.segmentation = speech.segmentation;
    this.pauseDuration = speech.pauseDuration;
    this.voice = speech.voice;
    this.autoPause = ensureEnumValue<ReadAloudAutoPause>(preferences.autoPause, ReadAloudAutoPause);
    this.languageOverride = ensureString(languageOverride);
    this.startInViewport = ensureBoolean(startInViewport);
    this.keepCentered = ensureBoolean(keepCentered);
    this.detachable = ensureBoolean(detachable);
    this.readFromPointer = ensureBoolean(readFromPointer);
    this.rate = speech.rate;
    this.pitch = speech.pitch;
    this.volume = speech.volume;
    this.utteranceStyle = ensureDecorationStyle(preferences.utteranceStyle);
    this.wordStyle = ensureDecorationStyle(preferences.wordStyle);
  }

  static serialize(preferences: ReadAloudPreferences): string {
    const { ...properties } = preferences;
    return JSON.stringify(properties);
  }

  static deserialize(preferences: string): ReadAloudPreferences | null {
    try {
      const parsedPreferences = JSON.parse(preferences);
      return new ReadAloudPreferences(parsedPreferences);
    } catch (error) {
      console.error("Failed to deserialize preferences:", error);
      return null;
    }
  }

  merging(other: ReadAloudPreferences): ReadAloudPreferences {
    const merged: IReadAloudPreferences = { ...this };
    for (const key of Object.keys(other) as (keyof IReadAloudPreferences)[]) {
      if (other[key] !== undefined) {
        (merged as Record<string, unknown>)[key] = other[key];
      }
    }
    return new ReadAloudPreferences(merged);
  }
}
