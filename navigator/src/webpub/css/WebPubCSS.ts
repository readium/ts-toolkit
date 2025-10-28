import { WebPubSettings } from "../preferences/WebPubSettings";
import { IUserProperties, UserProperties } from "./Properties";

export interface IWebPubCSS {
  userProperties: UserProperties;
}

export class WebPubCSS {
  userProperties: UserProperties;

  constructor(props: IWebPubCSS) {
    this.userProperties = props.userProperties;
  }

  update(settings: WebPubSettings) {
    const updated: IUserProperties = {
      a11yNormalize: settings.textNormalization,
      bodyHyphens: typeof settings.hyphens !== "boolean" 
        ? null 
        : settings.hyphens 
          ? "auto" 
          : "none",
      fontFamily: settings.fontFamily,
      fontWeight: settings.fontWeight,
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

    this.userProperties = new UserProperties(updated);
  }
}