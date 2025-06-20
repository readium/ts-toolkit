import { ConfigurablePreferences } from "../../preferences/Configurable";

import { 
  LayoutStrategy,
  TextAlignment, 
  Theme, 
  fontSizeRangeConfig, 
  fontWeightRangeConfig, 
  fontWidthRangeConfig 
} from "../../preferences/Types";

import { 
  ensureBoolean, 
  ensureEnumValue, 
  ensureFilter, 
  ensureNonNegative, 
  ensureString, 
  ensureValueInRange 
} from "./guards";

export interface IEpubPreferences {
  backgroundColor?: string | null,
  blendFilter?: boolean | null,
  columnCount?: number | null,
  constraint?: number | null,
  darkenFilter?: boolean | number | null,
  deprecatedFontSize?: boolean | null,
  fontFamily?: string | null,
  fontSize?: number | null,
  fontSizeNormalize?: boolean | null,
  fontOpticalSizing?: boolean | null,
  fontWeight?: number | null,
  fontWidth?: number | null,
  hyphens?: boolean | null,
  invertFilter?: boolean | number | null,
  invertGaijiFilter?: boolean | number | null,
  iPadOSPatch?: boolean | null,
  layoutStrategy?: LayoutStrategy | null,
  letterSpacing?: number | null,
  ligatures?: boolean | null,
  lineHeight?: number | null,
  linkColor?: string | null,
  maximalLineLength?: number | null,
  minimalLineLength?: number | null,
  noRuby?: boolean | null,
  optimalLineLength?: number | null,
  pageGutter?: number | null,
  paragraphIndent?: number | null,
  paragraphSpacing?: number | null,
  scroll?: boolean | null,
  selectionBackgroundColor?: string | null,
  selectionTextColor?: string | null,
  textAlign?: TextAlignment | null,
  textColor?: string | null,
  textNormalization?: boolean | null,
  theme?: Theme | null,
  visitedColor?: string | null,
  wordSpacing?: number | null
}

export class EpubPreferences implements ConfigurablePreferences {
  backgroundColor?: string | null;
  blendFilter?: boolean | null;
  constraint?: number | null;
  columnCount?: number | null;
  darkenFilter?: boolean | number | null;
  deprecatedFontSize?: boolean | null;
  fontFamily?: string | null;
  fontSize?: number | null;
  fontSizeNormalize?: boolean | null;
  fontOpticalSizing?: boolean | null;
  fontWeight?: number | null;
  fontWidth?: number | null;
  hyphens?: boolean | null;
  invertFilter?: boolean | number | null;
  invertGaijiFilter?: boolean | number | null;
  iPadOSPatch?: boolean | null;
  layoutStrategy?: LayoutStrategy | null;
  letterSpacing?: number | null;
  ligatures?: boolean | null;
  lineHeight?: number | null;
  linkColor?: string | null;
  maximalLineLength?: number | null;
  minimalLineLength?: number | null;
  noRuby?: boolean | null;
  optimalLineLength?: number | null;
  pageGutter?: number | null;
  paragraphIndent?: number | null;
  paragraphSpacing?: number | null;
  scroll?: boolean | null;
  selectionBackgroundColor?: string | null;
  selectionTextColor?: string | null;
  textAlign?: TextAlignment | null;
  textColor?: string | null;
  textNormalization?: boolean | null;
  theme?: Theme | null;
  visitedColor?: string | null;
  wordSpacing?: number | null;

  constructor(preferences: IEpubPreferences = {}) {
    this.backgroundColor = ensureString(preferences.backgroundColor);
    this.blendFilter = ensureBoolean(preferences.blendFilter);
    this.constraint = ensureNonNegative(preferences.constraint);
    this.columnCount = ensureNonNegative(preferences.columnCount);
    this.darkenFilter = ensureFilter(preferences.darkenFilter);
    this.deprecatedFontSize = ensureBoolean(preferences.deprecatedFontSize);
    this.fontFamily = ensureString(preferences.fontFamily);
    this.fontSize = ensureValueInRange(preferences.fontSize, fontSizeRangeConfig.range);
    this.fontSizeNormalize = ensureBoolean(preferences.fontSizeNormalize);
    this.fontOpticalSizing = ensureBoolean(preferences.fontOpticalSizing);
    this.fontWeight = ensureValueInRange(preferences.fontWeight, fontWeightRangeConfig.range);
    this.fontWidth = ensureValueInRange(preferences.fontWidth,fontWidthRangeConfig.range);
    this.hyphens = ensureBoolean(preferences.hyphens);
    this.invertFilter = ensureFilter(preferences.invertFilter);
    this.invertGaijiFilter = ensureFilter(preferences.invertGaijiFilter);
    this.iPadOSPatch = ensureBoolean(preferences.iPadOSPatch);
    this.layoutStrategy = ensureEnumValue<LayoutStrategy>(preferences.layoutStrategy, LayoutStrategy);
    this.letterSpacing = ensureNonNegative(preferences.letterSpacing);
    this.ligatures = ensureBoolean(preferences.ligatures);
    this.lineHeight = ensureNonNegative(preferences.lineHeight);
    this.linkColor = ensureString(preferences.linkColor);
    this.noRuby = ensureBoolean(preferences.noRuby);
    this.pageGutter = ensureNonNegative(preferences.pageGutter);
    this.paragraphIndent = ensureNonNegative(preferences.paragraphIndent);
    this.paragraphSpacing = ensureNonNegative(preferences.paragraphSpacing);
    this.scroll = ensureBoolean(preferences.scroll);
    this.selectionBackgroundColor = ensureString(preferences.selectionBackgroundColor);
    this.selectionTextColor = ensureString(preferences.selectionTextColor);
    this.textAlign = ensureEnumValue<TextAlignment>(preferences.textAlign, TextAlignment);
    this.textColor = ensureString(preferences.textColor);
    this.textNormalization = ensureBoolean(preferences.textNormalization);
    this.theme = ensureEnumValue<Theme>(preferences.theme, Theme);
    this.visitedColor = ensureString(preferences.visitedColor);
    this.wordSpacing = ensureNonNegative(preferences.wordSpacing);

    this.optimalLineLength = ensureNonNegative(preferences.optimalLineLength);
    this.maximalLineLength = ensureNonNegative(preferences.maximalLineLength);
    this.minimalLineLength = ensureNonNegative(preferences.minimalLineLength);
  }

  static serialize(preferences: EpubPreferences): string {
    const { ...properties } = preferences;
    return JSON.stringify(properties);
  }

  static deserialize(preferences: string): EpubPreferences | null {
    try {
      const parsedPreferences = JSON.parse(preferences);
      return new EpubPreferences(parsedPreferences);
    } catch (error) {
      console.error("Failed to deserialize preferences:", error);
      return null;
    }
  }

  merging(other: ConfigurablePreferences): ConfigurablePreferences {
    const merged: IEpubPreferences = { ...this };
    for (const key of Object.keys(other) as (keyof IEpubPreferences)[]) {
      if (
        other[key] !== undefined &&
        (
          key !== "maximalLineLength" ||
          other[key] === null ||
          (other[key] >= (other.optimalLineLength ?? merged.optimalLineLength ?? 65))
        ) &&
        (
          key !== "minimalLineLength" ||
          other[key] === null || 
          (other[key] <= (other.optimalLineLength ?? merged.optimalLineLength ?? 65))
        )
      ) {
        merged[key] = other[key];
      }
    }
    return new EpubPreferences(merged);
  }
}