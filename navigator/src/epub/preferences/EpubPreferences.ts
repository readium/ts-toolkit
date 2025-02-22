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
    this.blendFilter = preferences.blendFilter || null;
    this.constraint = EpubPreferences.ensureNonNegative(preferences.constraint);
    this.columnCount = EpubPreferences.ensureNonNegative(preferences.columnCount);
    this.darkenFilter = EpubPreferences.ensureFilter(preferences.darkenFilter);
    this.fontFamily = preferences.fontFamily || null;
    this.fontSize = EpubPreferences.ensureValueInRange(preferences.fontSize, 50, 250);
    this.fontOpticalSizing = preferences.fontOpticalSizing || null;
    this.fontWeight = EpubPreferences.ensureValueInRange(preferences.fontWeight, 100, 1000);
    this.fontWidth = typeof preferences.fontWidth === "string" 
      ? preferences.fontWidth 
      : EpubPreferences.ensureValueInRange(preferences.fontWidth, 10, 1000);
    this.hyphens = preferences.hyphens || null;
    this.invertFilter = EpubPreferences.ensureFilter(preferences.invertFilter);
    this.invertGaijiFilter = EpubPreferences.ensureFilter(preferences.invertGaijiFilter);
    this.letterSpacing = EpubPreferences.ensureNonNegative(preferences.letterSpacing);
    this.ligatures = preferences.ligatures || null;
    this.lineHeight = EpubPreferences.ensureNonNegative(preferences.lineHeight);
    this.lineLength = EpubPreferences.ensureNonNegative(preferences.lineLength);
    this.minimalLineLength = preferences.minimalLineLength;
    this.linkColor = preferences.linkColor || null;
    this.optimalLineLength = EpubPreferences.ensureNonNegative(preferences.optimalLineLength) || 65;
    this.noRuby = preferences.noRuby || null;
    this.pageGutter = EpubPreferences.ensureNonNegative(preferences.pageGutter);
    this.paragraphIndent = EpubPreferences.ensureNonNegative(preferences.paragraphIndent);
    this.paragraphSpacing = EpubPreferences.ensureNonNegative(preferences.paragraphSpacing);
    this.publisherStyles = preferences.publisherStyles || null;
    this.scroll = preferences.scroll || null;
    this.selectionBackgroundColor = preferences.selectionBackgroundColor || null;
    this.selectionTextColor = preferences.selectionTextColor || null;
    this.textAlign = preferences.textAlign || null;
    this.textColor = preferences.textColor || null;
    this.textNormalization = preferences.textNormalization || null;
    this.theme = preferences.theme || null;
    this.visitedColor = preferences.visitedColor || null;
    this.wordSpacing = EpubPreferences.ensureNonNegative(preferences.wordSpacing);
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
    const merged: IEpubPreferences = { ...this, ...other };
    return new EpubPreferences(merged);
  }
}