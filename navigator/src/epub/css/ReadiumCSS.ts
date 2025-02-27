import { LineLengths } from "../../helpers";
import { EpubSettings } from "../preferences/EpubSettings";
import { IUserProperties, RSProperties, UserProperties } from "./Properties";

export interface IReadiumCSS {
  rsProperties: RSProperties;
  userProperties: UserProperties;
  lineLengths: LineLengths;
  container: HTMLElement;
  constraint: number;
}

export class ReadiumCSS {
  rsProperties: RSProperties;
  userProperties: UserProperties;
  lineLengths: LineLengths;
  container: HTMLElement;
  containerParent: HTMLElement;
  constraint: number;
  private cachedColCount: number | null | undefined;
  private pagedContainerWidth: number;

  constructor(props: IReadiumCSS) {
    this.rsProperties = props.rsProperties;
    this.userProperties = props.userProperties;
    this.lineLengths = props.lineLengths;
    this.container = props.container;
    this.containerParent = props.container.parentElement || document.documentElement;
    this.constraint = props.constraint;
    this.cachedColCount = props.userProperties.colCount;
    this.pagedContainerWidth = this.containerParent.clientWidth;
  }

  update(userSettings: EpubSettings) {
    const baseLineLength = userSettings.lineLength || this.lineLengths.optimalLineLength;
    
    const updated: IUserProperties = {
      advancedSettings: !userSettings.publisherStyles,
      a11yNormalize: userSettings.textNormalization,
      appearance: userSettings.theme,
      backgroundColor: userSettings.backgroundColor,
      blendFilter: userSettings.blendFilter,
      bodyHyphens: typeof userSettings.hyphens !== "boolean" 
        ? null 
        : userSettings.hyphens 
          ? "auto" 
          : "none",
      colCount: userSettings.scroll ? undefined : this.setColCount(userSettings.columnCount, baseLineLength),
      darkenFilter: userSettings.darkenFilter,
      fontFamily: userSettings.fontFamily,
      fontOpticalSizing: typeof userSettings.fontOpticalSizing !== "boolean" 
        ? null 
        : userSettings.fontOpticalSizing 
          ? "auto" 
          : "none",
      fontOverride: userSettings.textNormalization || userSettings.fontFamily ? true : false,
      fontSize: userSettings.fontSize,
      fontWeight: userSettings.fontWeight,
      fontWidth: userSettings.fontWidth,
      invertFilter: userSettings.invertFilter,
      letterSpacing: userSettings.letterSpacing,
      ligatures: typeof userSettings.ligatures !== "boolean" 
        ? null 
        : userSettings.ligatures 
          ? "common-ligatures" 
          : "none",
      lineHeight: userSettings.lineHeight,
      lineLength: userSettings.lineLength,
      noRuby: userSettings.noRuby,
      paraIndent: userSettings.paragraphIndent,
      paraSpacing: userSettings.paragraphSpacing,
      textAlign: userSettings.textAlign,
      textColor: userSettings.textColor,
      view: typeof userSettings.scroll !== "boolean" 
        ? null 
        : userSettings.scroll 
          ? "scroll" 
          : "paged",
      wordSpacing: userSettings.wordSpacing
    };

    // We need to keep the column count reference for resizeHandler
    this.cachedColCount = userSettings.columnCount;

    this.userProperties = new UserProperties(updated);
  }

  private setColCount(colCount?: number | null, baseLineLength: number = this.lineLengths.optimalLineLength) {
    const constrainedWidth = (this.containerParent.clientWidth - (this.constraint));

    if (colCount === undefined) {
      return undefined;
    }
    
    let RCSSColCount = 1;

    if (colCount === null) {
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
      this.pagedContainerWidth = Math.min((RCSSColCount * baseLineLength), constrainedWidth);
    } else if ((baseLineLength + this.constraint) <= constrainedWidth) {
      this.pagedContainerWidth = constrainedWidth;
    };

    return RCSSColCount;
  }

  resizeHandler() {
    if (this.userProperties.view === "scroll") {
      this.container.style.width = `${ this.containerParent.clientWidth }px`;
    } else {
      const baseLineLength = this.userProperties.lineLength || this.lineLengths.optimalLineLength;
      this.userProperties.colCount = this.setColCount(this.cachedColCount, baseLineLength);
  
      this.container.style.width = `${ this.pagedContainerWidth }px`;
    }
  }
}