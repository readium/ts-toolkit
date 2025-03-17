import { ConfigurablePreferences } from "../../preferences/Configurable";

import { 
  LayoutStrategy,
  TextAlignment, 
  Theme, 
  fontSizeRangeConfig, 
  fontWeightRangeConfig, 
  fontWidthRangeConfig 
} from "../../preferences/Types";

export interface IEpubPreferences {
  backgroundColor?: string | null,
  blendFilter?: boolean | null,
  columnCount?: number | null,
  constraint?: number | null,
  darkenFilter?: boolean | number | null,
  fontFamily?: string | null,
  fontSize?: number | null,
  fontOpticalSizing?: boolean | null,
  fontWeight?: number | null,
  fontWidth?: number | null,
  hyphens?: boolean | null,
  invertFilter?: boolean | number | null,
  invertGaijiFilter?: boolean | number | null,
  layoutStrategy?: LayoutStrategy | null,
  letterSpacing?: number | null,
  ligatures?: boolean | null,
  lineHeight?: number | null,
  lineLength?: number | null,
  linkColor?: string | null,
  maximalLineLength?: number | null,
  minimalLineLength?: number | null,
  noRuby?: boolean | null,
  optimalLineLength?: number,
  pageGutter?: number | null,
  paragraphIndent?: number | null,
  paragraphSpacing?: number | null,
  publisherStyles?: boolean | null,
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
  fontFamily?: string | null;
  fontSize?: number | null;
  fontOpticalSizing?: boolean | null;
  fontWeight?: number | null;
  fontWidth?: number | null;
  hyphens?: boolean | null;
  invertFilter?: boolean | number | null;
  invertGaijiFilter?: boolean | number | null;
  layoutStrategy?: LayoutStrategy | null;
  letterSpacing?: number | null;
  ligatures?: boolean | null;
  lineHeight?: number | null;
  lineLength?: number | null;
  linkColor?: string | null;
  maximalLineLength?: number | null;
  minimalLineLength?: number | null;
  noRuby?: boolean | null;
  optimalLineLength?: number;
  pageGutter?: number | null;
  paragraphIndent?: number | null;
  paragraphSpacing?: number | null;
  publisherStyles?: boolean | null;
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
    this.backgroundColor = EpubPreferences.ensureString(preferences.backgroundColor);
    this.blendFilter = EpubPreferences.ensureBoolean(preferences.blendFilter);
    this.constraint = EpubPreferences.ensureNonNegative(preferences.constraint);
    this.columnCount = EpubPreferences.ensureNonNegative(preferences.columnCount);
    this.darkenFilter = EpubPreferences.ensureFilter(preferences.darkenFilter);
    this.fontFamily = EpubPreferences.ensureString(preferences.fontFamily);
    this.fontSize = EpubPreferences.ensureValueInRange(preferences.fontSize, fontSizeRangeConfig.range);
    this.fontOpticalSizing = EpubPreferences.ensureBoolean(preferences.fontOpticalSizing);
    this.fontWeight = EpubPreferences.ensureValueInRange(preferences.fontWeight, fontWeightRangeConfig.range);
    this.fontWidth = EpubPreferences.ensureValueInRange(preferences.fontWidth,fontWidthRangeConfig.range);
    this.hyphens = EpubPreferences.ensureBoolean(preferences.hyphens);
    this.invertFilter = EpubPreferences.ensureFilter(preferences.invertFilter);
    this.invertGaijiFilter = EpubPreferences.ensureFilter(preferences.invertGaijiFilter);
    this.layoutStrategy = EpubPreferences.ensureEnumValue<LayoutStrategy>(preferences.layoutStrategy, LayoutStrategy);
    this.letterSpacing = EpubPreferences.ensureNonNegative(preferences.letterSpacing);
    this.ligatures = EpubPreferences.ensureBoolean(preferences.ligatures);
    this.lineHeight = EpubPreferences.ensureNonNegative(preferences.lineHeight);
    this.lineLength = EpubPreferences.ensureNonNegative(preferences.lineLength);
    this.maximalLineLength = EpubPreferences.ensureMoreThanOrEqual(preferences.maximalLineLength, preferences.optimalLineLength);
    this.minimalLineLength = EpubPreferences.ensureLessThanOrEqual(preferences.minimalLineLength, preferences.maximalLineLength);
    this.linkColor = EpubPreferences.ensureString(preferences.linkColor);
    this.optimalLineLength = EpubPreferences.ensureNonNegative(preferences.optimalLineLength) || 65;
    this.noRuby = EpubPreferences.ensureBoolean(preferences.noRuby);
    this.pageGutter = EpubPreferences.ensureNonNegative(preferences.pageGutter);
    this.paragraphIndent = EpubPreferences.ensureNonNegative(preferences.paragraphIndent);
    this.paragraphSpacing = EpubPreferences.ensureNonNegative(preferences.paragraphSpacing);
    this.publisherStyles = EpubPreferences.ensureBoolean(preferences.publisherStyles);
    this.scroll = EpubPreferences.ensureBoolean(preferences.scroll);
    this.selectionBackgroundColor = EpubPreferences.ensureString(preferences.selectionBackgroundColor);
    this.selectionTextColor = EpubPreferences.ensureString(preferences.selectionTextColor);
    this.textAlign = EpubPreferences.ensureEnumValue<TextAlignment>(preferences.textAlign, TextAlignment);
    this.textColor = EpubPreferences.ensureString(preferences.textColor);
    this.textNormalization = EpubPreferences.ensureBoolean(preferences.textNormalization);
    this.theme = EpubPreferences.ensureEnumValue<Theme>(preferences.theme, Theme);
    this.visitedColor = EpubPreferences.ensureString(preferences.visitedColor);
    this.wordSpacing = EpubPreferences.ensureNonNegative(preferences.wordSpacing);
  }

  private static ensureLessThanOrEqual<T extends number | null | undefined>(value: T, compareTo: T): T | undefined {
    if (value === undefined || value === null) {
      return value;
    }
    if (compareTo === undefined || compareTo === null) {
      return value;
    }
    return value <= compareTo ? value : undefined;
  }

  private static ensureMoreThanOrEqual<T extends number | null | undefined>(value: T, compareTo: T): T | undefined {
    if (value === undefined || value === null) {
      return value;
    }
    if (compareTo === undefined || compareTo === null) {
      return value;
    }
    return value >= compareTo ? value : undefined;
  }
  
  private static ensureString(value: string | null | undefined): string | null | undefined {
    if (typeof value === "string") {
      return value;
    } else if (value === null) {
      return null;
    } else {
      return undefined;
    }
  }

  private static ensureBoolean(value: boolean | null | undefined): boolean | null | undefined {
    return typeof value === "boolean" 
      ? value 
      : value === undefined || value === null 
        ? value 
        : undefined;
  }

  
  private static ensureEnumValue<T extends string>(value: T | null | undefined, enumType: Record<T, string>): T | null | undefined {
    if (value === undefined) {
      return undefined;
    }
    if (value === null) {
      return null;
    }
    return enumType[value as T] !== undefined ? value : undefined;
  }

  private static ensureFilter(filter: boolean | number | null | undefined): boolean | number | null | undefined {
    if (typeof filter === "boolean") {
      return filter;
    } else if (typeof filter === "number" && filter >= 0) {
      return filter;
    } else if (filter === null) {
      return null;
    } else {
      return undefined;
    }
  }

  private static ensureNonNegative(value: number | null | undefined): number | null | undefined {
    if (value === undefined) {
      return undefined;
    }
    if (value === null) {
      return null;
    }
    return value < 0 ? undefined : value;
  }

  private static ensureValueInRange(value: number | null | undefined, range: [number, number]): number | null | undefined {
    if (value === undefined) {
      return undefined;
    }
    if (value === null) {
      return null;
    }
    const min = Math.min(...range);
    const max = Math.max(...range);
    return value >= min && value <= max ? value : undefined;
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
      if (other[key] !== undefined) {
        merged[key] = other[key];
      }
    }
    return new EpubPreferences(merged);
  }
}