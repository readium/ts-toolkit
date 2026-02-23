import { IPreferencesEditor } from "../../preferences/PreferencesEditor";
import { AudioPreferences } from "./AudioPreferences";
import { AudioSettings } from "./AudioSettings";
import { Preference, BooleanPreference } from "../../preferences/Preference";

export class AudioPreferencesEditor implements IPreferencesEditor {
  preferences: AudioPreferences;
  private settings: AudioSettings;

  constructor(initialPreferences: AudioPreferences, settings: AudioSettings) {
    this.preferences = initialPreferences;
    this.settings = settings;
  }

  clear(): void {
    this.preferences = new AudioPreferences();
  }

  private updatePreference<K extends keyof AudioPreferences>(key: K, value: AudioPreferences[K]) {
    this.preferences[key] = value;
  }

  get volume(): Preference<number> {
    return new Preference<number>({
      initialValue: this.preferences.volume,
      effectiveValue: this.settings.volume,
      isEffective: this.preferences.volume !== null,
      onChange: (newValue: number | null | undefined) => {
        this.updatePreference("volume", newValue ?? 1.0);
      }
    });
  }

  get playbackRate(): Preference<number> {
    return new Preference<number>({
      initialValue: this.preferences.playbackRate,
      effectiveValue: this.settings.playbackRate,
      isEffective: this.preferences.playbackRate !== null,
      onChange: (newValue: number | null | undefined) => {
        this.updatePreference("playbackRate", newValue ?? 1.0);
      }
    });
  }

  get preservePitch(): BooleanPreference {
    return new BooleanPreference({
      initialValue: this.preferences.preservePitch,
      effectiveValue: this.settings.preservePitch,
      isEffective: this.preferences.preservePitch !== null,
      onChange: (newValue: boolean | null | undefined) => {
        this.updatePreference("preservePitch", newValue ?? true);
      }
    });
  }

  get skipBackwardInterval(): Preference<number> {
    return new Preference<number>({
      initialValue: this.preferences.skipBackwardInterval,
      effectiveValue: this.settings.skipBackwardInterval,
      isEffective: this.preferences.skipBackwardInterval !== null,
      onChange: (newValue: number | null | undefined) => {
        this.updatePreference("skipBackwardInterval", newValue ?? 30);
      }
    });
  }

  get skipForwardInterval(): Preference<number> {
    return new Preference<number>({
      initialValue: this.preferences.skipForwardInterval,
      effectiveValue: this.settings.skipForwardInterval,
      isEffective: this.preferences.skipForwardInterval !== null,
      onChange: (newValue: number | null | undefined) => {
        this.updatePreference("skipForwardInterval", newValue ?? 30);
      }
    });
  }

  get pollInterval(): Preference<number> {
    return new Preference<number>({
      initialValue: this.preferences.pollInterval,
      effectiveValue: this.settings.pollInterval,
      isEffective: this.preferences.pollInterval !== null,
      onChange: (newValue: number | null | undefined) => {
        this.updatePreference("pollInterval", newValue ?? 1000);
      }
    });
  }

  get autoPlay(): BooleanPreference {
    return new BooleanPreference({
      initialValue: this.preferences.autoPlay,
      effectiveValue: this.settings.autoPlay,
      isEffective: this.preferences.autoPlay !== null,
      onChange: (newValue: boolean | null | undefined) => {
        this.updatePreference("autoPlay", newValue ?? true);
      }
    });
  }

  get enableMediaSession(): BooleanPreference {
    return new BooleanPreference({
      initialValue: this.preferences.enableMediaSession,
      effectiveValue: this.settings.enableMediaSession,
      isEffective: this.preferences.enableMediaSession !== null,
      onChange: (newValue: boolean | null | undefined) => {
        this.updatePreference("enableMediaSession", newValue ?? true);
      }
    });
  }
}
