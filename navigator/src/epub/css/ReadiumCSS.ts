import { ILineLengthsConfig, LineLengths } from "../../helpers";
import { EpubSettings } from "../preferences/EpubSettings";
import { IUserProperties, RSProperties, UserProperties } from "./Properties";

type ILineLengthsProps = Omit<ILineLengthsConfig, "optimalChars" | "minChars" | "sample" | "isCJK" | "getRelative">;

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

  update(settings: EpubSettings) {
    this.updateLineLengths({
      fontFace: settings.fontFamily,
      fontSize: settings.fontSize,
      letterSpacing: settings.letterSpacing,
      pageGutter: settings.pageGutter,
      wordSpacing: settings.wordSpacing,
      userChars: settings.lineLength
    });

    const baseLineLength = this.lineLengths.userLineLength || this.lineLengths.optimalLineLength;
    
    const updated: IUserProperties = {
      advancedSettings: !settings.publisherStyles,
      a11yNormalize: settings.textNormalization,
      appearance: settings.theme,
      backgroundColor: settings.backgroundColor,
      blendFilter: settings.blendFilter,
      bodyHyphens: typeof settings.hyphens !== "boolean" 
        ? null 
        : settings.hyphens 
          ? "auto" 
          : "none",
      colCount: settings.scroll ? undefined : this.setColCount(settings.columnCount, baseLineLength),
      darkenFilter: settings.darkenFilter,
      fontFamily: settings.fontFamily,
      fontOpticalSizing: typeof settings.fontOpticalSizing !== "boolean" 
        ? null 
        : settings.fontOpticalSizing 
          ? "auto" 
          : "none",
      fontOverride: settings.textNormalization || settings.fontFamily ? true : false,
      fontSize: settings.fontSize,
      fontWeight: settings.fontWeight,
      fontWidth: settings.fontWidth,
      invertFilter: settings.invertFilter,
      letterSpacing: settings.letterSpacing,
      ligatures: typeof settings.ligatures !== "boolean" 
        ? null 
        : settings.ligatures 
          ? "common-ligatures" 
          : "none",
      lineHeight: settings.lineHeight,
      lineLength: this.lineLengths.userLineLength || this.lineLengths.optimalLineLength,
      noRuby: settings.noRuby,
      paraIndent: settings.paragraphIndent,
      paraSpacing: settings.paragraphSpacing,
      textAlign: settings.textAlign,
      textColor: settings.textColor,
      view: typeof settings.scroll !== "boolean" 
        ? null 
        : settings.scroll 
          ? "scroll" 
          : "paged",
      wordSpacing: settings.wordSpacing
    };

    // We need to keep the column count reference for resizeHandler
    this.cachedColCount = settings.columnCount;

    this.userProperties = new UserProperties(updated);

    if (settings.pageGutter) {
      this.rsProperties.pageGutter = settings.pageGutter;
    }
  }

  private updateLineLengths(props: ILineLengthsProps) {
    if (props.fontFace) this.lineLengths.fontFace = props.fontFace;
    if (props.fontSize) this.lineLengths.fontSize = props.fontSize;
    if (props.letterSpacing) this.lineLengths.letterSpacing = props.letterSpacing;
    if (props.pageGutter) this.lineLengths.pageGutter = props.pageGutter;
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

  setContainerWidth() {
    if (this.userProperties.view === "scroll") {
      this.container.style.width = `${ this.containerParent.clientWidth }px`;
    } else {
      this.container.style.width = `${ this.pagedContainerWidth }px`;
    }
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