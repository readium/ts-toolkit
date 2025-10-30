import { Feature, Metadata } from "@readium/shared";

import { IPreferencesEditor } from "../../preferences/PreferencesEditor";
import { WebPubPreferences } from "./WebPubPreferences";
import { WebPubSettings } from "./WebPubSettings";
import { BooleanPreference, EnumPreference, Preference, RangePreference } from "../../preferences/Preference";
import { 
  fontWeightRangeConfig, 
  letterSpacingRangeConfig, 
  lineHeightRangeConfig, 
  paragraphIndentRangeConfig, 
  paragraphSpacingRangeConfig, 
  TextAlignment, 
  wordSpacingRangeConfig, 
  zoomRangeConfig 
} from "../../preferences/Types";
export class WebPubPreferencesEditor implements IPreferencesEditor {
  preferences: WebPubPreferences;
  private settings: WebPubSettings;
  private metadata: Metadata | null;

  constructor(initialPreferences: WebPubPreferences, settings: WebPubSettings, metadata: Metadata) {
    this.preferences = initialPreferences;
    this.settings = settings;
    this.metadata = metadata;
  }

  clear() {
    this.preferences = new WebPubPreferences({});
  }

  private updatePreference<K extends keyof WebPubPreferences>(key: K, value: WebPubPreferences[K]) {
    this.preferences[key] = value;
  }

  private get isDisplayTransformable(): boolean {
    return this.metadata?.accessibility?.feature?.some(
      f => f.value === Feature.DISPLAY_TRANSFORMABILITY.value
    ) ?? false; // Default to false if no metadata
  }

  get fontFamily(): Preference<string> {
    return new Preference<string>({
      initialValue: this.preferences.fontFamily,
      effectiveValue: this.settings.fontFamily || null,
      isEffective: this.isDisplayTransformable,
      onChange: (newValue: string | null | undefined) => {
        this.updatePreference("fontFamily", newValue || null);
      }
    });
  }

  get fontWeight(): RangePreference<number> {
    return new RangePreference<number>({
      initialValue: this.preferences.fontWeight,
      effectiveValue: this.settings.fontWeight || 400,
      isEffective: this.isDisplayTransformable,
      onChange: (newValue: number | null | undefined) => {
        this.updatePreference("fontWeight", newValue || null);
      },
      supportedRange: fontWeightRangeConfig.range,
      step: fontWeightRangeConfig.step
    });
  }

  get hyphens(): BooleanPreference {
    return new BooleanPreference({
      initialValue: this.preferences.hyphens,
      effectiveValue: this.settings.hyphens || false,
      isEffective: this.isDisplayTransformable,
      onChange: (newValue: boolean | null | undefined) => {
        this.updatePreference("hyphens", newValue || null);
      }
    });
  }

  get letterSpacing(): RangePreference<number> {
    return new RangePreference<number>({
      initialValue: this.preferences.letterSpacing,
      effectiveValue: this.settings.letterSpacing || 0,
      isEffective: this.isDisplayTransformable,
      onChange: (newValue: number | null | undefined) => {
        this.updatePreference("letterSpacing", newValue || null);
      },
      supportedRange: letterSpacingRangeConfig.range,
      step: letterSpacingRangeConfig.step
    });
  }

  get ligatures(): BooleanPreference {
    return new BooleanPreference({
      initialValue: this.preferences.ligatures,
      effectiveValue: this.settings.ligatures || true,
      isEffective: this.isDisplayTransformable,
      onChange: (newValue: boolean | null | undefined) => {
        this.updatePreference("ligatures", newValue || null);
      }
    });
  }

  get lineHeight(): RangePreference<number> {
    return new RangePreference<number>({
      initialValue: this.preferences.lineHeight,
      effectiveValue: this.settings.lineHeight,
      isEffective: this.isDisplayTransformable,
      onChange: (newValue: number | null | undefined) => {
        this.updatePreference("lineHeight", newValue || null);
      },
      supportedRange: lineHeightRangeConfig.range,
      step: lineHeightRangeConfig.step
    });
  }

  get noRuby(): BooleanPreference {
    return new BooleanPreference({
      initialValue: this.preferences.noRuby,
      effectiveValue: this.settings.noRuby || false,
      isEffective: this.isDisplayTransformable,
      onChange: (newValue: boolean | null | undefined) => {
        this.updatePreference("noRuby", newValue || null);
      }
    });
  }

  get paragraphIndent(): RangePreference<number> {
    return new RangePreference<number>({
      initialValue: this.preferences.paragraphIndent,
      effectiveValue: this.settings.paragraphIndent || 0,
      isEffective: this.isDisplayTransformable,
      onChange: (newValue: number | null | undefined) => {
        this.updatePreference("paragraphIndent", newValue || null);
      },
      supportedRange: paragraphIndentRangeConfig.range,
      step: paragraphIndentRangeConfig.step
    });
  }

  get paragraphSpacing(): RangePreference<number> {
    return new RangePreference<number>({
      initialValue: this.preferences.paragraphSpacing,
      effectiveValue: this.settings.paragraphSpacing || 0,
      isEffective: this.isDisplayTransformable,
      onChange: (newValue: number | null | undefined) => {
        this.updatePreference("paragraphSpacing", newValue || null);
      },
      supportedRange: paragraphSpacingRangeConfig.range,
      step: paragraphSpacingRangeConfig.step
    });
  }

  get textAlign(): EnumPreference<TextAlignment> {
    return new EnumPreference<TextAlignment>({
      initialValue: this.preferences.textAlign,
      effectiveValue: this.settings.textAlign || TextAlignment.start,
      isEffective: this.isDisplayTransformable,
      onChange: (newValue: TextAlignment | null | undefined) => {
        this.updatePreference("textAlign", newValue || null);
      },
      supportedValues: Object.values(TextAlignment)
    });
  }

  get textNormalization(): BooleanPreference {
    return new BooleanPreference({
      initialValue: this.preferences.textNormalization,
      effectiveValue: this.settings.textNormalization || false,
      isEffective: this.isDisplayTransformable,
      onChange: (newValue: boolean | null | undefined) => {
        this.updatePreference("textNormalization", newValue || null);
      }
    });
  }

  get wordSpacing(): RangePreference<number> {
    return new RangePreference<number>({
      initialValue: this.preferences.wordSpacing,
      effectiveValue: this.settings.wordSpacing || 0,
      isEffective: this.isDisplayTransformable,
      onChange: (newValue: number | null | undefined) => {
        this.updatePreference("wordSpacing", newValue || null);
      },
      supportedRange: wordSpacingRangeConfig.range,
      step: wordSpacingRangeConfig.step
    });
  }

  get zoom(): RangePreference<number> {
    return new RangePreference<number>({
      initialValue: this.preferences.zoom,
      effectiveValue: this.settings.zoom || 1,
      isEffective: CSS.supports("zoom", "1") ?? false,
      onChange: (newValue: number | null | undefined) => {
        this.updatePreference("zoom", newValue || null);
      },
      supportedRange: zoomRangeConfig.range,
      step: zoomRangeConfig.step
    });
  }
}