import {
  ExperimentKey,
  fontWeightRangeConfig,
  TextAlignment,
  zoomRangeConfig
} from "../../preferences/Types.ts";

import {
  ensureBoolean,
  ensureEnumValue,
  ensureNonNegative,
  ensureValueInRange,
  ensureString,
  ensureExperiment
} from "../../preferences/guards.ts";

import { sMLWithRequest } from "@readium/navigator-html-injectables";

export interface IWebPubDefaults {
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

export class WebPubDefaults {
  fontFamily: string | null;
  fontWeight: number | null;
  hyphens: boolean | null;
  iOSPatch: boolean | null;
  iPadOSPatch: boolean | null;
  letterSpacing: number | null;
  ligatures: boolean | null;
  lineHeight: number | null;
  noRuby: boolean | null;
  paragraphIndent: number | null;
  paragraphSpacing: number | null;
  textAlign: TextAlignment | null;
  textNormalization: boolean | null;
  wordSpacing: number | null;
  zoom: number;
  experiments: Array<ExperimentKey> | null;

  constructor(defaults: IWebPubDefaults) {
    this.fontFamily = ensureString(defaults.fontFamily) || null;
    this.fontWeight = ensureValueInRange(defaults.fontWeight, fontWeightRangeConfig.range) || null;
    this.hyphens = ensureBoolean(defaults.hyphens) ?? null;
    this.iOSPatch = defaults.iOSPatch === false
        ? false
        : ((sMLWithRequest.OS.iOS || sMLWithRequest.OS.iPadOS) && sMLWithRequest.iOSRequest === "mobile");
    this.iPadOSPatch = defaults.iPadOSPatch === false
        ? false
        : (sMLWithRequest.OS.iPadOS && sMLWithRequest.iOSRequest === "desktop");
    this.letterSpacing = ensureNonNegative(defaults.letterSpacing) || null;
    this.ligatures = ensureBoolean(defaults.ligatures) ?? null;
    this.lineHeight = ensureNonNegative(defaults.lineHeight) || null;
    this.noRuby = ensureBoolean(defaults.noRuby) ?? false;
    this.paragraphIndent = ensureNonNegative(defaults.paragraphIndent) ?? null;
    this.paragraphSpacing = ensureNonNegative(defaults.paragraphSpacing) ?? null;
    this.textAlign = ensureEnumValue<TextAlignment>(defaults.textAlign, TextAlignment) || null;
    this.textNormalization = ensureBoolean(defaults.textNormalization) ?? false;
    this.wordSpacing = ensureNonNegative(defaults.wordSpacing) || null;
    this.zoom = ensureValueInRange(defaults.zoom, zoomRangeConfig.range) || 1;
    this.experiments = ensureExperiment(defaults.experiments) ?? null;
  }
}
