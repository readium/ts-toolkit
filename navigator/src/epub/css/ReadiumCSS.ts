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
  paginationStrategy: PaginationStrategy | null;
  private cachedColCount: number | null | undefined;
  private pagedContainerWidth: number;

  constructor(props: IReadiumCSS) {
    this.rsProperties = props.rsProperties;
    this.userProperties = props.userProperties;
    this.lineLengths = props.lineLengths;
    this.container = props.container;
    this.containerParent = props.container.parentElement || document.documentElement;
    this.constraint = props.constraint;
    this.paginationStrategy = props.paginationStrategy || null;
    this.cachedColCount = props.userProperties.colCount;
    this.pagedContainerWidth = this.containerParent.clientWidth;
  }

  update(settings: EpubSettings) {
    // We need to keep the column count reference for resizeHandler
    this.cachedColCount = settings.columnCount;

    if (settings.constraint !== this.constraint) 
      this.constraint = settings.constraint;

    if (settings.paginationStrategy !== this.paginationStrategy) 
      this.paginationStrategy = settings.paginationStrategy;

    if (settings.pageGutter !== this.rsProperties.pageGutter)
      this.rsProperties.pageGutter = settings.pageGutter;

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

    const pagination = settings.scroll ? undefined : this.setColCount(settings.columnCount);

    if (pagination?.pagedContainerWidth)
      this.pagedContainerWidth = pagination?.pagedContainerWidth;
    
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
      colCount: settings.scroll ? undefined : pagination?.colCount,
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
      lineLength: pagination?.effectiveLineLength || this.lineLengths.userLineLength || this.lineLengths.optimalLineLength,
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
    if (props.fontFace !== undefined) this.lineLengths.fontFace = props.fontFace;
    if (props.letterSpacing !== undefined) this.lineLengths.letterSpacing = props.letterSpacing || 0;
    if (props.pageGutter !== undefined) this.lineLengths.pageGutter = props.pageGutter || 0;
    if (props.wordSpacing !== undefined) this.lineLengths.wordSpacing = props.wordSpacing || 0;
    if (props.minChars !== undefined) this.lineLengths.minChars = props.minChars;
    if (props.maxChars !== undefined) this.lineLengths.maxChars = props.maxChars;
    if (props.optimalChars) this.lineLengths.optimalChars = props.optimalChars;
    if (props.userChars !== undefined) this.lineLengths.userChars = props.userChars;
  }

  // Note: Kept intentionally verbose for debugging
  private setColCount(colCount?: number | null) {
    const zoomFactor = this.userProperties.fontSize || 1;
    const zoomCompensation = zoomFactor < 1 ? 1 / zoomFactor : 1;
    const constrainedWidth = Math.round(this.containerParent.clientWidth - (this.constraint));
    const optimal = Math.round(this.lineLengths.userLineLength || this.lineLengths.optimalLineLength) * zoomFactor;
    const minimal = this.lineLengths.minimalLineLength !== null 
      ? Math.round(this.lineLengths.minimalLineLength * zoomFactor) 
      : null;
    const maximal = this.lineLengths.maximalLineLength !== null 
      ? Math.round(this.lineLengths.maximalLineLength * zoomFactor) 
      : null;

    let RCSSColCount = 1;
    let pagedContainerWidth = constrainedWidth;

    if (colCount === undefined) {
      return { 
        colCount: undefined, 
        pagedContainerWidth: pagedContainerWidth, 
        effectiveLineLength: Math.round((pagedContainerWidth / RCSSColCount) * zoomCompensation) 
      };
    }
    
    if (colCount === null) {
      if (this.paginationStrategy === null) {
        if (constrainedWidth >= optimal) {
          RCSSColCount = Math.floor(constrainedWidth / optimal);
          const requiredWidth = Math.round(RCSSColCount * (optimal * zoomCompensation));
          pagedContainerWidth = Math.min(requiredWidth, constrainedWidth);
        } else {
          RCSSColCount = 1;
          pagedContainerWidth = constrainedWidth;
        }
      } else if (this.paginationStrategy === PaginationStrategy.lineLength) {
        if (constrainedWidth < optimal || maximal === null) {
          RCSSColCount = 1;
          pagedContainerWidth = constrainedWidth;
        } else {
          RCSSColCount = Math.floor(constrainedWidth / optimal);
          const requiredWidth = Math.round(RCSSColCount * ((maximal || optimal) * zoomCompensation));
          pagedContainerWidth = Math.min(requiredWidth, constrainedWidth);
        }
      } else if (this.paginationStrategy === PaginationStrategy.columns) {
        if (constrainedWidth >= optimal) {
          if (maximal === null) {
            RCSSColCount = Math.floor(constrainedWidth / optimal);
            pagedContainerWidth = constrainedWidth;
          } else {
            RCSSColCount = Math.floor(constrainedWidth / (minimal || optimal));
            const requiredWidth = Math.round((RCSSColCount * (optimal * zoomCompensation)));
            pagedContainerWidth = Math.min(requiredWidth, constrainedWidth);
          }
        } else {
          RCSSColCount = 1;
          pagedContainerWidth = constrainedWidth;
        }
      }
    } else if (colCount > 1) {
      const minRequiredWidth = Math.round(colCount * (minimal !== null ? minimal : optimal));
    
      if (constrainedWidth >= minRequiredWidth) {
        RCSSColCount = colCount;
        if (maximal === null) {
          pagedContainerWidth = constrainedWidth
        } else {
          const requiredWidth = Math.round(RCSSColCount * ((maximal || optimal) * zoomCompensation));
          pagedContainerWidth = Math.min(requiredWidth, constrainedWidth);
        }
      } else {
        if (minimal !== null && constrainedWidth < Math.round(colCount * minimal)) {
          RCSSColCount = Math.floor(constrainedWidth / minimal);
        } else {
          RCSSColCount = colCount;
        }
        const requiredWidth = Math.round((RCSSColCount * (optimal * zoomCompensation)))
        pagedContainerWidth = Math.min(requiredWidth, constrainedWidth);
      }
    } else {
      RCSSColCount = 1;
      if (constrainedWidth >= optimal) {
        pagedContainerWidth = maximal === null 
          ? constrainedWidth 
          : Math.min(Math.round((maximal || optimal) * zoomCompensation), constrainedWidth);
      } else {
        pagedContainerWidth = constrainedWidth 
      }
    }

    return { 
      colCount: RCSSColCount, 
      pagedContainerWidth: pagedContainerWidth, 
      effectiveLineLength: Math.round((pagedContainerWidth / RCSSColCount) * zoomCompensation)
    };
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
      const pagination = this.setColCount(this.cachedColCount);
      this.userProperties.colCount = pagination.colCount;
      this.userProperties.lineLength = pagination.effectiveLineLength;
      this.pagedContainerWidth = pagination.pagedContainerWidth;
      this.container.style.width = `${ this.pagedContainerWidth }px`;
    }
  }
}