import { TextAlignment } from "../../preferences/Types";
import { 
  BodyHyphens, 
  BoxSizing, 
  FontOpticalSizing, 
  FontWidth, 
  Ligatures, 
  Properties, 
  TypeScale, 
  View 
} from "../../css/Properties";

export interface IUserProperties {
  advancedSettings?: boolean | null;
  a11yNormalize?: boolean | null;
  backgroundColor?: string | null;
  blendFilter?: boolean | null;
  bodyHyphens?: BodyHyphens | null;
  colCount?: number | null;
  darkenFilter?: boolean | number | null;
  deprecatedFontSize?: boolean | null;
  fontFamily?: string | null;
  fontOpticalSizing?: FontOpticalSizing | null;
  fontSize?: number | null;
  fontSizeNormalize?: boolean | null;
  fontWeight?: number | null;
  fontWidth?: FontWidth | null;
  invertFilter?: boolean | number | null;
  invertGaijiFilter?: boolean | number | null;
  iOSPatch?: boolean | null;
  iPadOSPatch?: boolean | null;
  letterSpacing?: number | null;
  ligatures?: Ligatures | null;
  lineHeight?: number | null;
  lineLength?: number | null;
  linkColor?: string | null;
  noRuby?: boolean | null;
  paraIndent?: number | null;
  paraSpacing?: number | null;
  selectionBackgroundColor?: string | null;
  selectionTextColor?: string | null;
  textAlign?: TextAlignment | null;
  textColor?: string | null;
  view?: View | null;
  visitedColor?: string | null;
  wordSpacing?: number | null;
}

export class UserProperties extends Properties {
  a11yNormalize: boolean | null;
  backgroundColor: string | null;
  blendFilter: boolean | null;
  bodyHyphens: BodyHyphens | null;
  colCount: number | null | undefined;
  darkenFilter: boolean | number | null;
  deprecatedFontSize: boolean | null;
  fontFamily: string | null;
  fontOpticalSizing: FontOpticalSizing | null;
  fontSize: number | null;
  fontSizeNormalize: boolean | null;
  fontWeight: number | null;
  fontWidth: FontWidth | null;
  invertFilter: boolean | number | null;
  invertGaijiFilter: boolean | number | null;
  iOSPatch: boolean | null;
  iPadOSPatch: boolean | null;
  letterSpacing: number | null;
  ligatures: Ligatures | null;
  lineHeight: number | null;
  lineLength: number | null;
  linkColor: string | null;
  noRuby: boolean | null;
  paraIndent: number | null;
  paraSpacing: number | null;
  selectionBackgroundColor?: string | null;
  selectionTextColor?: string | null;
  textAlign: TextAlignment | null;
  textColor: string | null;
  view: View | null;
  visitedColor: string | null;
  wordSpacing: number | null;

  constructor(props: IUserProperties) {
    super();
    this.a11yNormalize = props.a11yNormalize ?? null;
    this.backgroundColor = props.backgroundColor ?? null;
    this.blendFilter = props.blendFilter ?? null;
    this.bodyHyphens = props.bodyHyphens ?? null;
    this.colCount = props.colCount ?? null;
    this.darkenFilter = props.darkenFilter ?? null;
    this.deprecatedFontSize = props.deprecatedFontSize ?? null;
    this.fontFamily = props.fontFamily ?? null;
    this.fontOpticalSizing = props.fontOpticalSizing ?? null;
    this.fontSize = props.fontSize ?? null;
    this.fontSizeNormalize = props.fontSizeNormalize ?? null;
    this.fontWeight = props.fontWeight ?? null;
    this.fontWidth = props.fontWidth ?? null;
    this.invertFilter = props.invertFilter ?? null;
    this.invertGaijiFilter = props.invertGaijiFilter ?? null;
    this.iOSPatch = props.iOSPatch ?? null;
    this.iPadOSPatch = props.iPadOSPatch ?? null;
    this.letterSpacing = props.letterSpacing ?? null;
    this.ligatures = props.ligatures ?? null;
    this.lineHeight = props.lineHeight ?? null;
    this.lineLength = props.lineLength ?? null;
    this.linkColor = props.linkColor ?? null;
    this.noRuby = props.noRuby ?? null;
    this.paraIndent = props.paraIndent ?? null;
    this.paraSpacing = props.paraSpacing ?? null;
    this.selectionBackgroundColor = props.selectionBackgroundColor ?? null;
    this.selectionTextColor = props.selectionTextColor ?? null;
    this.textAlign = props.textAlign ?? null;
    this.textColor = props.textColor ?? null;
    this.view = props.view ?? null;
    this.visitedColor = props.visitedColor ?? null;
    this.wordSpacing = props.wordSpacing ?? null;
  }

  toCSSProperties() {
    const cssProperties: { [key: string]: string } = {};

    if (this.a11yNormalize) cssProperties["--USER__a11yNormalize"] = this.toFlag("a11y");
    if (this.backgroundColor) cssProperties["--USER__backgroundColor"] = this.backgroundColor;
    if (this.blendFilter) cssProperties["--USER__blendFilter"] = this.toFlag("blend");
    if (this.bodyHyphens) cssProperties["--USER__bodyHyphens"] = this.bodyHyphens;
    if (this.colCount) cssProperties["--USER__colCount"] = this.toUnitless(this.colCount);
    if (this.darkenFilter === true) {
      cssProperties["--USER__darkenFilter"] = this.toFlag("darken");
    } else if (typeof this.darkenFilter === "number") {
      cssProperties["--USER__darkenFilter"] = this.toPercentage(this.darkenFilter);
    }
    if (this.deprecatedFontSize) cssProperties["--USER__fontSizeImplementation"] = this.toFlag("deprecatedFontSize");
    if (this.fontFamily) cssProperties["--USER__fontFamily"] = this.fontFamily;
    if (this.fontOpticalSizing != null) cssProperties["--USER__fontOpticalSizing"] = this.fontOpticalSizing;
    if (this.fontSize != null) cssProperties["--USER__fontSize"] = this.toPercentage(this.fontSize, true);
    if (this.fontSizeNormalize) cssProperties["--USER__fontSizeNormalize"] = this.toFlag("normalize");
    if (this.fontWeight != null) cssProperties["--USER__fontWeight"] = this.toUnitless(this.fontWeight);
    if (this.fontWidth != null) {
      cssProperties["--USER__fontWidth"] = typeof this.fontWidth === "string" 
      ? this.fontWidth 
      : this.toUnitless(this.fontWidth);
    } 
    if (this.invertFilter === true) {
      cssProperties["--USER__invertFilter"] = this.toFlag("invert");
    } else if (typeof this.invertFilter === "number") {
      cssProperties["--USER__invertFilter"] = this.toPercentage(this.invertFilter);
    }
    if (this.invertGaijiFilter === true) {
      cssProperties["--USER__invertGaiji"] = this.toFlag("invertGaiji");
    } else if (typeof this.invertGaijiFilter === "number") {
      cssProperties["--USER__invertGaiji"] = this.toPercentage(this.invertGaijiFilter);
    }
    if (this.iOSPatch) cssProperties["--USER__iOSPatch"] = this.toFlag("iOSPatch");
    if (this.iPadOSPatch) cssProperties["--USER__iPadOSPatch"] = this.toFlag("iPadOSPatch");
    if (this.letterSpacing != null) cssProperties["--USER__letterSpacing"] = this.toRem(this.letterSpacing);
    if (this.ligatures) cssProperties["--USER__ligatures"] = this.ligatures;
    if (this.lineHeight != null) cssProperties["--USER__lineHeight"] = this.toUnitless(this.lineHeight);
    if (this.lineLength != null) cssProperties["--USER__lineLength"] = this.toPx(this.lineLength);
    if (this.linkColor) cssProperties["--USER__linkColor"] = this.linkColor;
    if (this.noRuby) cssProperties["--USER__noRuby"] = this.toFlag("noRuby");
    if (this.paraIndent != null) cssProperties["--USER__paraIndent"] = this.toRem(this.paraIndent);
    if (this.paraSpacing != null) cssProperties["--USER__paraSpacing"] = this.toRem(this.paraSpacing);
    if (this.selectionBackgroundColor) cssProperties["--USER__selectionBackgroundColor"] = this.selectionBackgroundColor;
    if (this.selectionTextColor) cssProperties["--USER__selectionTextColor"] = this.selectionTextColor;
    if (this.textAlign) cssProperties["--USER__textAlign"] = this.textAlign;
    if (this.textColor) cssProperties["--USER__textColor"] = this.textColor;
    if (this.view) cssProperties["--USER__view"] = this.toFlag(this.view);
    if (this.visitedColor) cssProperties["--USER__visitedColor"] = this.visitedColor;
    if (this.wordSpacing != null) cssProperties["--USER__wordSpacing"] = this.toRem(this.wordSpacing);

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
  linkColor?: string | null;
  maxMediaWidth?: number | null;
  maxMediaHeight?: number | null;
  modernTf?: string | null;
  monospaceTf?: string | null;
  noOverflow?: boolean | null;
  noVerticalPagination?: boolean | null;
  oldStyleTf?: string | null;
  pageGutter?: number | null;
  paraIndent?: number | null;
  paraSpacing?: number | null;
  primaryColor?: string | null;
  sansSerifJa?: string | null;
  sansSerifJaV?: string | null;
  sansTf?: string | null;
  scrollPaddingBottom?: number | null;
  // scrollPaddingLeft?: number | null;
  // scrollPaddingRight?: number | null;
  scrollPaddingTop?: number | null;
  secondaryColor?: string | null;
  selectionBackgroundColor?: string | null;
  selectionTextColor?: string | null;
  serifJa?: string | null;
  serifJaV?: string | null;
  textColor?: string | null;
  typeScale?: TypeScale | null;
  visitedColor?: string | null;
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
  linkColor: string | null;
  maxMediaWidth: number | null;
  maxMediaHeight: number | null;
  modernTf: string | null;
  monospaceTf: string | null;
  noOverflow: boolean | null;
  noVerticalPagination: boolean | null;
  oldStyleTf: string | null;
  pageGutter: number | null;
  paraIndent: number | null;
  paraSpacing: number | null;
  primaryColor: string | null;
  sansSerifJa: string | null;
  sansSerifJaV: string | null;
  sansTf: string | null;
  scrollPaddingBottom: number | null;
  // scrollPaddingLeft: number | null;
  // scrollPaddingRight: number | null;
  scrollPaddingTop: number | null;
  secondaryColor: string | null;
  selectionBackgroundColor: string | null;
  selectionTextColor: string | null;
  serifJa: string | null;
  serifJaV: string | null;
  textColor: string | null;
  typeScale: TypeScale | null;
  visitedColor: string | null;

  constructor(props: IRSProperties) {
    super();
    this.backgroundColor = props.backgroundColor ?? null;
    this.baseFontFamily = props.baseFontFamily ?? null;
    this.baseFontSize = props.baseFontSize ?? null;
    this.baseLineHeight = props.baseLineHeight ?? null;
    this.boxSizingMedia = props.boxSizingMedia ?? null;
    this.boxSizingTable = props.boxSizingTable ?? null;
    this.colWidth = props.colWidth ?? null;
    this.colCount = props.colCount ?? null;
    this.colGap = props.colGap ?? null;
    this.codeFontFamily = props.codeFontFamily ?? null;
    this.compFontFamily = props.compFontFamily ?? null;
    this.defaultLineLength = props.defaultLineLength ?? null;
    this.flowSpacing = props.flowSpacing ?? null;
    this.humanistTf = props.humanistTf ?? null;
    this.linkColor = props.linkColor ?? null;
    this.maxMediaWidth = props.maxMediaWidth ?? null;
    this.maxMediaHeight = props.maxMediaHeight ?? null;
    this.modernTf = props.modernTf ?? null;
    this.monospaceTf = props.monospaceTf ?? null;
    this.noOverflow = props.noOverflow ?? null;
    this.noVerticalPagination = props.noVerticalPagination ?? null;
    this.oldStyleTf = props.oldStyleTf ?? null;
    this.pageGutter = props.pageGutter ?? null;
    this.paraIndent = props.paraIndent ?? null;
    this.paraSpacing = props.paraSpacing ?? null;
    this.primaryColor = props.primaryColor ?? null;
    this.scrollPaddingBottom = props.scrollPaddingBottom ?? null;
    // this.scrollPaddingLeft = props.scrollPaddingLeft ?? null;
    // this.scrollPaddingRight = props.scrollPaddingRight ?? null;
    this.scrollPaddingTop = props.scrollPaddingTop ?? null;
    this.sansSerifJa = props.sansSerifJa ?? null;
    this.sansSerifJaV = props.sansSerifJaV ?? null;
    this.sansTf = props.sansTf ?? null;
    this.secondaryColor = props.secondaryColor ?? null;
    this.selectionBackgroundColor = props.selectionBackgroundColor ?? null;
    this.selectionTextColor = props.selectionTextColor ?? null;
    this.serifJa = props.serifJa ?? null;
    this.serifJaV = props.serifJaV ?? null;
    this.textColor = props.textColor ?? null;
    this.typeScale = props.typeScale ?? null;
    this.visitedColor = props.visitedColor ?? null;
  }

  toCSSProperties(): { [key: string]: string; } {
    const cssProperties: { [key: string]: string } = {};

    if (this.backgroundColor) cssProperties["--RS__backgroundColor"] = this.backgroundColor;
    if (this.baseFontFamily) cssProperties["--RS__baseFontFamily"] = this.baseFontFamily;
    if (this.baseFontSize != null) cssProperties["--RS__baseFontSize"] = this.toRem(this.baseFontSize);
    if (this.baseLineHeight != null) cssProperties["--RS__baseLineHeight"] = this.toUnitless(this.baseLineHeight);
    if (this.boxSizingMedia) cssProperties["--RS__boxSizingMedia"] = this.boxSizingMedia;
    if (this.boxSizingTable) cssProperties["--RS__boxSizingTable"] = this.boxSizingTable;
    if (this.colWidth != null) cssProperties["--RS__colWidth"] = this.colWidth;
    if (this.colCount != null) cssProperties["--RS__colCount"] = this.toUnitless(this.colCount);
    if (this.colGap != null) cssProperties["--RS__colGap"] = this.toPx(this.colGap);
    if (this.codeFontFamily) cssProperties["--RS__codeFontFamily"] = this.codeFontFamily;
    if (this.compFontFamily) cssProperties["--RS__compFontFamily"] = this.compFontFamily;
    if (this.defaultLineLength != null) cssProperties["--RS__defaultLineLength"] = this.toPx(this.defaultLineLength);
    if (this.flowSpacing != null) cssProperties["--RS__flowSpacing"] = this.toRem(this.flowSpacing);
    if (this.humanistTf) cssProperties["--RS__humanistTf"] = this.humanistTf;
    if (this.linkColor) cssProperties["--RS__linkColor"] = this.linkColor;
    if (this.maxMediaWidth) cssProperties["--RS__maxMediaWidth"] = this.toVw(this.maxMediaWidth);
    if (this.maxMediaHeight) cssProperties["--RS__maxMediaHeight"] = this.toVh(this.maxMediaHeight);
    if (this.modernTf) cssProperties["--RS__modernTf"] = this.modernTf;
    if (this.monospaceTf) cssProperties["--RS__monospaceTf"] = this.monospaceTf;
    if (this.noOverflow) cssProperties["--RS__disableOverflow"] = this.toFlag("noOverflow");
    if (this.noVerticalPagination) cssProperties["--RS__disablePagination"] = this.toFlag("noVerticalPagination");
    if (this.oldStyleTf) cssProperties["--RS__oldStyleTf"] = this.oldStyleTf;
    if (this.pageGutter != null) cssProperties["--RS__pageGutter"] = this.toPx(this.pageGutter);
    if (this.paraIndent != null) cssProperties["--RS__paraIndent"] = this.toRem(this.paraIndent);
    if (this.paraSpacing != null) cssProperties["--RS__paraSpacing"] = this.toRem(this.paraSpacing);
    if (this.primaryColor) cssProperties["--RS__primaryColor"] = this.primaryColor;
    if (this.sansSerifJa) cssProperties["--RS__sans-serif-ja"] = this.sansSerifJa;
    if (this.sansSerifJaV) cssProperties["--RS__sans-serif-ja-v"] = this.sansSerifJaV;
    if (this.sansTf) cssProperties["--RS__sansTf"] = this.sansTf;
    if (this.scrollPaddingBottom != null) cssProperties["--RS__scrollPaddingBottom"] = this.toPx(this.scrollPaddingBottom);
    // if (this.scrollPaddingLeft != null) cssProperties["--RS__scrollPaddingLeft"] = this.toPx(this.scrollPaddingLeft);
    // if (this.scrollPaddingRight != null) cssProperties["--RS__scrollPaddingRight"] = this.toPx(this.scrollPaddingRight);
    if (this.scrollPaddingTop != null) cssProperties["--RS__scrollPaddingTop"] = this.toPx(this.scrollPaddingTop);
    if (this.secondaryColor) cssProperties["--RS__secondaryColor"] = this.secondaryColor;
    if (this.selectionBackgroundColor) cssProperties["--RS__selectionBackgroundColor"] = this.selectionBackgroundColor;
    if (this.selectionTextColor) cssProperties["--RS__selectionTextColor"] = this.selectionTextColor;
    if (this.serifJa) cssProperties["--RS__serif-ja"] = this.serifJa;
    if (this.serifJaV) cssProperties["--RS__serif-ja-v"] = this.serifJaV;
    if (this.textColor) cssProperties["--RS__textColor"] = this.textColor;
    if (this.typeScale) cssProperties["--RS__typeScale"] = this.toUnitless(this.typeScale);
    if (this.visitedColor) cssProperties["--RS__visitedColor"] = this.visitedColor;

    return cssProperties;
  }
}