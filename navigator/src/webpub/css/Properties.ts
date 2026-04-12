import { ExperimentKey, experiments, TextAlignment } from "../../preferences/Types.ts";
import { BodyHyphens, Ligatures, Properties } from "../../css/Properties.ts";

export interface IWebUserProperties {
  a11yNormalize?: boolean | null;
  bodyHyphens?: BodyHyphens | null;
  fontFamily?: string | null;
  fontWeight?: number | null;
  iOSPatch?: boolean | null;
  iPadOSPatch?: boolean | null;
  letterSpacing?: number | null;
  ligatures?: Ligatures | null;
  lineHeight?: number | null;
  noRuby?: boolean | null;
  paraIndent?: number | null;
  paraSpacing?: number | null;
  textAlign?: TextAlignment | null;
  wordSpacing?: number | null;
  zoom: number | null;
}

export class WebUserProperties extends Properties {
  a11yNormalize: boolean | null;
  bodyHyphens: BodyHyphens | null;
  fontFamily: string | null;
  fontWeight: number | null;
  iOSPatch: boolean | null;
  iPadOSPatch: boolean | null;
  letterSpacing: number | null;
  ligatures: Ligatures | null;
  lineHeight: number | null;
  noRuby: boolean | null;
  paraIndent: number | null;
  paraSpacing: number | null;
  textAlign: TextAlignment | null;
  wordSpacing: number | null;
  zoom: number | null;

  constructor(props: IWebUserProperties) {
    super();
    this.a11yNormalize = props.a11yNormalize ?? null;
    this.bodyHyphens = props.bodyHyphens ?? null;
    this.fontFamily = props.fontFamily ?? null;
    this.fontWeight = props.fontWeight ?? null;
    this.iOSPatch = props.iOSPatch ?? null;
    this.iPadOSPatch = props.iPadOSPatch ?? null;
    this.letterSpacing = props.letterSpacing ?? null;
    this.ligatures = props.ligatures ?? null;
    this.lineHeight = props.lineHeight ?? null;
    this.noRuby = props.noRuby ?? null;
    this.paraIndent = props.paraIndent ?? null;
    this.paraSpacing = props.paraSpacing ?? null;
    this.textAlign = props.textAlign ?? null;
    this.wordSpacing = props.wordSpacing ?? null;
    this.zoom = props.zoom ?? null;
  }

  toCSSProperties() {
    const cssProperties: { [key: string]: string } = {};

    if (this.a11yNormalize) cssProperties["--USER__a11yNormalize"] = this.toFlag("a11y");
    if (this.bodyHyphens) cssProperties["--USER__bodyHyphens"] = this.bodyHyphens;
    if (this.fontFamily) cssProperties["--USER__fontFamily"] = this.fontFamily;
    if (this.fontWeight != null) cssProperties["--USER__fontWeight"] = this.toUnitless(this.fontWeight);
    if (this.iOSPatch) cssProperties["--USER__iOSPatch"] = this.toFlag("iOSPatch");
    if (this.iPadOSPatch) cssProperties["--USER__iPadOSPatch"] = this.toFlag("iPadOSPatch");
    if (this.letterSpacing != null) cssProperties["--USER__letterSpacing"] = this.toRem(this.letterSpacing);
    if (this.ligatures) cssProperties["--USER__ligatures"] = this.ligatures;
    if (this.lineHeight != null) cssProperties["--USER__lineHeight"] = this.toUnitless(this.lineHeight);
    if (this.noRuby) cssProperties["--USER__noRuby"] = this.toFlag("noRuby");
    if (this.paraIndent != null) cssProperties["--USER__paraIndent"] = this.toRem(this.paraIndent);
    if (this.paraSpacing != null) cssProperties["--USER__paraSpacing"] = this.toRem(this.paraSpacing);
    if (this.textAlign) cssProperties["--USER__textAlign"] = this.textAlign;
    if (this.wordSpacing != null) cssProperties["--USER__wordSpacing"] = this.toRem(this.wordSpacing);
    if (this.zoom !== null) cssProperties["--USER__zoom"] = this.toPercentage(this.zoom, true);

    return cssProperties;
  }
}

export interface IWebRSProperties {
  experiments: Array<ExperimentKey> | null;
}

export class WebRSProperties extends Properties {
  experiments: Array<ExperimentKey> | null;

  constructor(props: IWebRSProperties) {
    super();
    this.experiments = props.experiments ?? null;
  }

  toCSSProperties() {
    const cssProperties: { [key: string]: string } = {};

    if (this.experiments) {
      this.experiments.forEach((exp) => {
        cssProperties["--RS__" + exp] = experiments[exp].value;
      });
    };

    return cssProperties;
  }
}
