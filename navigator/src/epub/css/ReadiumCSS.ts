import { LineLengths } from "../../helpers";
import { IEpubSettings } from "../preferences/EpubSettings";
import { IUserProperties, RSProperties, UserProperties } from "./Properties";

export interface IReadiumCSS {
  rsProperties: RSProperties;
  userProperties: UserProperties;
  lineLengths: LineLengths;
  container: HTMLElement;
  constraint?: number;
}

export class ReadiumCSS {
  rsProperties: RSProperties;
  userProperties: UserProperties;
  lineLengths: LineLengths;
  container: HTMLElement;
  containerParent: HTMLElement;
  constraint: number;
  private _containerWidth: number;

  constructor(props: IReadiumCSS) {
    this.rsProperties = props.rsProperties;
    this.userProperties = props.userProperties;
    this.lineLengths = props.lineLengths;
    this.container = props.container;
    this.containerParent = props.container.parentElement || document.documentElement;
    this.constraint = props.constraint || 0;
    this._containerWidth = props.container.clientWidth;
  }

  update(userSettings: IEpubSettings) {
    const baseLineLength = userSettings.lineLength || this.userProperties.lineLength || this.lineLengths.optimalLineLength;
    
    const merged: IUserProperties = {
      advancedSettings: !userSettings.publisherStyles || this.userProperties.advancedSettings,
      a11yNormalize: userSettings.textNormalization || this.userProperties.a11yNormalize,
      appearance: userSettings.theme || this.userProperties.appearance,
      backgroundColor: userSettings.backgroundColor || this.userProperties.backgroundColor,
      blendFilter: userSettings.blendFilter || this.userProperties.blendFilter,
      bodyHyphens: typeof userSettings.hyphens !== "boolean" 
        ? this.userProperties.bodyHyphens 
        : userSettings.hyphens 
          ? "auto" 
          : "none",
      colCount: this.setColCount(userSettings.columnCount, baseLineLength) || this.userProperties.colCount,
      darkenFilter: userSettings.darkenFilter || this.userProperties.darkenFilter,
      fontFamily: userSettings.fontFamily || this.userProperties.fontFamily,
      fontOpticalSizing: typeof userSettings.fontOpticalSizing !== "boolean" 
        ? this.userProperties.fontOpticalSizing 
        : userSettings.fontOpticalSizing 
          ? "auto" 
          : "none",
      fontSize: userSettings.fontSize || this.userProperties.fontSize,
      fontWeight: userSettings.fontWeight || this.userProperties.fontWeight,
      fontWidth: userSettings.fontWidth || this.userProperties.fontWidth,
      invertFilter: userSettings.invertFilter || this.userProperties.invertFilter,
      letterSpacing: userSettings.letterSpacing || this.userProperties.letterSpacing,
      ligatures: typeof userSettings.ligatures !== "boolean" 
        ? this.userProperties.ligatures 
        : userSettings.ligatures 
          ? "common-ligatures" 
          : "none",
      lineHeight: userSettings.lineHeight || this.userProperties.lineHeight,
      lineLength: userSettings.lineLength || this.userProperties.lineLength,
      noRuby: userSettings.noRuby || this.userProperties.noRuby,
      paraIndent: userSettings.paragraphIndent || this.userProperties.paraIndent,
      paraSpacing: userSettings.paragraphSpacing || this.userProperties.paraSpacing,
      textAlign: userSettings.textAlign || this.userProperties.textAlign,
      textColor: userSettings.textColor || this.userProperties.textColor,
      view: typeof userSettings.scroll !== "boolean" 
        ? this.userProperties.view 
        : userSettings.scroll 
          ? "scroll" 
          : "paged",
      wordSpacing: userSettings.wordSpacing || this.userProperties.wordSpacing
    };

    if (merged.a11yNormalize || merged.fontFamily) {
      merged.fontOverride = true;
    }

    this.userProperties = new UserProperties(merged);
  }

  private setColCount(colCount?: number | null, baseLineLength: number = this.lineLengths.optimalLineLength) {
    const constrainedWidth = (this.containerParent.clientWidth - (this.constraint));
    
    let RCSSColCount = 1;

    if (!colCount) {
      RCSSColCount = (constrainedWidth >= baseLineLength) 
        ? Math.floor(constrainedWidth / baseLineLength) 
        : 1;
    } else if (colCount > 1) {
        if (this.lineLengths.minimalLineLength !== null) {
        const requiredWidth = 2 * this.lineLengths.minimalLineLength;
        constrainedWidth > requiredWidth 
          ? RCSSColCount = colCount 
          : RCSSColCount = colCount - 1;
      } else {
        RCSSColCount = colCount;
      }
    } else {
      RCSSColCount = Number(colCount);
    }

    if (RCSSColCount > 1 && this.lineLengths.minimalLineLength !== null) {
      this._containerWidth = Math.min((RCSSColCount * baseLineLength), constrainedWidth);
    } else if ((baseLineLength + this.constraint) <= constrainedWidth) {
      this._containerWidth = constrainedWidth;
    };

    return RCSSColCount;
  }

  get containerWidth() {
    return this._containerWidth;
  }
}