import { TextAlignment, Theme } from "../../preferences/Types";
import { ConfigurablePreferences } from "../../preferences/Configurable";

export interface IEpubPreferences {
  backgroundColor?: string | null,
  blendFilter?: boolean | null,
  columnCount?: number | null,
  darkenFilter?: boolean | number | null,
  fontFamily?: string | null,
  fontSize?: number | null,
  fontOpticalSizing?: number | null,
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
  noRuby?: boolean | null,
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
  visitedLinkColor?: string | null,
  wordSpacing?: number | null
}

export class EpubPreferences implements ConfigurablePreferences {
  backgroundColor: string | null;
  blendFilter: boolean | null;
  columnCount: number | null;
  darkenFilter: boolean | number | null;
  fontFamily: string | null;
  fontSize: number | null;
  fontOpticalSizing: number | null;
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
  noRuby: boolean | null;
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
  visitedLinkColor: string | null;
  wordSpacing: number | null;

  constructor(preferences: IEpubPreferences) {
    this.backgroundColor = preferences.backgroundColor || null;
    this.blendFilter = preferences.blendFilter || null;
    this.columnCount = EpubPreferences.ensureNonNegative(preferences.columnCount);
    this.darkenFilter = EpubPreferences.ensureFilter(preferences.darkenFilter);
    this.fontFamily = preferences.fontFamily || null;
    this.fontSize = EpubPreferences.valueInRange(preferences.fontSize, 50, 250);
    this.fontOpticalSizing = EpubPreferences.ensureNonNegative(preferences.fontOpticalSizing);
    this.fontWeight = EpubPreferences.valueInRange(preferences.fontWeight, 100, 1000);
    this.fontWidth = EpubPreferences.valueInRange(preferences.fontWidth, 10, 1000);
    this.hyphens = preferences.hyphens || null;
    this.invertFilter = EpubPreferences.ensureFilter(preferences.invertFilter);
    this.invertGaijiFilter = EpubPreferences.ensureFilter(preferences.invertGaijiFilter);
    this.letterSpacing = EpubPreferences.ensureNonNegative(preferences.letterSpacing);
    this.ligatures = preferences.ligatures || null;
    this.lineHeight = EpubPreferences.ensureNonNegative(preferences.lineHeight);
    this.lineLength = EpubPreferences.ensureNonNegative(preferences.lineLength);
    this.linkColor = preferences.linkColor || null;
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
    this.visitedLinkColor = preferences.visitedLinkColor || null;
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

  static valueInRange(value: number | null | undefined, min: number, max: number): number | null {
    return value !== undefined && value !== null && value >= min && value <= max ? value : null;
  }

  merging(other: ConfigurablePreferences): ConfigurablePreferences {
    const merged: IEpubPreferences = { ...this, ...other };
    return new EpubPreferences(merged);
  }
}