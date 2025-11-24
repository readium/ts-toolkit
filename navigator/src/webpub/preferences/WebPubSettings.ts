import { ConfigurableSettings } from "../../preferences/Configurable";
import { ExperimentKey, TextAlignment } from "../../preferences/Types";
import { WebPubDefaults } from "./WebPubDefaults";
import { WebPubPreferences } from "./WebPubPreferences";

import { sMLWithRequest } from "../../helpers";

export interface IWebPubSettings {
  fontFamily?: string | null,
  fontWeight?: number | null,
  hyphens?: boolean | null,
  iOSPatch?: boolean | null,
  iPadOSPatch?: boolean | null,
  letterSpacing?: number | null,
  ligatures?: boolean | null,
  lineHeight?: number | null,
  noRuby?: boolean | null,
  paragraphIndent?: number | null,
  paragraphSpacing?: number | null,
  textAlign?: TextAlignment | null,
  textNormalization?: boolean | null,
  wordSpacing?: number | null,
  zoom?: number | null,
  experiments?: Array<ExperimentKey> | null,
}

export class WebPubSettings implements ConfigurableSettings {
  fontFamily: string | null = null;
  fontWeight: number | null = null;
  hyphens: boolean | null = null;
  iOSPatch: boolean | null = null;
  iPadOSPatch: boolean | null = null;
  letterSpacing: number | null = null;
  ligatures: boolean | null = null;
  lineHeight: number | null = null;
  noRuby: boolean | null = null;
  paragraphIndent: number | null = null;
  paragraphSpacing: number | null = null;
  textAlign: TextAlignment | null = null;
  textNormalization: boolean | null = null;
  wordSpacing: number | null = null;
  zoom: number | null;
  experiments: Array<ExperimentKey> | null;

  constructor(preferences: WebPubPreferences, defaults: WebPubDefaults, hasDisplayTransformability: boolean) {
    if (hasDisplayTransformability) {
      this.fontFamily = preferences.fontFamily || defaults.fontFamily || null;
      this.fontWeight = preferences.fontWeight !== undefined 
        ? preferences.fontWeight 
        : defaults.fontWeight !== undefined 
          ? defaults.fontWeight 
          : null;
      this.hyphens = typeof preferences.hyphens === "boolean" 
        ? preferences.hyphens 
        : defaults.hyphens ?? null;
      this.iOSPatch = preferences.iOSPatch === false 
        ? false 
        : preferences.iOSPatch === true 
          ? ((sMLWithRequest.OS.iOS || sMLWithRequest.OS.iPadOS) && sMLWithRequest.iOSRequest === "mobile")
          : defaults.iOSPatch;
      this.iPadOSPatch = preferences.iPadOSPatch === false 
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
      this.noRuby = typeof preferences.noRuby === "boolean" 
        ? preferences.noRuby 
        : defaults.noRuby ?? null;
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
      this.textAlign = preferences.textAlign || defaults.textAlign || null;
      this.textNormalization = typeof preferences.textNormalization === "boolean" 
        ? preferences.textNormalization 
        : defaults.textNormalization ?? null;
      this.wordSpacing = preferences.wordSpacing !== undefined 
        ? preferences.wordSpacing 
        : defaults.wordSpacing !== undefined 
          ? defaults.wordSpacing 
          : null;
    }
    
    this.zoom = preferences.zoom !== undefined
      ? preferences.zoom
      : defaults.zoom !== undefined
        ? defaults.zoom
        : null;

    this.experiments = defaults.experiments || null;
  }
}