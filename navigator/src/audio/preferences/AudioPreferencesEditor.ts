import { IPreferencesEditor } from "../../preferences/PreferencesEditor.ts";
import { AudioPreferences } from "./AudioPreferences.ts";
import { AudioSettings } from "./AudioSettings.ts";
import { Preference, BooleanPreference, RangePreference } from "../../preferences/Preference.ts";
import { 
  volumeRangeConfig,
  playbackRateRangeConfig,
  skipIntervalRangeConfig
} from "../../preferences/Types.ts";

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

  get volume(): RangePreference<number> {
    return new RangePreference<number>({
      initialValue: this.preferences.volume,
      effectiveValue: this.settings.volume,
      isEffective: this.preferences.volume !== null,
      onChange: (newValue: number | null | undefined) => {
        this.updatePreference("volume", newValue ?? null);
      },
      supportedRange: volumeRangeConfig.range,
      step: volumeRangeConfig.step
    });
  }

  get playbackRate(): RangePreference<number> {
    return new RangePreference<number>({
      initialValue: this.preferences.playbackRate,
      effectiveValue: this.settings.playbackRate,
      isEffective: this.preferences.playbackRate !== null,
      onChange: (newValue: number | null | undefined) => {
        this.updatePreference("playbackRate", newValue ?? null);
      },
      supportedRange: playbackRateRangeConfig.range,
      step: playbackRateRangeConfig.step
    });
  }

  get preservePitch(): BooleanPreference {
    return new BooleanPreference({
      initialValue: this.preferences.preservePitch,
      effectiveValue: this.settings.preservePitch,
      isEffective: this.preferences.preservePitch !== null,
      onChange: (newValue: boolean | null | undefined) => {
        this.updatePreference("preservePitch", newValue ?? null);
      }
    });
  }

  get skipBackwardInterval(): RangePreference<number> {
    return new RangePreference<number>({
      initialValue: this.preferences.skipBackwardInterval,
      effectiveValue: this.settings.skipBackwardInterval,
      isEffective: this.preferences.skipBackwardInterval !== null,
      onChange: (newValue: number | null | undefined) => {
        this.updatePreference("skipBackwardInterval", newValue ?? null);
      },
      supportedRange: skipIntervalRangeConfig.range,
      step: skipIntervalRangeConfig.step
    });
  }

  get skipForwardInterval(): RangePreference<number> {
    return new RangePreference<number>({
      initialValue: this.preferences.skipForwardInterval,
      effectiveValue: this.settings.skipForwardInterval,
      isEffective: this.preferences.skipForwardInterval !== null,
      onChange: (newValue: number | null | undefined) => {
        this.updatePreference("skipForwardInterval", newValue ?? null);
      },
      supportedRange: skipIntervalRangeConfig.range,
      step: skipIntervalRangeConfig.step
    });
  }

  get pollInterval(): Preference<number> {
    return new Preference<number>({
      initialValue: this.preferences.pollInterval,
      effectiveValue: this.settings.pollInterval,
      isEffective: this.preferences.pollInterval !== null,
      onChange: (newValue: number | null | undefined) => {
        this.updatePreference("pollInterval", newValue ?? null);
      }
    });
  }

  get autoPlay(): BooleanPreference {
    return new BooleanPreference({
      initialValue: this.preferences.autoPlay,
      effectiveValue: this.settings.autoPlay,
      isEffective: this.preferences.autoPlay !== null,
      onChange: (newValue: boolean | null | undefined) => {
        this.updatePreference("autoPlay", newValue ?? null);
      }
    });
  }

  get enableMediaSession(): BooleanPreference {
    return new BooleanPreference({
      initialValue: this.preferences.enableMediaSession,
      effectiveValue: this.settings.enableMediaSession,
      isEffective: this.preferences.enableMediaSession !== null,
      onChange: (newValue: boolean | null | undefined) => {
        this.updatePreference("enableMediaSession", newValue ?? null);
      }
    });
  }
}
