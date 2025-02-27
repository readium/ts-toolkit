import { ConfigurableSettings } from "../../preferences/Configurable";
import { TextAlignment, Theme } from "../../preferences/Types";
import { EpubDefaults } from "./EpubDefaults";
import { EpubPreferences } from "./EpubPreferences";

export interface IEpubSettings {
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
  invertGaijiFilter: boolean | number | null,
  letterSpacing?: number | null,
  ligatures?: boolean | null,
  lineHeight?: number | null,
  lineLength?: number | null,
  linkColor?: string | null,
  noRuby?: boolean | null,
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

export class EpubSettings implements ConfigurableSettings {
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
  noRuby: boolean | null;
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

  constructor(preferences: EpubPreferences, defaults: EpubDefaults) {
    this.backgroundColor = preferences.backgroundColor || defaults.backgroundColor || null;
    this.blendFilter = typeof preferences.blendFilter === "boolean" 
      ? preferences.blendFilter 
      : defaults.blendFilter || null;
    this.columnCount = preferences.columnCount || defaults.columnCount || null;
    this.darkenFilter = typeof preferences.darkenFilter === "boolean" 
      ? preferences.darkenFilter 
      : defaults.darkenFilter || null;
    this.fontFamily = preferences.fontFamily || defaults.fontFamily || null;
    this.fontSize = preferences.fontSize || defaults.fontSize || null;
    this.fontOpticalSizing = typeof preferences.fontOpticalSizing === "boolean" 
      ? preferences.fontOpticalSizing 
      : defaults.fontOpticalSizing || null;
    this.fontWeight = preferences.fontWeight || defaults.fontWeight || null;
    this.fontWidth = preferences.fontWidth || defaults.fontWidth || null;
    this.hyphens = typeof preferences.hyphens === "boolean" 
      ? preferences.hyphens 
      : defaults.hyphens || null;
    this.invertFilter = typeof preferences.invertFilter === "boolean" 
      ? preferences.invertFilter 
      : defaults.invertFilter || null;
    this.invertGaijiFilter = typeof preferences.invertGaijiFilter === "boolean" 
      ? preferences.invertGaijiFilter 
      : defaults.invertGaijiFilter || null;
    this.letterSpacing = preferences.letterSpacing || defaults.letterSpacing || null;
    this.ligatures = typeof preferences.ligatures === "boolean"
      ? preferences.ligatures 
      : defaults.ligatures || null;
    this.lineHeight = preferences.lineHeight || defaults.lineHeight || null;
    this.lineLength = preferences.lineLength || defaults.lineLength || null;
    this.linkColor = preferences.linkColor || defaults.linkColor || null;
    this.noRuby = typeof preferences.noRuby === "boolean" 
      ? preferences.noRuby 
      : defaults.noRuby || null;
    this.paragraphIndent = preferences.paragraphIndent || defaults.paragraphIndent || null;
    this.paragraphSpacing = preferences.paragraphSpacing || defaults.paragraphSpacing || null;
    this.publisherStyles = typeof preferences.publisherStyles === "boolean" 
      ? preferences.publisherStyles 
      : defaults.publisherStyles || null;
    this.scroll = typeof preferences.scroll === "boolean" 
      ? preferences.scroll 
      : defaults.scroll || null;
    this.selectionBackgroundColor = preferences.selectionBackgroundColor || defaults.selectionBackgroundColor || null;
    this.selectionTextColor = preferences.selectionTextColor || defaults.selectionTextColor || null;
    this.textAlign = preferences.textAlign || defaults.textAlign || null;
    this.textColor = preferences.textColor || defaults.textColor || null;
    this.textNormalization = typeof preferences.textNormalization === "boolean" 
      ? preferences.textNormalization 
      : defaults.textNormalization || null;
    this.theme = preferences.theme || defaults.theme || null;
    this.visitedColor = preferences.visitedColor || defaults.visitedColor || null;
    this.wordSpacing = preferences.wordSpacing || defaults.wordSpacing || null;
  }
}