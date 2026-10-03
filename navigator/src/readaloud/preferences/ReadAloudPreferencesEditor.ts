import { SpeechPreferences, SpeechPreferencesEditor, SpeechSettings } from "@readium/speech";
import { IPreferencesEditor } from "../../preferences/PreferencesEditor.ts";
import { EnumPreference, Preference } from "../../preferences/Preference.ts";
import { ReadAloudAutoPause, ReadAloudDecorationStyle, ReadAloudPreferences } from "./ReadAloudPreferences.ts";
import { ReadAloudSettings } from "./ReadAloudSettings.ts";

/**
 * Edits read-aloud preferences, speech's own fields through speech's editor.
 */
export class ReadAloudPreferencesEditor implements IPreferencesEditor {
  private speech: SpeechPreferencesEditor;
  private own: ReadAloudPreferences;
  private settings: ReadAloudSettings;

  constructor(initialPreferences: ReadAloudPreferences, settings: ReadAloudSettings, speechSettings: SpeechSettings) {
    this.speech = new SpeechPreferencesEditor(new SpeechPreferences({ ...initialPreferences, autoPause: undefined }), speechSettings);
    this.own = new ReadAloudPreferences({
      autoPause: initialPreferences.autoPause,
      utteranceStyle: initialPreferences.utteranceStyle,
      wordStyle: initialPreferences.wordStyle
    });
    this.settings = settings;
  }

  get preferences(): ReadAloudPreferences {
    return new ReadAloudPreferences({
      ...this.speech.preferences,
      autoPause: this.own.autoPause,
      utteranceStyle: this.own.utteranceStyle,
      wordStyle: this.own.wordStyle
    });
  }

  clear(): void {
    this.speech.clear();
    this.own = new ReadAloudPreferences({
      autoPause: null,
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
      isEffective: true,
      onChange: (newValue) => {
        this.updatePreference("autoPause", newValue ?? null);
      },
      supportedValues: Object.values(ReadAloudAutoPause)
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
