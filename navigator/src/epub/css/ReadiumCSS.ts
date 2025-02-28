import { ILineLengthsConfig, LineLengths } from "../../helpers";
import { EpubSettings } from "../preferences/EpubSettings";
import { IUserProperties, RSProperties, UserProperties } from "./Properties";

type ILineLengthsProps = Omit<ILineLengthsConfig, "optimalChars" | "minChars" | "sample" | "isCJK" | "getRelative" | "pageGutter">;

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
    this.updateLineLengths({
      fontFace: userSettings.fontFamily,
      fontSize: userSettings.fontSize,
      letterSpacing: userSettings.letterSpacing,
      wordSpacing: userSettings.wordSpacing,
      userChars: userSettings.lineLength
    });
    
    const baseLineLength = this.lineLengths.userLineLength || this.lineLengths.optimalLineLength;
    
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

  private updateLineLengths(props: ILineLengthsProps) {
    if (props.fontFace) this.lineLengths.fontFace = props.fontFace;
    if (props.fontSize) this.lineLengths.fontSize = props.fontSize;
    if (props.letterSpacing) this.lineLengths.letterSpacing = props.letterSpacing;
    if (props.wordSpacing) this.lineLengths.wordSpacing = props.wordSpacing;
    if (props.userChars) this.lineLengths.userChars = props.userChars;
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

    this.pagedContainerWidth = Math.min(
      (RCSSColCount * baseLineLength) + this.constraint,
      constrainedWidth
    );

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