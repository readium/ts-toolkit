import { 
  ExperimentKey,
  fontSizeRangeConfig, 
  fontWeightRangeConfig, 
  fontWidthRangeConfig, 
  TextAlignment
} from "../../preferences/Types";

import { 
  ensureBoolean, 
  ensureEnumValue, 
  ensureExperiment, 
  ensureFilter, 
  ensureLessThanOrEqual, 
  ensureMoreThanOrEqual, 
  ensureNonNegative, 
  ensureString, 
  ensureValueInRange, 
  withFallback 
} from "../../preferences/guards";

import { sMLWithRequest } from "../../helpers";

export interface IEpubDefaults {
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
  invertGaijiFilter?: boolean | number | null,
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
  wordSpacing?: number | null,
  experiments?: Array<ExperimentKey> | null
}

export class EpubDefaults {
  backgroundColor: string | null;
  blendFilter: boolean | null;
  columnCount: number | null;
  constraint: number;
  darkenFilter: boolean | number | null;
  deprecatedFontSize?: boolean | null;
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
  experiments: Array<ExperimentKey> | null;

  constructor(defaults: IEpubDefaults) {
    this.backgroundColor = ensureString(defaults.backgroundColor) || null;
    this.blendFilter = ensureBoolean(defaults.blendFilter) ?? false;
    this.constraint = ensureNonNegative(defaults.constraint) || 0;
    this.columnCount = ensureNonNegative(defaults.columnCount) || null;
    this.darkenFilter = ensureFilter(defaults.darkenFilter) ?? false;
    this.deprecatedFontSize = ensureBoolean(defaults.deprecatedFontSize);
    if (this.deprecatedFontSize === false || this.deprecatedFontSize === null) {
      this.deprecatedFontSize = !CSS.supports("zoom", "1");
    }
    this.fontFamily = ensureString(defaults.fontFamily) || null;
    this.fontSize = ensureValueInRange(defaults.fontSize, fontSizeRangeConfig.range) || 1;
    this.fontSizeNormalize = ensureBoolean(defaults.fontSizeNormalize) ?? false;
    this.fontOpticalSizing = ensureBoolean(defaults.fontOpticalSizing) ?? null;
    this.fontWeight = ensureValueInRange(defaults.fontWeight, fontWeightRangeConfig.range) || null;
    this.fontWidth = ensureValueInRange(defaults.fontWidth,fontWidthRangeConfig.range) || null;
    this.hyphens = ensureBoolean(defaults.hyphens) ?? null;
    this.invertFilter = ensureFilter(defaults.invertFilter) ?? false;
    this.invertGaijiFilter = ensureFilter(defaults.invertGaijiFilter) ?? false;
    this.iOSPatch = defaults.iOSPatch === false 
        ? false 
        : ((sMLWithRequest.OS.iOS || sMLWithRequest.OS.iPadOS) && sMLWithRequest.iOSRequest === "mobile");
    this.iPadOSPatch = defaults.iPadOSPatch === false 
        ? false 
        : (sMLWithRequest.OS.iPadOS && sMLWithRequest.iOSRequest === "desktop");
    this.letterSpacing = ensureNonNegative(defaults.letterSpacing) || null;
    this.ligatures = ensureBoolean(defaults.ligatures) ?? null;
    this.lineHeight = ensureNonNegative(defaults.lineHeight) || null;
    this.linkColor = ensureString(defaults.linkColor) || null;
    this.noRuby = ensureBoolean(defaults.noRuby) ?? false;
    this.pageGutter = withFallback(ensureNonNegative(defaults.pageGutter), 20);
    this.paragraphIndent = ensureNonNegative(defaults.paragraphIndent) ?? null;
    this.paragraphSpacing = ensureNonNegative(defaults.paragraphSpacing) ?? null;
    this.scroll = ensureBoolean(defaults.scroll) ?? false;
    this.scrollPaddingTop = ensureNonNegative(defaults.scrollPaddingTop) ?? null;
    this.scrollPaddingBottom = ensureNonNegative(defaults.scrollPaddingBottom) ?? null;
    // this.scrollPaddingLeft = ensureNonNegative(defaults.scrollPaddingLeft) ?? null;
    // this.scrollPaddingRight = ensureNonNegative(defaults.scrollPaddingRight) ?? null;
    this.selectionBackgroundColor = ensureString(defaults.selectionBackgroundColor) || null;
    this.selectionTextColor = ensureString(defaults.selectionTextColor) || null;
    this.textAlign = ensureEnumValue<TextAlignment>(defaults.textAlign, TextAlignment) || null;
    this.textColor = ensureString(defaults.textColor) || null;
    this.textNormalization = ensureBoolean(defaults.textNormalization) ?? false;
    this.visitedColor = ensureString(defaults.visitedColor) || null;
    this.wordSpacing = ensureNonNegative(defaults.wordSpacing) || null;

    this.optimalLineLength = ensureNonNegative(defaults.optimalLineLength) || 65;
    this.maximalLineLength = withFallback(ensureMoreThanOrEqual(defaults.maximalLineLength, this.optimalLineLength), 80);
    this.minimalLineLength = withFallback(ensureLessThanOrEqual(defaults.minimalLineLength, this.optimalLineLength), 40);

    this.experiments = ensureExperiment(defaults.experiments) || null;
  }
}