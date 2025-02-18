import { TextAlignment, Theme } from "../../preferences/Types";

// Expose everything available in Preferences except blend and gaiji filters ATM
export interface IEpubDefaults {
  backgroundColor?: string | null;
  columnCount?: number | null;
  darkenFilter?: boolean | number | null,
  fontFamily?: string | null;
  fontSize?: number | null;
  fontOpticalSizing?: number | null;
  fontWeight?: number | null;
  fontWidth?: number | null;
  hyphens?: boolean | null;
  invertFilter?: boolean | number | null,
  letterSpacing?: number | null;
  ligatures?: boolean | null;
  lineHeight?: number | null;
  lineLength?: number | null;
  linkColor?: string | null;
  minimalLineLength?: number | null;
  noRuby?: boolean | null;
  optimalLineLength?: number | null;
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
  visitedLinkColor?: string | null;
  wordSpacing?: number | null;
}

export class EpubDefaults {
  backgroundColor: string | null;
  columnCount: number | null;
  darkenFilter: boolean | number | null;
  fontFamily: string | null;
  fontSize: number | null;
  fontOpticalSizing: number | null;
  fontWeight: number | null;
  fontWidth: number | null;
  hyphens: boolean | null;
  invertFilter: boolean | number | null;
  letterSpacing: number | null;
  ligatures: boolean | null;
  lineHeight: number | null;
  lineLength: number | null;
  linkColor: string | null;
  minimalLineLength?: number | null;
  noRuby: boolean | null;
  optimalLineLength: number | null;
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

  constructor(defaults: IEpubDefaults) {
    this.backgroundColor = defaults.backgroundColor || null;
    this.columnCount = defaults.columnCount || null;
    this.darkenFilter = defaults.darkenFilter || null;
    this.fontFamily = defaults.fontFamily || null;
    this.fontSize = defaults.fontSize || null;
    this.fontOpticalSizing = defaults.fontOpticalSizing || null;
    this.fontWeight = defaults.fontWeight || null;
    this.fontWidth = defaults.fontWidth || null;
    this.hyphens = defaults.hyphens || null;
    this.invertFilter = defaults.invertFilter || null;
    this.letterSpacing = defaults.letterSpacing || null;
    this.ligatures = defaults.ligatures || null;
    this.lineHeight = defaults.lineHeight || null;
    this.lineLength = defaults.lineLength || null;
    this.linkColor = defaults.linkColor || null;
    this.minimalLineLength = defaults.minimalLineLength;
    this.noRuby = defaults.noRuby || null;
    this.optimalLineLength = defaults.optimalLineLength || null;
    this.pageGutter = defaults.pageGutter || null;
    this.paragraphIndent = defaults.paragraphIndent || null;
    this.paragraphSpacing = defaults.paragraphSpacing || null;
    this.publisherStyles = defaults.publisherStyles || null;
    this.scroll = defaults.scroll || null;
    this.selectionBackgroundColor = defaults.selectionBackgroundColor || null;
    this.selectionTextColor = defaults.selectionTextColor || null;
    this.textAlign = defaults.textAlign || null;
    this.textColor = defaults.textColor || null;
    this.textNormalization = defaults.textNormalization || null;
    this.theme = defaults.theme || null;
    this.visitedLinkColor = defaults.visitedLinkColor || null;
    this.wordSpacing = defaults.wordSpacing || null;
  }
}