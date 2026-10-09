import { Layout } from "@readium/shared";
import { SpeechPreferences, SpeechPreferencesEditor, SpeechSettings } from "@readium/speech";
import { IPreferencesEditor } from "../../preferences/PreferencesEditor.ts";
import { BooleanPreference, EnumPreference, Preference } from "../../preferences/Preference.ts";
import { ReadAloudAutoPause, ReadAloudDecorationStyle, ReadAloudPreferences } from "./ReadAloudPreferences.ts";
import { ReadAloudSettings } from "./ReadAloudSettings.ts";

/**
 * Edits read-aloud preferences, speech's own fields through speech's editor.
 */
export class ReadAloudPreferencesEditor implements IPreferencesEditor {
  private speech: SpeechPreferencesEditor;
  private own: ReadAloudPreferences;
  private settings: ReadAloudSettings;
  private layout: Layout;

  /**
   * @param layout How the publication is displayed: `Layout.reflowable` for columns, `Layout.scrolled` when scrolled.
   */
  constructor(initialPreferences: ReadAloudPreferences, settings: ReadAloudSettings, speechSettings: SpeechSettings, layout: Layout) {
    const { speakInContentLanguage, ...speechPreferences } = initialPreferences;
    this.speech = new SpeechPreferencesEditor(new SpeechPreferences({ ...speechPreferences, autoPause: undefined }), speechSettings);
    this.own = new ReadAloudPreferences({
      autoPause: initialPreferences.autoPause,
      speakInContentLanguage,
      utteranceStyle: initialPreferences.utteranceStyle,
      wordStyle: initialPreferences.wordStyle
    });
    this.settings = settings;
    this.layout = layout;
  }

  get preferences(): ReadAloudPreferences {
    return new ReadAloudPreferences({
      ...this.speech.preferences,
      autoPause: this.own.autoPause,
      speakInContentLanguage: this.own.speakInContentLanguage,
      utteranceStyle: this.own.utteranceStyle,
      wordStyle: this.own.wordStyle
    });
  }

  clear(): void {
    this.speech.clear();
    this.own = new ReadAloudPreferences({
      autoPause: null,
      speakInContentLanguage: null,
      utteranceStyle: null,
      wordStyle: null
    });
  }

  private updatePreference<K extends keyof ReadAloudPreferences>(key: K, value: ReadAloudPreferences[K]) {
    this.own[key] = value;
  }

  get format() { return this.speech.format; }
  get inlineContextualization() { return this.speech.inlineContextualization; }
  get verbosity() { return this.speech.verbosity; }
  get skip() { return this.speech.skip; }
  get contextualize() { return this.speech.contextualize; }
  get language() { return this.speech.language; }
  get segmentation() { return this.speech.segmentation; }
  get pauseDuration() { return this.speech.pauseDuration; }
  get rate() { return this.speech.rate; }
  get pitch() { return this.speech.pitch; }
  get volume() { return this.speech.volume; }

  get autoPause(): EnumPreference<ReadAloudAutoPause> {
    return new EnumPreference<ReadAloudAutoPause>({
      initialValue: this.own.autoPause,
      effectiveValue: this.settings.autoPause,
      isEffective: this.layout === Layout.fixed || this.settings.autoPause !== ReadAloudAutoPause.spread &&
        (this.layout === Layout.reflowable || this.settings.autoPause !== ReadAloudAutoPause.page),
      onChange: (newValue) => {
        this.updatePreference("autoPause", newValue ?? null);
      },
      supportedValues: Object.values(ReadAloudAutoPause)
        .filter(value => value !== ReadAloudAutoPause.spread || this.layout === Layout.fixed)
    });
  }

  get speakInContentLanguage(): BooleanPreference {
    return new BooleanPreference({
      initialValue: this.own.speakInContentLanguage,
      effectiveValue: this.settings.speakInContentLanguage,
      isEffective: this.settings.language !== "none",
      onChange: (newValue) => {
        this.updatePreference("speakInContentLanguage", newValue ?? null);
      }
    });
  }

  get utteranceStyle(): Preference<ReadAloudDecorationStyle> {
    return new Preference<ReadAloudDecorationStyle>({
      initialValue: this.own.utteranceStyle,
      effectiveValue: this.settings.utteranceStyle,
      isEffective: true,
      onChange: (newValue) => {
        this.updatePreference("utteranceStyle", newValue ?? null);
      }
    });
  }

  get wordStyle(): Preference<ReadAloudDecorationStyle> {
    return new Preference<ReadAloudDecorationStyle>({
      initialValue: this.own.wordStyle,
      effectiveValue: this.settings.wordStyle,
      isEffective: true,
      onChange: (newValue) => {
        this.updatePreference("wordStyle", newValue ?? null);
      }
    });
  }
}
