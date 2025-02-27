import { TextAlignment, Theme } from "../../preferences/Types";
import { ConfigurablePreferences } from "../../preferences/Configurable";

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
  letterSpacing?: number | null,
  ligatures?: boolean | null,
  lineHeight?: number | null,
  lineLength?: number | null,
  linkColor?: string | null,
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
  backgroundColor: string | null;
  blendFilter: boolean | null;
  constraint: number | null;
  columnCount: number | null;
  darkenFilter: boolean | number | null;
  fontFamily: string | null;
  fontSize: number | null;
  fontOpticalSizing: boolean | null;
  fontWeight: number | null;
  fontWidth: number | null;
  hyphens: boolean | null;
  invertFilter: boolean | number | null;
  invertGaijiFilter: boolean | number | null;
  letterSpacing: number | null;
  ligatures: boolean | null;
  lineHeight: number | null;
  lineLength: number | null;
  linkColor: string | null;
  minimalLineLength?: number | null;
  noRuby: boolean | null;
  optimalLineLength: number;
  pageGutter: number | null;
  paragraphIndent: number | null;
  paragraphSpacing: number | null;
  publisherStyles: boolean | null;
  scroll: boolean | null;
  selectionBackgroundColor: string | null;
  selectionTextColor: string | null;
  textAlign: TextAlignment | null;
  textColor: string | null;
  textNormalization: boolean | null;
  theme: Theme | null;
  visitedColor: string | null;
  wordSpacing: number | null;

  constructor(preferences: IEpubPreferences) {
    this.backgroundColor = preferences.backgroundColor || null;
    this.blendFilter = EpubPreferences.ensureBoolean(preferences.blendFilter);
    this.constraint = EpubPreferences.ensureNonNegative(preferences.constraint);
    this.columnCount = EpubPreferences.ensureNonNegative(preferences.columnCount);
    this.darkenFilter = EpubPreferences.ensureFilter(preferences.darkenFilter);
    this.fontFamily = preferences.fontFamily || null;
    this.fontSize = EpubPreferences.ensureValueInRange(preferences.fontSize, 50, 250);
    this.fontOpticalSizing = EpubPreferences.ensureBoolean(preferences.fontOpticalSizing);
    this.fontWeight = EpubPreferences.ensureValueInRange(preferences.fontWeight, 100, 1000);
    this.fontWidth = typeof preferences.fontWidth === "string" 
      ? preferences.fontWidth 
      : EpubPreferences.ensureValueInRange(preferences.fontWidth, 10, 1000);
    this.hyphens = EpubPreferences.ensureBoolean(preferences.hyphens);
    this.invertFilter = EpubPreferences.ensureFilter(preferences.invertFilter);
    this.invertGaijiFilter = EpubPreferences.ensureFilter(preferences.invertGaijiFilter);
    this.letterSpacing = EpubPreferences.ensureNonNegative(preferences.letterSpacing);
    this.ligatures = EpubPreferences.ensureBoolean(preferences.ligatures);
    this.lineHeight = EpubPreferences.ensureNonNegative(preferences.lineHeight);
    this.lineLength = EpubPreferences.ensureNonNegative(preferences.lineLength);
    this.minimalLineLength = preferences.minimalLineLength;
    this.linkColor = preferences.linkColor || null;
    this.optimalLineLength = EpubPreferences.ensureNonNegative(preferences.optimalLineLength) || 65;
    this.noRuby = EpubPreferences.ensureBoolean(preferences.noRuby);
    this.pageGutter = EpubPreferences.ensureNonNegative(preferences.pageGutter);
    this.paragraphIndent = EpubPreferences.ensureNonNegative(preferences.paragraphIndent);
    this.paragraphSpacing = EpubPreferences.ensureNonNegative(preferences.paragraphSpacing);
    this.publisherStyles = EpubPreferences.ensureBoolean(preferences.publisherStyles);
    this.scroll = EpubPreferences.ensureBoolean(preferences.scroll);
    this.selectionBackgroundColor = preferences.selectionBackgroundColor || null;
    this.selectionTextColor = preferences.selectionTextColor || null;
    this.textAlign = preferences.textAlign || null;
    this.textColor = preferences.textColor || null;
    this.textNormalization = EpubPreferences.ensureBoolean(preferences.textNormalization);
    this.theme = preferences.theme || null;
    this.visitedColor = preferences.visitedColor || null;
    this.wordSpacing = EpubPreferences.ensureNonNegative(preferences.wordSpacing);
  }

  static ensureBoolean(value: boolean | null | undefined): boolean | null {
    return typeof value === "boolean" ? value : null;
  }

  static ensureFilter(filter: boolean | number | null | undefined): boolean | number | null {
    if (typeof filter === "boolean") {
      return filter;
    } else if (typeof filter === "number" && filter >= 0) {
      return filter;
    } else if (filter === null) {
      return null;
    } else {
      return null;
    }
  }

  static ensureNonNegative(value: number | null | undefined): number | null {
    return value !== undefined && value !== null && value >= 0 ? value : null;
  }

  static ensureValueInRange(value: number | null | undefined, min: number, max: number): number | null {
    return value !== undefined && value !== null && value >= min && value <= max ? value : null;
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