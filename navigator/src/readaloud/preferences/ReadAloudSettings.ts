import type { GndRole } from "@readium/guided-navigation";
import { ExtractionFormat, LanguageMode, Segmentation, SpeechSettings, VerbosityPreset, VoicePreference } from "@readium/speech";
import { ConfigurableSettings } from "../../preferences/Configurable.ts";
import { ReadAloudDefaults } from "./ReadAloudDefaults.ts";
import { ReadAloudAutoPause, ReadAloudDecorationStyle, ReadAloudPreferences } from "./ReadAloudPreferences.ts";

export class ReadAloudSettings implements ConfigurableSettings {
  format: ExtractionFormat;
  inlineContextualization: GndRole[];
  verbosity: VerbosityPreset;
  skip: GndRole[];
  contextualize: GndRole[];
  language: LanguageMode;
  segmentation: Segmentation;
  pauseDuration: number;
  voice: VoicePreference | null;
  autoPause: ReadAloudAutoPause;
  languageOverride: string | null;
  startInViewport: boolean;
  keepCentered: boolean;
  detachable: boolean;
  readFromPointer: boolean;
  rate: number;
  pitch: number;
  volume: number;
  utteranceStyle: ReadAloudDecorationStyle;
  wordStyle: ReadAloudDecorationStyle;

  /**
   * @param speech The settings speech resolved for its own fields.
   */
  constructor(speech: SpeechSettings, preferences: ReadAloudPreferences, defaults: ReadAloudDefaults) {
    this.format = speech.format;
    this.inlineContextualization = speech.inlineContextualization;
    this.verbosity = speech.verbosity;
    this.skip = speech.skip;
    this.contextualize = speech.contextualize;
    this.language = speech.language;
    this.segmentation = speech.segmentation;
    this.pauseDuration = speech.pauseDuration;
    this.voice = speech.voice;
    this.autoPause = preferences.autoPause ?? defaults.autoPause;
    this.languageOverride = preferences.languageOverride ?? defaults.languageOverride;
    this.startInViewport = preferences.startInViewport ?? defaults.startInViewport;
    this.keepCentered = preferences.keepCentered ?? defaults.keepCentered;
    this.detachable = preferences.detachable ?? defaults.detachable;
    this.readFromPointer = preferences.readFromPointer ?? defaults.readFromPointer;
    this.rate = speech.rate;
    this.pitch = speech.pitch;
    this.volume = speech.volume;
    this.utteranceStyle = preferences.utteranceStyle ?? defaults.utteranceStyle;
    this.wordStyle = preferences.wordStyle ?? defaults.wordStyle;
  }
}
