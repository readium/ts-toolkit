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

  constructor(preferences: IEpubPreferences) {
    this.backgroundColor = preferences.backgroundColor || null;
    this.blendFilter = preferences.blendFilter || null;
    this.columnCount = preferences.columnCount || null;
    this.darkenFilter = preferences.darkenFilter || null;
    this.fontFamily = preferences.fontFamily || null;
    this.fontSize = preferences.fontSize || null;
    this.fontOpticalSizing = preferences.fontOpticalSizing || null;
    this.fontWeight = preferences.fontWeight || null;
    this.fontWidth = preferences.fontWidth || null;
    this.hyphens = preferences.hyphens || null;
    this.invertFilter = preferences.invertFilter || null;
    this.invertGaijiFilter = preferences.invertGaijiFilter || null;
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
    const merged: IEpubPreferences = { ...this, ...other };
    return new EpubPreferences(merged);
  }
}