import { ConfigurableSettings } from "../../preferences/Configurable";
import { TextAlignment } from "../../preferences/Types";
import { EpubDefaults } from "./EpubDefaults";
import { EpubPreferences } from "./EpubPreferences";

import { sMLWithRequest } from "../../helpers";

export interface IEpubSettings {
  backgroundColor?: string | null,
  blendFilter?: boolean | null,
  columnCount?: number | null,
  constraint?: number | null,
  darkenFilter?: boolean | number | null,
  deprecatedFontSize?: boolean | null,
  fontFamily?: string | null,
  fontSize?: number | null,
  fontSizeNormalize?: boolean | null,
  fontOpticalSizing?: boolean | null,
  fontWeight?: number | null,
  fontWidth?: number | null,
  hyphens?: boolean | null,
  invertFilter?: boolean | number | null,
  invertGaijiFilter: boolean | number | null,
  iOSPatch?: boolean | null,
  iPadOSPatch?: boolean | null,
  letterSpacing?: number | null,
  ligatures?: boolean | null,
  lineHeight?: number | null,
  linkColor?: string | null,
  maximalLineLength?: number | null,
  minimalLineLength?: number | null,
  noRuby?: boolean | null,
  optimalLineLength?: number | null,
  pageGutter?: number | null,
  paragraphIndent?: number | null,
  paragraphSpacing?: number | null,
  scroll?: boolean | null,
  scrollPaddingTop?: number | null,
  scrollPaddingBottom?: number | null,
  // scrollPaddingLeft?: number | null,
  // scrollPaddingRight?: number | null,
  selectionBackgroundColor?: string | null,
  selectionTextColor?: string | null,
  textAlign?: TextAlignment | null,
  textColor?: string | null,
  textNormalization?: boolean | null,
  visitedColor?: string | null,
  wordSpacing?: number | null
}

export class EpubSettings implements ConfigurableSettings {
  backgroundColor: string | null;
  blendFilter: boolean | null;
  columnCount: number | null;
  constraint: number;
  darkenFilter: boolean | number | null;
  deprecatedFontSize: boolean | null;
  fontFamily: string | null;
  fontSize: number | null;
  fontSizeNormalize: boolean | null;
  fontOpticalSizing: boolean | null;
  fontWeight: number | null;
  fontWidth: number | null;
  hyphens: boolean | null;
  invertFilter: boolean | number | null;
  invertGaijiFilter: boolean | number | null;
  iOSPatch: boolean;
  iPadOSPatch: boolean;
  letterSpacing: number | null;
  ligatures: boolean | null;
  lineHeight: number | null;
  linkColor: string | null;
  maximalLineLength: number | null;
  minimalLineLength: number | null;
  noRuby: boolean | null;
  optimalLineLength: number;
  pageGutter: number | null;
  paragraphIndent: number | null;
  paragraphSpacing: number | null;
  scroll: boolean | null;
  scrollPaddingTop: number | null;
  scrollPaddingBottom: number | null;
  // scrollPaddingLeft: number | null;
  // scrollPaddingRight: number | null;
  selectionBackgroundColor: string | null;
  selectionTextColor: string | null;
  textAlign: TextAlignment | null;
  textColor: string | null;
  textNormalization: boolean | null;
  visitedColor: string | null;
  wordSpacing: number | null;

  constructor(preferences: EpubPreferences, defaults: EpubDefaults) {
    this.backgroundColor = preferences.backgroundColor || defaults.backgroundColor || null;
    this.blendFilter = typeof preferences.blendFilter === "boolean" 
      ? preferences.blendFilter 
      : defaults.blendFilter ?? null;
    this.columnCount = preferences.columnCount !== undefined 
      ? preferences.columnCount 
      : defaults.columnCount !== undefined 
        ? defaults.columnCount 
        : null;
    this.constraint = preferences.constraint || defaults.constraint;
    this.darkenFilter = typeof preferences.darkenFilter === "boolean" 
      ? preferences.darkenFilter 
      : defaults.darkenFilter ?? null;
    this.deprecatedFontSize = typeof preferences.deprecatedFontSize === "boolean" 
      ? preferences.deprecatedFontSize 
      : defaults.deprecatedFontSize ?? null;
    this.fontFamily = preferences.fontFamily || defaults.fontFamily || null;
    this.fontSize = preferences.fontSize !== undefined 
      ? preferences.fontSize 
      : defaults.fontSize !== undefined 
        ? defaults.fontSize 
        : null;
    this.fontSizeNormalize = typeof preferences.fontSizeNormalize === "boolean" 
      ? preferences.fontSizeNormalize 
      : defaults.fontSizeNormalize ?? null;
    this.fontOpticalSizing = typeof preferences.fontOpticalSizing === "boolean" 
      ? preferences.fontOpticalSizing 
      : defaults.fontOpticalSizing ?? null;
    this.fontWeight = preferences.fontWeight !== undefined 
      ? preferences.fontWeight 
      : defaults.fontWeight !== undefined 
        ? defaults.fontWeight 
        : null;
    this.fontWidth = preferences.fontWidth !== undefined 
      ? preferences.fontWidth 
      : defaults.fontWidth !== undefined 
        ? defaults.fontWidth 
        : null;
    this.hyphens = typeof preferences.hyphens === "boolean" 
      ? preferences.hyphens 
      : defaults.hyphens ?? null;
    this.invertFilter = typeof preferences.invertFilter === "boolean" 
      ? preferences.invertFilter 
      : defaults.invertFilter ?? null;
    this.invertGaijiFilter = typeof preferences.invertGaijiFilter === "boolean" 
      ? preferences.invertGaijiFilter 
      : defaults.invertGaijiFilter ?? null;
    this.iOSPatch = this.deprecatedFontSize 
      ? false 
      : preferences.iOSPatch === false 
        ? false 
        : preferences.iOSPatch === true 
          ? ((sMLWithRequest.OS.iOS || sMLWithRequest.OS.iPadOS) && sMLWithRequest.iOSRequest === "mobile")
          : defaults.iOSPatch;
    this.iPadOSPatch = this.deprecatedFontSize 
      ? false 
      : preferences.iPadOSPatch === false 
        ? false 
        : preferences.iPadOSPatch === true 
          ? (sMLWithRequest.OS.iPadOS && sMLWithRequest.iOSRequest === "desktop") 
          : defaults.iPadOSPatch;
    this.letterSpacing = preferences.letterSpacing !== undefined 
      ? preferences.letterSpacing 
      : defaults.letterSpacing !== undefined 
        ? defaults.letterSpacing 
        : null;
    this.ligatures = typeof preferences.ligatures === "boolean"
      ? preferences.ligatures 
      : defaults.ligatures ?? null;
    this.lineHeight = preferences.lineHeight !== undefined 
      ? preferences.lineHeight 
      : defaults.lineHeight !== undefined 
        ? defaults.lineHeight 
        : null;
    this.linkColor = preferences.linkColor || defaults.linkColor || null;
    this.maximalLineLength = preferences.maximalLineLength === null 
      ? null 
      : preferences.maximalLineLength || defaults.maximalLineLength || null;
    this.minimalLineLength = preferences.minimalLineLength === null 
      ? null 
      : preferences.minimalLineLength || defaults.minimalLineLength || null;
    this.noRuby = typeof preferences.noRuby === "boolean" 
      ? preferences.noRuby 
      : defaults.noRuby ?? null;
    this.optimalLineLength = preferences.optimalLineLength || defaults.optimalLineLength;
    this.pageGutter = preferences.pageGutter !== undefined 
      ? preferences.pageGutter 
      : defaults.pageGutter !== undefined 
        ? defaults.pageGutter 
        : null;
    this.paragraphIndent = preferences.paragraphIndent !== undefined 
      ? preferences.paragraphIndent 
      : defaults.paragraphIndent !== undefined 
        ? defaults.paragraphIndent 
        : null;
    this.paragraphSpacing = preferences.paragraphSpacing !== undefined 
      ? preferences.paragraphSpacing 
      : defaults.paragraphSpacing !== undefined 
        ? defaults.paragraphSpacing 
        : null;
    this.scroll = typeof preferences.scroll === "boolean" 
      ? preferences.scroll 
      : defaults.scroll ?? null;
    this.scrollPaddingTop = preferences.scrollPaddingTop !== undefined 
      ? preferences.scrollPaddingTop 
      : defaults.scrollPaddingTop !== undefined 
        ? defaults.scrollPaddingTop 
        : null;
    this.scrollPaddingBottom = preferences.scrollPaddingBottom !== undefined 
      ? preferences.scrollPaddingBottom 
      : defaults.scrollPaddingBottom !== undefined 
        ? defaults.scrollPaddingBottom 
        : null;
    /* 
    this.scrollPaddingLeft = preferences.scrollPaddingLeft !== undefined 
      ? preferences.scrollPaddingLeft 
      : defaults.scrollPaddingLeft !== undefined 
        ? defaults.scrollPaddingLeft 
        : null;
    this.scrollPaddingRight = preferences.scrollPaddingRight !== undefined 
      ? preferences.scrollPaddingRight 
      : defaults.scrollPaddingRight !== undefined 
        ? defaults.scrollPaddingRight 
        : null;
    */
    this.selectionBackgroundColor = preferences.selectionBackgroundColor || defaults.selectionBackgroundColor || null;
    this.selectionTextColor = preferences.selectionTextColor || defaults.selectionTextColor || null;
    this.textAlign = preferences.textAlign || defaults.textAlign || null;
    this.textColor = preferences.textColor || defaults.textColor || null;
    this.textNormalization = typeof preferences.textNormalization === "boolean" 
      ? preferences.textNormalization 
      : defaults.textNormalization ?? null;
    this.visitedColor = preferences.visitedColor || defaults.visitedColor || null;
    this.wordSpacing = preferences.wordSpacing !== undefined 
      ? preferences.wordSpacing 
      : defaults.wordSpacing !== undefined 
        ? defaults.wordSpacing 
        : null;
  }
}