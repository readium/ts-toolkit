import { TextAlignment, Theme } from "../../preferences/Types";

export type BodyHyphens = "auto" | "none";
export type BoxSizing = "content-box" | "border-box";
export type FontOpticalSizing = "auto" | "none";
export type FontWidth = "ultra-condensed" | "extra-condensed" | "condensed" | "semi-condensed" | "normal" | "semi-expanded" | "expanded" | "extra-expanded" | "ultra-expanded" | number;
export type Ligatures = "common-ligatures" | "none";
export type TypeScale = 1 | 1.067 | 1.125 | 1.2 | 1.25 | 1.333 | 1.414 | 1.5 | 1.618;
export type View = "paged" | "scroll";

abstract class Properties {
  constructor() {}

  protected toFlag(name: string) {
    return `readium-${ name }-on`;
  }

  protected toUnitless(value: number) {
    return value.toString();
  }

  protected toPercentage(value: number) {
    if (value > 0 && value <= 1) {
      return `${ value * 100 }%`;
    } else {
      return `${ value }%`;
    }
  }

  protected toVw(value: number) {
    if (value > 0 && value <= 1) {
      return `${ value * 100 }vw`;
    } else {
      return `${ value }vw`;
    }
  }

  protected toVh(value: number) {
    if (value > 0 && value <= 1) {
      return `${ value * 100 }vh`;
    } else {
      return `${ value }vh`;
    }
  }

  protected toPx(value: number) {
    return `${ value }px`;
  }

  protected toRem(value: number) {
    return `${ value }rem`;
  }

  abstract toCSSProperties(): { [key: string]: string };
}

export interface IProperties {
  advancedSettings?: boolean | null;
  a11yNormalize?: boolean | null;
  appearance?: Theme | null;
  backgroundColor?: string | null;
  blendFilter?: boolean | null;
  bodyHyphens?: BodyHyphens | null;
  colCount?: number | null;
  darkenFilter?: boolean | number | null;
  fontFamily?: string | null;
  fontOpticalSizing?: FontOpticalSizing | null;
  fontOverride?: boolean | null;
  fontSize?: number | null;
  fontWeight?: number | null;
  fontWidth?: FontWidth | null;
  invertFilter?: boolean | number | null;
  letterSpacing?: number | null;
  ligatures?: Ligatures | null;
  lineHeight?: number | null;
  lineLength?: number | null;
  noRuby?: boolean | null;
  paraIndent?: number | null;
  paraSpacing?: number | null;
  publisherStyles?: boolean | null;
  textAlign?: TextAlignment | null;
  textColor?: string | null;
  view?: View | null;
  wordSpacing?: number | null;
}

export class UserProperties extends Properties {
  advancedSettings: boolean | null;
  a11yNormalize: boolean | null;
  appearance: Theme | null;
  backgroundColor: string | null;
  blendFilter: boolean | null;
  bodyHyphens: BodyHyphens | null;
  colCount: number | null;
  darkenFilter: boolean | number | null;
  fontFamily: string | null;
  fontOpticalSizing: FontOpticalSizing | null;
  fontOverride: boolean | null;
  fontSize: number | null;
  fontWeight: number | null;
  fontWidth: FontWidth | null;
  invertFilter: boolean | number | null;
  letterSpacing: number | null;
  ligatures: Ligatures | null;
  lineHeight: number | null;
  lineLength: number | null;
  noRuby: boolean | null;
  paraIndent: number | null;
  paraSpacing: number | null;
  textAlign: TextAlignment | null;
  textColor: string | null;
  view: View | null;
  wordSpacing: number | null;

  constructor(props: IProperties) {
    super();
    this.advancedSettings = props.advancedSettings || null;
    this.a11yNormalize = props.a11yNormalize || null;
    this.appearance = props.appearance || null;
    this.backgroundColor = props.backgroundColor || null;
    this.blendFilter = props.blendFilter || null;
    this.bodyHyphens = props.bodyHyphens || null;
    this.colCount = props.colCount || null;
    this.darkenFilter = props.darkenFilter || null;
    this.fontFamily = props.fontFamily || null;
    this.fontOpticalSizing = props.fontOpticalSizing || null;
    this.fontOverride = props.fontOverride || null;
    this.fontSize = props.fontSize || null;
    this.fontWeight = props.fontWeight || null;
    this.fontWidth = props.fontWidth || null;
    this.invertFilter = props.invertFilter || null;
    this.letterSpacing = props.letterSpacing || null;
    this.ligatures = props.ligatures || null;
    this.lineHeight = props.lineHeight || null;
    this.lineLength = props.lineLength || null;
    this.noRuby = props.noRuby || null;
    this.paraIndent = props.paraIndent || null;
    this.paraSpacing = props.paraSpacing || null;
    this.textAlign = props.textAlign || null;
    this.textColor = props.textColor || null;
    this.view = props.view || null;
    this.wordSpacing = props.wordSpacing || null;
  }

  toCSSProperties() {
    const cssProperties: { [key: string]: string } = {};

    if (this.advancedSettings) cssProperties["--USER__advancedSettings"] = this.toFlag("advanced");
    if (this.a11yNormalize) cssProperties["--USER__a11yNormalize"] = this.toFlag("a11y");
    if (this.appearance) cssProperties["--USER__appearance"] = this.toFlag(this.appearance);
    if (this.backgroundColor) cssProperties["--USER__backgroundColor"] = this.backgroundColor;
    if (this.blendFilter) cssProperties["--USER__blendFilter"] = this.toFlag("blend");
    if (this.bodyHyphens) cssProperties["--USER__bodyHyphens"] = this.bodyHyphens;
    if (this.colCount) cssProperties["--USER__colCount"] = this.toUnitless(this.colCount);
    if (this.darkenFilter) {
      cssProperties["--USER__darkenFilter"] = typeof this.darkenFilter === "number" 
        ? this.toPercentage(this.darkenFilter) 
        : this.toFlag("darken");
    }
    if (this.fontFamily) cssProperties["--USER__fontFamily"] = this.fontFamily;
    if (this.fontOpticalSizing) cssProperties["--USER__fontOpticalSizing"] = this.fontOpticalSizing;
    if (this.fontOverride) cssProperties["--USER__fontOverride"] = this.toFlag("font");
    if (this.fontWeight) cssProperties["--USER__fontWeight"] = this.toUnitless(this.fontWeight);
    if (this.fontWidth) {
      cssProperties["--USER__fontWidth"] = typeof this.fontWidth === "string" 
      ? this.fontWidth 
      : this.toUnitless(this.fontWidth);
    } 
    if (this.fontSize) cssProperties["--USER__fontSize"] = this.toUnitless(this.fontSize);
    if (this.invertFilter) {
      cssProperties["--USER__invertFilter"] = typeof this.invertFilter === "number" 
        ? this.toPercentage(this.invertFilter)
        : this.toFlag("invert");
    }
    if (this.letterSpacing) cssProperties["--USER__letterSpacing"] = this.toRem(this.letterSpacing);
    if (this.ligatures) cssProperties["--USER__ligatures"] = this.ligatures;
    if (this.lineHeight) cssProperties["--USER__lineHeight"] = this.toUnitless(this.lineHeight);
    if (this.lineLength) cssProperties["--USER__lineLength"] = this.toRem(this.lineLength);
    if (this.noRuby) cssProperties["--USER__noRuby"] = this.toFlag("noRuby");
    if (this.paraIndent) cssProperties["--USER__paraIndent"] = this.toRem(this.paraIndent);
    if (this.paraSpacing) cssProperties["--USER__paraSpacing"] = this.toRem(this.paraSpacing);
    if (this.textAlign) cssProperties["--USER__textAlign"] = this.textAlign;
    if (this.textColor) cssProperties["--USER__textColor"] = this.textColor;
    if (this.view) cssProperties["--USER__view"] = this.toFlag(this.view);
    if (this.wordSpacing) cssProperties["--USER__wordSpacing"] = this.toRem(this.wordSpacing);

    return cssProperties;
  }
}

export interface IRSProperties {
  backgroundColor?: string | null;
  baseFontFamily?: string | null;
  baseFontSize?: number | null;
  baseLineHeight?: number | null;
  boxSizingMedia?: BoxSizing | null;
  boxSizingTable?: BoxSizing | null;
  colWidth?: string | null;
  colCount?: number | null;
  colGap?: number | null;
  codeFontFamily?: string | null;
  compFontFamily?: string | null;
  defaultLineLength?: number | null;
  flowSpacing?: number | null;
  humanistTf?: string | null;
  invertGaijiFilter?: boolean | number | null;
  linkColor?: string | null;
  maxMediaWidth?: number | null;
  maxMediaHeight?: number | null;
  modernTf?: string | null;
  monospaceTf?: string | null;
  noVerticalPagination?: boolean | null;
  oldStyleTf?: string | null;
  pageGutter?: number | null;
  paraIndent?: number | null;
  paraSpacing?: number | null;
  primaryColor?: string | null;
  sansSerifJa?: string | null;
  sansSerifJaV?: string | null;
  sansTf?: string | null;
  secondaryColor?: string | null;
  selectionBackgroundColor?: string | null;
  selectionTextColor?: string | null;
  serifJa?: string | null;
  serifJaV?: string | null;
  textColor?: string | null;
  typeScale?: TypeScale | null;
  visitedLinkColor?: string | null;
}

export class RSProperties extends Properties {
  backgroundColor: string | null;
  baseFontFamily: string | null;
  baseFontSize: number | null;
  baseLineHeight: number | null;
  boxSizingMedia: BoxSizing | null;
  boxSizingTable: BoxSizing | null;
  colWidth: string | null;
  colCount: number | null;
  colGap: number | null;
  codeFontFamily: string | null;
  compFontFamily: string | null;
  defaultLineLength: number | null;
  flowSpacing: number | null;
  humanistTf: string | null;
  invertGaijiFilter: boolean | number | null;
  linkColor: string | null;
  maxMediaWidth: number | null;
  maxMediaHeight: number | null;
  modernTf: string | null;
  monospaceTf: string | null;
  noVerticalPagination: boolean | null;
  oldStyleTf: string | null;
  pageGutter: number | null;
  paraIndent: number | null;
  paraSpacing: number | null;
  primaryColor: string | null;
  sansSerifJa: string | null;
  sansSerifJaV: string | null;
  sansTf: string | null;
  secondaryColor: string | null;
  selectionBackgroundColor: string | null;
  selectionTextColor: string | null;
  serifJa: string | null;
  serifJaV: string | null;
  textColor: string | null;
  typeScale: TypeScale | null;
  visitedLinkColor: string | null;

  constructor(props: IRSProperties) {
    super();
    this.backgroundColor = props.backgroundColor || null;
    this.baseFontFamily = props.baseFontFamily || null;
    this.baseFontSize = props.baseFontSize || null;
    this.baseLineHeight = props.baseLineHeight || null;
    this.boxSizingMedia = props.boxSizingMedia || null;
    this.boxSizingTable = props.boxSizingTable || null;
    this.colWidth = props.colWidth || null;
    this.colCount = props.colCount || null;
    this.colGap = props.colGap || null;
    this.codeFontFamily = props.codeFontFamily || null;
    this.compFontFamily = props.compFontFamily || null;
    this.defaultLineLength = props.defaultLineLength || null;
    this.flowSpacing = props.flowSpacing || null;
    this.humanistTf = props.humanistTf || null;
    this.invertGaijiFilter = props.invertGaijiFilter || null;
    this.linkColor = props.linkColor || null;
    this.maxMediaWidth = props.maxMediaWidth || null;
    this.maxMediaHeight = props.maxMediaHeight || null;
    this.modernTf = props.modernTf || null;
    this.monospaceTf = props.monospaceTf || null;
    this.noVerticalPagination = props.noVerticalPagination || null;
    this.oldStyleTf = props.oldStyleTf || null;
    this.pageGutter = props.pageGutter || null;
    this.paraIndent = props.paraIndent || null;
    this.paraSpacing = props.paraSpacing || null;
    this.primaryColor = props.primaryColor || null;
    this.sansSerifJa = props.sansSerifJa || null;
    this.sansSerifJaV = props.sansSerifJaV || null;
    this.sansTf = props.sansTf || null;
    this.secondaryColor = props.secondaryColor || null;
    this.selectionBackgroundColor = props.selectionBackgroundColor || null;
    this.selectionTextColor = props.selectionTextColor || null;
    this.serifJa = props.serifJa || null;
    this.serifJaV = props.serifJaV || null;
    this.textColor = props.textColor || null;
    this.typeScale = props.typeScale || null;
    this.visitedLinkColor = props.visitedLinkColor || null;
  }

  toCSSProperties(): { [key: string]: string; } {
    const cssProperties: { [key: string]: string } = {};

    if (this.backgroundColor) cssProperties["--RS__backgroundColor"] = this.backgroundColor;
    if (this.baseFontFamily) cssProperties["--RS__baseFontFamily"] = this.baseFontFamily;
    if (this.baseFontSize) cssProperties["--RS__baseFontSize"] = this.toRem(this.baseFontSize);
    if (this.baseLineHeight) cssProperties["--RS__baseLineHeight"] = this.toUnitless(this.baseLineHeight);
    if (this.boxSizingMedia) cssProperties["--RS__boxSizingMedia"] = this.boxSizingMedia;
    if (this.boxSizingTable) cssProperties["--RS__boxSizingTable"] = this.boxSizingTable;
    if (this.colWidth) cssProperties["--RS__colWidth"] = this.colWidth;
    if (this.colCount) cssProperties["--RS__colCount"] = this.toUnitless(this.colCount);
    if (this.colGap) cssProperties["--RS__colGap"] = this.toPx(this.colGap);
    if (this.codeFontFamily) cssProperties["--RS__codeFontFamily"] = this.codeFontFamily;
    if (this.compFontFamily) cssProperties["--RS__compFontFamily"] = this.compFontFamily;
    if (this.defaultLineLength) cssProperties["--RS__defaultLineLength"] = this.toRem(this.defaultLineLength);
    if (this.flowSpacing) cssProperties["--RS__flowSpacing"] = this.toRem(this.flowSpacing);
    if (this.humanistTf) cssProperties["--RS__humanistTf"] = this.humanistTf;
    if (this.invertGaijiFilter) {
      cssProperties["--USER__invertGaijiFilter"] = typeof this.invertGaijiFilter === "number" 
        ? this.toPercentage(this.invertGaijiFilter) 
        : this.toFlag("invertGaiji");
    }
    if (this.linkColor) cssProperties["--RS__linkColor"] = this.linkColor;
    if (this.maxMediaWidth) cssProperties["--RS__maxMediaWidth"] = this.toVw(this.maxMediaWidth);
    if (this.maxMediaHeight) cssProperties["--RS__maxMediaHeight"] = this.toVh(this.maxMediaHeight);
    if (this.modernTf) cssProperties["--RS__modernTf"] = this.modernTf;
    if (this.monospaceTf) cssProperties["--RS__monospaceTf"] = this.monospaceTf;
    if (this.noVerticalPagination) cssProperties["--RS__disablePagination"] = this.toFlag("noVerticalPagination");
    if (this.oldStyleTf) cssProperties["--RS__oldStyleTf"] = this.oldStyleTf;
    if (this.pageGutter) cssProperties["--RS__pageGutter"] = this.toPx(this.pageGutter);
    if (this.paraIndent) cssProperties["--RS__paraIndent"] = this.toRem(this.paraIndent);
    if (this.paraSpacing) cssProperties["--RS__paraSpacing"] = this.toRem(this.paraSpacing);
    if (this.primaryColor) cssProperties["--RS__primaryColor"] = this.primaryColor;
    if (this.sansSerifJa) cssProperties["--RS__sans-serif-ja"] = this.sansSerifJa;
    if (this.sansSerifJaV) cssProperties["--RS__sans-serif-ja-v"] = this.sansSerifJaV;
    if (this.sansTf) cssProperties["--RS__sansTf"] = this.sansTf;
    if (this.secondaryColor) cssProperties["--RS__secondaryColor"] = this.secondaryColor;
    if (this.selectionBackgroundColor) cssProperties["--RS__selectionBackgroundColor"] = this.selectionBackgroundColor;
    if (this.selectionTextColor) cssProperties["--RS__selectionTextColor"] = this.selectionTextColor;
    if (this.serifJa) cssProperties["--RS__serif-ja"] = this.serifJa;
    if (this.serifJaV) cssProperties["--RS__serif-ja-v"] = this.serifJaV;
    if (this.textColor) cssProperties["--RS__textColor"] = this.textColor;
    if (this.typeScale) cssProperties["--RS__typeScale"] = this.toUnitless(this.typeScale);
    if (this.visitedLinkColor) cssProperties["--RS__visitedColor"] = this.visitedLinkColor;

    return cssProperties;
  }
}
