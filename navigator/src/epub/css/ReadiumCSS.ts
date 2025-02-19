import { IEpubSettings } from "../preferences/EpubSettings";
import { IUserProperties, RSProperties, UserProperties } from "./Properties";

export interface IReadiumCSS {
  rsProperties: RSProperties;
  userProperties: UserProperties;
}

export class ReadiumCSS {
  rsProperties: RSProperties;
  userProperties: UserProperties;

  constructor(props: IReadiumCSS) {
    this.rsProperties = props.rsProperties;
    this.userProperties = props.userProperties;
  }

  update(IUserSettings: IEpubSettings) {
    const merged: IUserProperties = {
      advancedSettings: !IUserSettings.publisherStyles || this.userProperties.advancedSettings,
      a11yNormalize: IUserSettings.textNormalization || this.userProperties.a11yNormalize,
      appearance: IUserSettings.theme || this.userProperties.appearance,
      backgroundColor: IUserSettings.backgroundColor || this.userProperties.backgroundColor,
      blendFilter: IUserSettings.blendFilter || this.userProperties.blendFilter,
      bodyHyphens: typeof IUserSettings.hyphens !== "boolean" 
        ? this.userProperties.bodyHyphens 
        : IUserSettings.hyphens 
          ? "auto" 
          : "none",
      colCount: IUserSettings.columnCount || this.userProperties.colCount,
      darkenFilter: IUserSettings.darkenFilter || this.userProperties.darkenFilter,
      fontFamily: IUserSettings.fontFamily || this.userProperties.fontFamily,
      fontOpticalSizing: typeof IUserSettings.fontOpticalSizing !== "boolean" 
        ? this.userProperties.fontOpticalSizing 
        : IUserSettings.fontOpticalSizing 
          ? "auto" 
          : "none",
      fontSize: IUserSettings.fontSize || this.userProperties.fontSize,
      fontWeight: IUserSettings.fontWeight || this.userProperties.fontWeight,
      fontWidth: IUserSettings.fontWidth || this.userProperties.fontWidth,
      invertFilter: IUserSettings.invertFilter || this.userProperties.invertFilter,
      letterSpacing: IUserSettings.letterSpacing || this.userProperties.letterSpacing,
      ligatures: typeof IUserSettings.ligatures !== "boolean" 
        ? this.userProperties.ligatures 
        : IUserSettings.ligatures 
          ? "common-ligatures" 
          : "none",
      lineHeight: IUserSettings.lineHeight || this.userProperties.lineHeight,
      lineLength: IUserSettings.lineLength || this.userProperties.lineLength,
      noRuby: IUserSettings.noRuby || this.userProperties.noRuby,
      paraIndent: IUserSettings.paragraphIndent || this.userProperties.paraIndent,
      paraSpacing: IUserSettings.paragraphSpacing || this.userProperties.paraSpacing,
      textAlign: IUserSettings.textAlign || this.userProperties.textAlign,
      textColor: IUserSettings.textColor || this.userProperties.textColor,
      view: typeof IUserSettings.scroll !== "boolean" 
        ? this.userProperties.view 
        : IUserSettings.scroll 
          ? "scroll" 
          : "paged",
      wordSpacing: IUserSettings.wordSpacing || this.userProperties.wordSpacing
    };

    if (merged.a11yNormalize || merged.fontFamily) {
      merged.fontOverride = true;
    }

    this.userProperties = new UserProperties(merged);
  }
}