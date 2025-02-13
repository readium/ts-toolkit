import { TextAlignment, Theme } from "../../preferences/Types";
import { ConfigurablePreferences } from "../../preferences/Configurable";

export interface IEPUBPreferences {
  backgroundColor?: string | null,
  columnCount?: number | null,
  fontFamily?: string | null,
  fontSize?: number | null,
  fontOpticalSizing?: number | null,
  fontWeight?: number | null,
  fontWidth?: number | null,
  hyphens?: boolean | null,
  // TODO Type of imageFilters cos it’s more complex to handle
  imageFilters?: any | null,
  letterSpacing?: number | null,
  ligatures?: boolean | null,
  lineHeight?: number | null,
  lineLength?: number | null,
  linkColor?: string | null,
  noRuby?: boolean | null,
  pageMargins?: number | null,
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

export class EPUBPreferences implements ConfigurablePreferences {
  backgroundColor: string | null;
  columnCount: number | null;
  fontFamily: string | null;
  fontSize: number | null;
  fontOpticalSizing: number | null;
  fontWeight: number | null;
  fontWidth: number | null;
  hyphens: boolean | null;
  imageFilters: any | null;
  letterSpacing: number | null;
  ligatures: boolean | null;
  lineHeight: number | null;
  lineLength: number | null;
  linkColor: string | null;
  noRuby: boolean | null;
  pageMargins: number | null;
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

  constructor(preferences: IEPUBPreferences) {
    this.backgroundColor = preferences.backgroundColor || null;
    this.columnCount = preferences.columnCount || null;
    this.fontFamily = preferences.fontFamily || null;
    this.fontSize = preferences.fontSize || null;
    this.fontOpticalSizing = preferences.fontOpticalSizing || null;
    this.fontWeight = preferences.fontWeight || null;
    this.fontWidth = preferences.fontWidth || null;
    this.hyphens = preferences.hyphens || null;
    this.imageFilters = preferences.imageFilters || null;
    this.letterSpacing = preferences.letterSpacing || null;
    this.ligatures = preferences.ligatures || null;
    this.lineHeight = preferences.lineHeight || null;
    this.lineLength = preferences.lineLength || null;
    this.linkColor = preferences.linkColor || null;
    this.noRuby = preferences.noRuby || null;
    this.pageMargins = preferences.pageMargins || null;
    this.paragraphIndent = preferences.paragraphIndent || null;
    this.paragraphSpacing = preferences.paragraphSpacing || null;
    this.publisherStyles = preferences.publisherStyles || null;
    this.scroll = preferences.scroll || null;
    this.selectionBackgroundColor = preferences.selectionBackgroundColor || null;
    this.selectionTextColor = preferences.selectionTextColor || null;
    this.textAlign = preferences.textAlign || null;
    this.textColor = preferences.textColor || null;
    this.textNormalization = preferences.textNormalization || null;
    this.theme = preferences.theme || null;
    this.visitedLinkColor = preferences.visitedLinkColor || null;
    this.wordSpacing = preferences.wordSpacing || null;
  }

  merging(other: ConfigurablePreferences): ConfigurablePreferences {
    const merged: IEPUBPreferences = { ...this, ...other };
    return new EPUBPreferences(merged);
  }
}