import { Layout, Metadata } from "@readium/shared";

import { IPreferencesEditor } from "../../preferences/PreferencesEditor.ts";
import { BooleanPreference, EnumPreference, Preference, RangePreference } from "../../preferences/Preference.ts";
import { DivinaQuality } from "../DivinaVariantSelector.ts";
import { DivinaPreferences, stripWidthRangeConfig } from "./DivinaPreferences.ts";
import { DivinaSettings } from "./DivinaSettings.ts";

export class DivinaPreferencesEditor implements IPreferencesEditor {
  preferences: DivinaPreferences;
  private settings: DivinaSettings;
  private metadata: Metadata;

  constructor(initialPreferences: DivinaPreferences, settings: DivinaSettings, metadata: Metadata) {
    this.preferences = initialPreferences;
    this.settings = settings;
    this.metadata = metadata;
  }

  clear(): void {
    this.preferences = new DivinaPreferences({});
  }

  private updatePreference<K extends keyof DivinaPreferences>(key: K, value: DivinaPreferences[K]) {
    this.preferences[key] = value;
  }

  private get manifestScrolled(): boolean {
    return this.metadata.effectiveLayout === Layout.scrolled;
  }

  get backgroundColor(): Preference<string> {
    return new Preference<string>({
      initialValue: this.preferences.backgroundColor,
      effectiveValue: this.settings.backgroundColor,
      isEffective: true,
      onChange: (newValue) => {
        this.updatePreference("backgroundColor", newValue ?? null);
      }
    });
  }

  get quality(): EnumPreference<DivinaQuality> {
    return new EnumPreference<DivinaQuality>({
      initialValue: this.preferences.quality,
      effectiveValue: this.settings.quality,
      isEffective: true,
      onChange: (newValue) => {
        this.updatePreference("quality", newValue ?? null);
      },
      supportedValues: [DivinaQuality.auto, DivinaQuality.low, DivinaQuality.high, DivinaQuality.max]
    });
  }

  get scrolled(): BooleanPreference {
    return new BooleanPreference({
      initialValue: this.preferences.scrolled,
      effectiveValue: this.settings.scrolled,
      isEffective: !this.manifestScrolled,
      onChange: (newValue) => {
        this.updatePreference("scrolled", newValue ?? null);
      }
    });
  }

  get spreads(): BooleanPreference {
    return new BooleanPreference({
      initialValue: this.preferences.spreads,
      effectiveValue: this.settings.spreads,
      isEffective: !this.settings.scrolled,
      onChange: (newValue) => {
        this.updatePreference("spreads", newValue ?? null);
      }
    });
  }

  get stripWidth(): RangePreference<number> {
    return new RangePreference<number>({
      initialValue: this.preferences.stripWidth,
      effectiveValue: this.settings.stripWidth,
      isEffective: this.settings.scrolled,
      onChange: (newValue) => {
        this.updatePreference("stripWidth", newValue ?? null);
      },
      supportedRange: stripWidthRangeConfig.range,
      step: stripWidthRangeConfig.step
    });
  }
}
