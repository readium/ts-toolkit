import type { GndRole } from "@readium/guided-navigation";
import { ExtractionFormat, LanguageMode, Segmentation, SpeechSettings, VerbosityPreset } from "@readium/speech";
import { ConfigurableSettings } from "../../preferences/Configurable.ts";
import { ReadAloudDefaults } from "./ReadAloudDefaults.ts";
import { ReadAloudAutoPause, ReadAloudDecorationStyle, ReadAloudPreferences } from "./ReadAloudPreferences.ts";

export class ReadAloudSettings implements ConfigurableSettings {
  format: ExtractionFormat;
  inlineContextualization: boolean;
  verbosity: VerbosityPreset;
  skip: GndRole[];
  contextualize: GndRole[];
  language: LanguageMode;
  segmentation: Segmentation;
  pauseDuration: number;
  autoPause: ReadAloudAutoPause;
  speakInContentLanguage: boolean;
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
    this.autoPause = preferences.autoPause ?? defaults.autoPause;
    this.speakInContentLanguage = preferences.speakInContentLanguage ?? defaults.speakInContentLanguage;
    this.rate = speech.rate;
    this.pitch = speech.pitch;
    this.volume = speech.volume;
    this.utteranceStyle = preferences.utteranceStyle ?? defaults.utteranceStyle;
    this.wordStyle = preferences.wordStyle ?? defaults.wordStyle;
  }
}
