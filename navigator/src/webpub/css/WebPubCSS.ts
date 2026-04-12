import { WebPubSettings } from "../preferences/WebPubSettings.ts";
import { IWebUserProperties, WebRSProperties, WebUserProperties } from "./Properties.ts";

export interface IWebPubCSS {
  rsProperties: WebRSProperties;
  userProperties: WebUserProperties;
}

export class WebPubCSS {
  rsProperties: WebRSProperties;
  userProperties: WebUserProperties;

  constructor(props: IWebPubCSS) {
    this.rsProperties = props.rsProperties;
    this.userProperties = props.userProperties;
  }

  update(settings: WebPubSettings) {
    if (settings.experiments) {
      this.rsProperties.experiments = settings.experiments;
    }

    const updated: IWebUserProperties = {
      a11yNormalize: settings.textNormalization,
      bodyHyphens: typeof settings.hyphens !== "boolean"
        ? null
        : settings.hyphens
          ? "auto"
          : "none",
      fontFamily: settings.fontFamily,
      fontWeight: settings.fontWeight,
      iOSPatch: settings.iOSPatch,
      iPadOSPatch: settings.iPadOSPatch,
      letterSpacing: settings.letterSpacing,
      ligatures: typeof settings.ligatures !== "boolean"
        ? null
        : settings.ligatures
          ? "common-ligatures"
          : "none",
      lineHeight: settings.lineHeight,
      noRuby: settings.noRuby,
      paraIndent: settings.paragraphIndent,
      paraSpacing: settings.paragraphSpacing,
      textAlign: settings.textAlign,
      wordSpacing: settings.wordSpacing,
      zoom: settings.zoom
    };

    this.userProperties = new WebUserProperties(updated);
  }
}
