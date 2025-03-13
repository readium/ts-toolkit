import { PaginationStrategy, TextAlignment, Theme } from "../../preferences/Types";

export interface IEpubDefaults {
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
  maximalLineLength?: number | null,
  minimalLineLength?: number | null,
  noRuby?: boolean | null,
  optimalLineLength?: number | null,
  pageGutter?: number | null,
  paginationStrategy?: PaginationStrategy | null,
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
  constraint: number;
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
  maximalLineLength: number | null;
  minimalLineLength: number | null;
  noRuby: boolean | null;
  optimalLineLength: number;
  pageGutter: number | null;
  paginationStrategy: PaginationStrategy | null;
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
    this.backgroundColor = defaults.backgroundColor === undefined ? null : defaults.backgroundColor;
    this.blendFilter = typeof defaults.blendFilter === "boolean" 
      ? defaults.blendFilter 
      : false;
    this.columnCount = defaults.columnCount === undefined ? null : defaults.columnCount;
    this.constraint = defaults.constraint || 0;
    this.darkenFilter = typeof defaults.darkenFilter === "boolean" || typeof defaults.darkenFilter === "number"
      ? defaults.darkenFilter
      : false;
    this.fontFamily = defaults.fontFamily === undefined ? null : defaults.fontFamily;
    this.fontSize = defaults.fontSize === undefined ? 1 : defaults.fontSize;
    this.fontOpticalSizing = typeof defaults.fontOpticalSizing === "boolean" 
      ? defaults.fontOpticalSizing 
      : null;
    this.fontWeight = defaults.fontWeight === undefined ? null : defaults.fontWeight;
    this.fontWidth = defaults.fontWidth === undefined ? null : defaults.fontWidth;
    this.hyphens = typeof defaults.hyphens === "boolean" 
      ? defaults.hyphens 
      : null;
    this.invertFilter = typeof defaults.invertFilter === "boolean" || typeof defaults.invertFilter === "number"
      ? defaults.invertFilter 
      : false;
    this.invertGaijiFilter = typeof defaults.invertGaijiFilter === "boolean" || typeof defaults.invertGaijiFilter === "number"
      ? defaults.invertGaijiFilter 
      : false;
    this.letterSpacing = defaults.letterSpacing === undefined ? null : defaults.letterSpacing;
    this.ligatures = typeof defaults.ligatures === "boolean" 
      ? defaults.ligatures 
      : null;
    this.lineHeight = defaults.lineHeight === undefined ? null : defaults.lineHeight;
    this.lineLength = defaults.lineLength === undefined ? null : defaults.lineLength;
    this.linkColor = defaults.linkColor === undefined ? null : defaults.linkColor;
    this.maximalLineLength = defaults.maximalLineLength === undefined ? 80 : defaults.maximalLineLength;
    this.minimalLineLength = defaults.minimalLineLength === undefined ? 40 : defaults.minimalLineLength;
    this.noRuby = typeof defaults.noRuby === "boolean" 
      ? defaults.noRuby 
      : false;
    this.optimalLineLength = defaults.optimalLineLength || 65;
    this.pageGutter = defaults.pageGutter === undefined ? 20 : defaults.pageGutter;
    this.paginationStrategy = defaults.paginationStrategy || PaginationStrategy.lineLength;
    this.paragraphIndent = defaults.paragraphIndent === undefined ? null : defaults.paragraphIndent;
    this.paragraphSpacing = defaults.paragraphSpacing === undefined ? null : defaults.paragraphSpacing;
    this.publisherStyles = typeof defaults.publisherStyles === "boolean" 
      ? defaults.publisherStyles 
      : true;
    this.scroll = typeof defaults.scroll === "boolean" 
      ? defaults.scroll 
      : false;
    this.selectionBackgroundColor = defaults.selectionBackgroundColor === undefined ? null : defaults.selectionBackgroundColor;
    this.selectionTextColor = defaults.selectionTextColor === undefined ? null : defaults.selectionTextColor;
    this.textAlign = defaults.textAlign === undefined ? null : defaults.textAlign;
    this.textColor = defaults.textColor === undefined ? null : defaults.textColor;
    this.textNormalization = typeof defaults.textNormalization === "boolean" 
      ? defaults.textNormalization 
      : false;
    this.theme = defaults.theme === undefined ? null : defaults.theme;
    this.visitedColor = defaults.visitedColor === undefined ? null : defaults.visitedColor;
    this.wordSpacing = defaults.wordSpacing === undefined ? null : defaults.wordSpacing;
  }
}