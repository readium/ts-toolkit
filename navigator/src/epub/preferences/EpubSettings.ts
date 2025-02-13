import { ConfigurableSettings } from "../../preferences/Configurable";
import { TextAlignment, Theme } from "../../preferences/Types";

// Expose everything available in Preferences except blend and gaiji filters ATM
export interface IEpubSettings {
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
  noRuby?: boolean | null;
  pageMargins?: number | null;
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

export class EpubSettings implements ConfigurableSettings {
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

  constructor(settings: IEpubSettings) {
    this.backgroundColor = settings.backgroundColor || null;
    this.columnCount = settings.columnCount || null;
    this.darkenFilter = settings.darkenFilter || null;
    this.fontFamily = settings.fontFamily || null;
    this.fontSize = settings.fontSize || null;
    this.fontOpticalSizing = settings.fontOpticalSizing || null;
    this.fontWeight = settings.fontWeight || null;
    this.fontWidth = settings.fontWidth || null;
    this.hyphens = settings.hyphens || null;
    this.invertFilter = settings.invertFilter || null;
    this.letterSpacing = settings.letterSpacing || null;
    this.ligatures = settings.ligatures || null;
    this.lineHeight = settings.lineHeight || null;
    this.lineLength = settings.lineLength || null;
    this.linkColor = settings.linkColor || null;
    this.noRuby = settings.noRuby || null;
    this.pageMargins = settings.pageMargins || null;
    this.paragraphIndent = settings.paragraphIndent || null;
    this.paragraphSpacing = settings.paragraphSpacing || null;
    this.publisherStyles = settings.publisherStyles || null;
    this.scroll = settings.scroll || null;
    this.selectionBackgroundColor = settings.selectionBackgroundColor || null;
    this.selectionTextColor = settings.selectionTextColor || null;
    this.textAlign = settings.textAlign || null;
    this.textColor = settings.textColor || null;
    this.textNormalization = settings.textNormalization || null;
    this.theme = settings.theme || null;
    this.visitedLinkColor = settings.visitedLinkColor || null;
    this.wordSpacing = settings.wordSpacing || null;
  }
}