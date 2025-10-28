import { ConfigurablePreferences } from "../../preferences/Configurable";

import { 
  fontWeightRangeConfig, 
  TextAlignment, 
  zoomRangeConfig 
} from "../../preferences/Types";

import {
  ensureBoolean,
  ensureEnumValue,
  ensureNonNegative,
  ensureString,
  ensureValueInRange
} from "../../preferences/guards";

export interface IWebPubPreferences {
  fontFamily?: string | null,
  fontWeight?: number | null,
  hyphens?: boolean | null,
  letterSpacing?: number | null,
  ligatures?: boolean | null,
  lineHeight?: number | null,
  noRuby?: boolean | null,
  paragraphIndent?: number | null,
  paragraphSpacing?: number | null,
  textAlign?: TextAlignment | null,
  textNormalization?: boolean | null,
  wordSpacing?: number | null,
  zoom?: number | null
}

export class WebPubPreferences implements ConfigurablePreferences {
  fontFamily?: string | null;
  fontWeight?: number | null;
  hyphens?: boolean | null;
  letterSpacing?: number | null;
  ligatures?: boolean | null;
  lineHeight?: number | null;
  noRuby?: boolean | null;
  paragraphIndent?: number | null;
  paragraphSpacing?: number | null;
  textAlign?: TextAlignment | null;
  textNormalization?: boolean | null;
  wordSpacing?: number | null;
  zoom?: number | null;

  constructor(preferences: IWebPubPreferences = {}) {
    this.fontFamily = ensureString(preferences.fontFamily);
    this.fontWeight = ensureValueInRange(preferences.fontWeight, fontWeightRangeConfig.range);
    this.hyphens = ensureBoolean(preferences.hyphens);
    this.letterSpacing = ensureNonNegative(preferences.letterSpacing);
    this.ligatures = ensureBoolean(preferences.ligatures);
    this.lineHeight = ensureNonNegative(preferences.lineHeight);
    this.noRuby = ensureBoolean(preferences.noRuby);
    this.paragraphIndent = ensureNonNegative(preferences.paragraphIndent);
    this.paragraphSpacing = ensureNonNegative(preferences.paragraphSpacing);
    this.textAlign = ensureEnumValue<TextAlignment>(preferences.textAlign, TextAlignment);
    this.textNormalization = ensureBoolean(preferences.textNormalization);
    this.wordSpacing = ensureNonNegative(preferences.wordSpacing);
    this.zoom = ensureValueInRange(preferences.zoom, zoomRangeConfig.range);
  }

  static serialize(preferences: WebPubPreferences): string {
    const { ...properties } = preferences;
    return JSON.stringify(properties);
  }

  static deserialize(preferences: string): WebPubPreferences | null {
    try {
      const parsedPreferences = JSON.parse(preferences);
      return new WebPubPreferences(parsedPreferences);
    } catch (error) {
      console.error("Failed to deserialize preferences:", error);
      return null;
    }
  }

  merging(other: ConfigurablePreferences): ConfigurablePreferences {
    const merged: IWebPubPreferences = { ...this };
    for (const key of Object.keys(other) as (keyof IWebPubPreferences)[]) {
      if (other[key] !== undefined) {
        merged[key] = other[key];
      }
    }
    return new WebPubPreferences(merged);
  }
}