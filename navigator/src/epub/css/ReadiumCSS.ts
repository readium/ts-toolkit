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
    if (props.fontFace) this.lineLengths.fontFace = props.fontFace;
    if (props.letterSpacing) this.lineLengths.letterSpacing = props.letterSpacing;
    if (props.pageGutter) this.lineLengths.pageGutter = props.pageGutter;
    if (props.wordSpacing) this.lineLengths.wordSpacing = props.wordSpacing;
    if (props.minChars) this.lineLengths.minChars = props.minChars;
    if (props.maxChars) this.lineLengths.maxChars = props.maxChars;
    if (props.optimalChars) this.lineLengths.optimalChars = props.optimalChars;
    if (props.userChars) this.lineLengths.userChars = props.userChars;
  }

  // Note: Kept intentionally verbose for debugging
  private setColCount(colCount?: number | null) {
    const zoomFactor = this.userProperties.fontSize || 1;
    const constrainedWidth = (this.containerParent.clientWidth - (this.constraint));
    const optimal = (this.lineLengths.userLineLength ||this.lineLengths.optimalLineLength) * zoomFactor;
    const minimal = this.lineLengths.minimalLineLength !== null 
      ? this.lineLengths.minimalLineLength * zoomFactor 
      : null;
    const maximal = this.lineLengths.maximalLineLength !== null 
      ? this.lineLengths.maximalLineLength * zoomFactor 
      : null;

    let RCSSColCount = 1;

    if (colCount === undefined) {
      return { colCount: undefined, pagedContainerWidth: constrainedWidth, effectiveLineLength: optimal };
    }
    
    if (colCount === null) {
      if (this.paginationStrategy === PaginationStrategy.lineLength) {
        if (constrainedWidth >= optimal) {
          if (constrainedWidth >= optimal) {
            const optimalCount = Math.floor(constrainedWidth / optimal);
            const maximalCount = maximal !== null ? Math.floor(constrainedWidth / maximal) : 0;
        
            if (maximalCount >= 2) {
              RCSSColCount = maximalCount;
              const pagedContainedWidth = Math.min((RCSSColCount * maximal!) + this.constraint, constrainedWidth);
              const effectiveLineLength = maximal;
              return { colCount: RCSSColCount, pagedContainerWidth: pagedContainedWidth, effectiveLineLength };
            } else if (optimalCount >= 2) {
              RCSSColCount = optimalCount;
              const pagedContainedWidth = Math.min((RCSSColCount * optimal) + this.constraint, constrainedWidth);
              const effectiveLineLength = optimal;
              return { colCount: RCSSColCount, pagedContainerWidth: pagedContainedWidth, effectiveLineLength };
            } else if (maximal !== null && constrainedWidth >= maximal) {
              RCSSColCount = 1;
              const pagedContainedWidth = Math.min(maximal + this.constraint, constrainedWidth);
              const effectiveLineLength = maximal;
              return { colCount: RCSSColCount, pagedContainerWidth: pagedContainedWidth, effectiveLineLength };
            } else {
              RCSSColCount = 1;
              const pagedContainedWidth = Math.min(optimal + this.constraint, constrainedWidth);
              const effectiveLineLength = optimal;
              return { colCount: RCSSColCount, pagedContainerWidth: pagedContainedWidth, effectiveLineLength };
            }
          } else {
            RCSSColCount = 1;
            const pagedContainedWidth = constrainedWidth;
            const effectiveLineLength = optimal;
            return { colCount: RCSSColCount, pagedContainerWidth: pagedContainedWidth, effectiveLineLength };
          }
        }
      } else if (this.paginationStrategy === PaginationStrategy.columns) {
        if (constrainedWidth >= optimal) {
          if (minimal !== null) {
            RCSSColCount = Math.floor(constrainedWidth / minimal);
            const pagedContainedWidth = Math.min((RCSSColCount * optimal) + this.constraint, constrainedWidth);
            const effectiveLineLength = optimal;
            return { colCount: RCSSColCount, pagedContainerWidth: pagedContainedWidth, effectiveLineLength };
          } else {
            RCSSColCount = Math.floor(constrainedWidth / optimal);
            const pagedContainedWidth = Math.min((RCSSColCount * optimal) + this.constraint, constrainedWidth);
            const effectiveLineLength = optimal;
            return { colCount: RCSSColCount, pagedContainerWidth: pagedContainedWidth, effectiveLineLength };
          }
        } else {
          RCSSColCount = 1;
          const pagedContainedWidth = constrainedWidth;
          const effectiveLineLength = optimal;
          return { colCount: RCSSColCount, pagedContainerWidth: pagedContainedWidth, effectiveLineLength };
        }
      }
    } else if (colCount > 1) {
      const requiredWidth = colCount * (minimal !== null ? minimal : optimal);
      const optimalCount = Math.floor(constrainedWidth / optimal);
      const maximalCount = maximal !== null ? Math.floor(constrainedWidth / maximal) : 0;
    
      if (constrainedWidth > requiredWidth) {
        if (maximalCount >= 2) {
          RCSSColCount = Math.min(maximalCount, colCount);
          const pagedContainedWidth = Math.min((RCSSColCount * maximal!) + this.constraint, constrainedWidth);
          const effectiveLineLength = maximal;
          return { colCount: RCSSColCount, pagedContainerWidth: pagedContainedWidth, effectiveLineLength };
        } else if (optimalCount >= 2) {
          RCSSColCount = Math.min(optimalCount, colCount);
          const pagedContainedWidth = Math.min((RCSSColCount * optimal) + this.constraint, constrainedWidth);
          const effectiveLineLength = optimal;
          return { colCount: RCSSColCount, pagedContainerWidth: pagedContainedWidth, effectiveLineLength };
        } else {
          RCSSColCount = colCount;
          const pagedContainedWidth = Math.min((RCSSColCount * optimal) + this.constraint, constrainedWidth);
          const effectiveLineLength = optimal;
          return { colCount: RCSSColCount, pagedContainerWidth: pagedContainedWidth, effectiveLineLength };
        }
      } else {
        if (minimal !== null && constrainedWidth < colCount * minimal) {
          RCSSColCount = colCount - 1;
        } else {
          RCSSColCount = colCount;
        }
        const pagedContainedWidth = Math.min((RCSSColCount * optimal) + this.constraint, constrainedWidth);
        const effectiveLineLength = optimal;
        return { colCount: RCSSColCount, pagedContainerWidth: pagedContainedWidth, effectiveLineLength };
      }
    } else {
      if (maximal !== null && constrainedWidth >= maximal) {
        RCSSColCount = 1;
        const pagedContainedWidth = Math.min(maximal + this.constraint, constrainedWidth);
        const effectiveLineLength = maximal;
        return { colCount: RCSSColCount, pagedContainerWidth: pagedContainedWidth, effectiveLineLength };
      } else {
        RCSSColCount = 1;
        const pagedContainedWidth = Math.min(optimal + this.constraint, constrainedWidth);
        const effectiveLineLength = optimal;
        return { colCount: RCSSColCount, pagedContainerWidth: pagedContainedWidth, effectiveLineLength };
      }
    }
    return { colCount: undefined, pagedContainerWidth: constrainedWidth, effectiveLineLength: optimal };
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