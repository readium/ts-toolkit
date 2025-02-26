import { TextAlignment, Theme } from "../../preferences/Types";

// Expose everything available in Preferences except blend and gaiji filters ATM
export interface IEpubDefaults {
  backgroundColor?: string | null,
  blendFilter?: boolean | null,
  columnCount?: number | null,
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
  optimalLineLength?: number | null,
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

export class EpubDefaults {
  backgroundColor: string | null;
  blendFilter: boolean | null;
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

  constructor(defaults: IEpubDefaults) {
    this.backgroundColor = defaults.backgroundColor || null;
    this.blendFilter = defaults.blendFilter || false;
    this.columnCount = defaults.columnCount || null;
    this.darkenFilter = defaults.darkenFilter || false;
    this.fontFamily = defaults.fontFamily || null;
    this.fontSize = defaults.fontSize || 1;
    this.fontOpticalSizing = defaults.fontOpticalSizing || null;
    this.fontWeight = defaults.fontWeight || null;
    this.fontWidth = defaults.fontWidth || null;
    this.hyphens = defaults.hyphens || null;
    this.invertFilter = defaults.invertFilter || false;
    this.invertGaijiFilter = defaults.invertGaijiFilter || false;
    this.letterSpacing = defaults.letterSpacing || null;
    this.ligatures = defaults.ligatures || null;
    this.lineHeight = defaults.lineHeight || null;
    this.lineLength = defaults.lineLength || null;
    this.linkColor = defaults.linkColor || null;
    this.minimalLineLength = defaults.minimalLineLength;
    this.noRuby = defaults.noRuby || false;
    this.optimalLineLength = defaults.optimalLineLength || 65;
    this.pageGutter = defaults.pageGutter || 20;
    this.paragraphIndent = defaults.paragraphIndent || null;
    this.paragraphSpacing = defaults.paragraphSpacing || null;
    this.publisherStyles = defaults.publisherStyles || true;
    this.scroll = defaults.scroll || false;
    this.selectionBackgroundColor = defaults.selectionBackgroundColor || null;
    this.selectionTextColor = defaults.selectionTextColor || null;
    this.textAlign = defaults.textAlign || null;
    this.textColor = defaults.textColor || null;
    this.textNormalization = defaults.textNormalization || false;
    this.theme = defaults.theme || null;
    this.visitedColor = defaults.visitedColor || null;
    this.wordSpacing = defaults.wordSpacing || null;
  }
}