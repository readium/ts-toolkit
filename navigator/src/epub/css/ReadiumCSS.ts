import { ILineLengthsConfig, LineLengths } from "../../helpers";
import { PaginationStrategy } from "../../preferences";
import { EpubSettings } from "../preferences/EpubSettings";
import { IUserProperties, RSProperties, UserProperties } from "./Properties";

type ILineLengthsProps = {
  [K in Exclude<keyof ILineLengthsConfig, "fontSize" | "sample" | "isCJK" | "getRelative">]?: ILineLengthsConfig[K]
};

export interface IReadiumCSS {
  rsProperties: RSProperties;
  userProperties: UserProperties;
  lineLengths: LineLengths;
  container: HTMLElement;
  constraint: number;
  paginationStrategy?: PaginationStrategy | null;
}

export class ReadiumCSS {
  rsProperties: RSProperties;
  userProperties: UserProperties;
  lineLengths: LineLengths;
  container: HTMLElement;
  containerParent: HTMLElement;
  constraint: number;
  paginationStrategy: PaginationStrategy;
  private cachedColCount: number | null | undefined;
  private pagedContainerWidth: number;

  constructor(props: IReadiumCSS) {
    this.rsProperties = props.rsProperties;
    this.userProperties = props.userProperties;
    this.lineLengths = props.lineLengths;
    this.container = props.container;
    this.containerParent = props.container.parentElement || document.documentElement;
    this.constraint = props.constraint;
    this.paginationStrategy = props.paginationStrategy || PaginationStrategy.lineLength;
    this.cachedColCount = props.userProperties.colCount;
    this.pagedContainerWidth = this.containerParent.clientWidth;
  }

  update(settings: EpubSettings) {
    // We need to keep the column count reference for resizeHandler
    this.cachedColCount = settings.columnCount;

    if (settings.constraint !== this.constraint) 
      this.constraint = settings.constraint;

    if (settings.paginationStrategy && settings.paginationStrategy !== this.paginationStrategy) 
      this.paginationStrategy = settings.paginationStrategy;

    if (settings.pageGutter !== this.rsProperties.pageGutter) {
      this.rsProperties.pageGutter = settings.pageGutter;
    }

    this.updateLineLengths({
      fontFace: settings.fontFamily,
      letterSpacing: settings.letterSpacing,
      pageGutter: settings.pageGutter,
      wordSpacing: settings.wordSpacing,
      minChars: settings.minimalLineLength,
      maxChars: settings.maximalLineLength,
      optimalChars: settings.optimalLineLength,
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

    this.userProperties = new UserProperties(updated);
  }

  private updateLineLengths(props: ILineLengthsProps) {
    if (props.fontFace) this.lineLengths.fontFace = props.fontFace;
    if (props.letterSpacing) this.lineLengths.letterSpacing = props.letterSpacing;
    if (props.pageGutter) this.lineLengths.pageGutter = props.pageGutter;
    if (props.wordSpacing) this.lineLengths.wordSpacing = props.wordSpacing;
    if (props.minChars) this.lineLengths.minChars = props.minChars;
    if (props.maxChars) this.lineLengths.maxChars = props.maxChars;
    if (props.optimalChars) this.lineLengths.optimalChars = props.optimalChars;
    if (props.userChars) this.lineLengths.userChars = props.userChars;
  }

  private setColCount(colCount?: number | null, baseLineLength: number = this.lineLengths.optimalLineLength) {
    const constrainedWidth = (this.containerParent.clientWidth - (this.constraint));
    const correctedLineLength = baseLineLength * (this.userProperties.fontSize || 1);

    if (colCount === undefined) {
      return undefined;
    }
    
    let RCSSColCount = 1;

    if (colCount === null) {
      RCSSColCount = (constrainedWidth >= correctedLineLength) 
        ? Math.floor(constrainedWidth / correctedLineLength) 
        : 1;
    } else if (colCount > 1) {
      if (this.lineLengths.minimalLineLength !== null) {
        const correctedMinimalLineLength = this.lineLengths.minimalLineLength * (this.userProperties.fontSize || 1);
        const requiredWidth = 2 * correctedMinimalLineLength;
        constrainedWidth > requiredWidth 
          ? RCSSColCount = colCount 
          : RCSSColCount = colCount - 1;
      } else {
        RCSSColCount = colCount;
      }
    } else {
      RCSSColCount = colCount;
    }

    // We have to account for zoom, that is not applied here but is in the iframe
    this.pagedContainerWidth = Math.min(
      (RCSSColCount * correctedLineLength) + this.constraint,
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