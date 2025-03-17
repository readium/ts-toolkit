import { ILineLengthsConfig, LineLengths } from "../../helpers";
import { LayoutStrategy } from "../../preferences";
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
  layoutStrategy?: LayoutStrategy | null;
}

export class ReadiumCSS {
  rsProperties: RSProperties;
  userProperties: UserProperties;
  lineLengths: LineLengths;
  container: HTMLElement;
  containerParent: HTMLElement;
  constraint: number;
  layoutStrategy: LayoutStrategy;
  private cachedColCount: number | null | undefined;
  private pagedContainerWidth: number;

  constructor(props: IReadiumCSS) {
    this.rsProperties = props.rsProperties;
    this.userProperties = props.userProperties;
    this.lineLengths = props.lineLengths;
    this.container = props.container;
    this.containerParent = props.container.parentElement || document.documentElement;
    this.constraint = props.constraint;
    this.layoutStrategy = props.layoutStrategy || LayoutStrategy.lineLength;
    this.cachedColCount = props.userProperties.colCount;
    this.pagedContainerWidth = this.containerParent.clientWidth;
  }

  update(settings: EpubSettings) {
    // We need to keep the column count reference for resizeHandler
    this.cachedColCount = settings.columnCount;

    if (settings.constraint !== this.constraint) 
      this.constraint = settings.constraint;

    if (settings.layoutStrategy && settings.layoutStrategy !== this.layoutStrategy) 
      this.layoutStrategy = settings.layoutStrategy;

    if (settings.pageGutter !== this.rsProperties.pageGutter)
      this.rsProperties.pageGutter = settings.pageGutter;

    // This has to be updated before pagination
    // otherwise the metrics won’t be correct for line length
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

    const pagination = settings.scroll ? undefined : this.paginate(settings.fontSize, settings.columnCount);

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
      lineLength: settings.scroll ? this.computeScrollLength(settings.fontSize) : pagination?.effectiveLineLength,
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

  private getCompensatedMetrics(scale: number | null) {
    const zoomFactor = scale || this.userProperties.fontSize || 1;
    const zoomCompensation = zoomFactor < 1 
      ? this.layoutStrategy === LayoutStrategy.margin 
        ? 1 / (zoomFactor + 0.003)
        : 1 / zoomFactor
      : 1;

    return {
      zoomFactor: zoomFactor,
      zoomCompensation: zoomCompensation,
      optimal: Math.round(this.lineLengths.userLineLength || this.lineLengths.optimalLineLength) * zoomFactor,
      minimal: this.lineLengths.minimalLineLength !== null 
        ? Math.round(this.lineLengths.minimalLineLength * zoomFactor) 
        : null,
      maximal: this.lineLengths.maximalLineLength !== null 
        ? Math.round(this.lineLengths.maximalLineLength * zoomFactor) 
        : null
    }
  }

  // Note: Kept intentionally verbose for debugging
  private paginate(scale: number | null, colCount?: number | null) {
    const constrainedWidth = Math.round(this.containerParent.clientWidth - (this.constraint));
    const metrics = this.getCompensatedMetrics(scale);
    const zoomCompensation = metrics.zoomCompensation;
    const optimal = metrics.optimal;
    const minimal = metrics.minimal;
    const maximal = metrics.maximal;

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
      if (this.layoutStrategy === LayoutStrategy.margin) {
        if (constrainedWidth >= optimal) {
          RCSSColCount = Math.floor(constrainedWidth / optimal);
          const requiredWidth = Math.round(RCSSColCount * (optimal * zoomCompensation));
          pagedContainerWidth = Math.min(requiredWidth, constrainedWidth);
        } else {
          RCSSColCount = 1;
          pagedContainerWidth = constrainedWidth;
        }
      } else if (this.layoutStrategy === LayoutStrategy.lineLength) {
        if (constrainedWidth < optimal || maximal === null) {
          RCSSColCount = 1;
          pagedContainerWidth = constrainedWidth;
        } else {
          RCSSColCount = Math.floor(constrainedWidth / optimal);
          const requiredWidth = Math.round(RCSSColCount * (maximal * zoomCompensation));
          pagedContainerWidth = Math.min(requiredWidth, constrainedWidth);
        }
      } else if (this.layoutStrategy === LayoutStrategy.columns) {
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
        if (this.layoutStrategy === LayoutStrategy.margin) {
          const requiredWidth = Math.round(RCSSColCount * (optimal * zoomCompensation));
          pagedContainerWidth = Math.min(requiredWidth, constrainedWidth);
        } else if (
          this.layoutStrategy === LayoutStrategy.lineLength ||
          this.layoutStrategy === LayoutStrategy.columns
        ) {
          if (maximal === null) {
            pagedContainerWidth = constrainedWidth
          } else {
            const requiredWidth = Math.round(RCSSColCount * (maximal * zoomCompensation));
            pagedContainerWidth = Math.min(requiredWidth, constrainedWidth);
          }

          if (this.layoutStrategy === LayoutStrategy.columns) {
            console.error("Columns strategy is not compatible with a column count whose value is a number. Falling back to lineLength strategy.");
          }
        }
      } else {
        if (minimal !== null && constrainedWidth < Math.round(colCount * minimal)) {
          RCSSColCount = Math.floor(constrainedWidth / minimal);
        } else {
          RCSSColCount = colCount;
        }
        const requiredWidth = Math.round((RCSSColCount * (optimal * zoomCompensation)));
        pagedContainerWidth = Math.min(requiredWidth, constrainedWidth);
      }
    } else {
      RCSSColCount = 1;
      
      if (constrainedWidth >= optimal) {
        if (this.layoutStrategy === LayoutStrategy.margin) {
          const requiredWidth = Math.round(optimal * zoomCompensation);
          pagedContainerWidth = Math.min(requiredWidth, constrainedWidth);
        } else if (
          this.layoutStrategy === LayoutStrategy.lineLength ||
          this.layoutStrategy === LayoutStrategy.columns
        ) {
          if (maximal === null) {
            pagedContainerWidth = constrainedWidth
          } else {
            const requiredWidth = Math.round(maximal * zoomCompensation);
            pagedContainerWidth = Math.min(requiredWidth, constrainedWidth);
          }
          
          if (this.layoutStrategy === LayoutStrategy.columns) {
            console.error("Columns strategy is not compatible with a column count whose value is a number. Falling back to lineLength strategy.");
          }
        }
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

  // This behaves as paginate where colCount = 1
  private computeScrollLength(scale: number | null) {
    const metrics = this.getCompensatedMetrics(scale);
    const zoomCompensation = metrics.zoomCompensation;
    const optimal = metrics.optimal;
    const maximal = metrics.maximal;

    if (this.layoutStrategy === LayoutStrategy.margin) {
      const computedWidth = Math.min(Math.round(optimal * zoomCompensation), this.containerParent.clientWidth);
      return Math.round(computedWidth * zoomCompensation);
    } else if (
      this.layoutStrategy === LayoutStrategy.lineLength ||
      this.layoutStrategy === LayoutStrategy.columns
    ) {
      if (this.layoutStrategy === LayoutStrategy.columns) {
        console.error("Columns strategy is not compatible with scroll. Falling back to lineLength strategy.");
      }
      if (maximal === null) {
        return this.containerParent.clientWidth;
      } else {
        const computedWidth = Math.min(Math.round(maximal * zoomCompensation), this.containerParent.clientWidth);
        return Math.round(computedWidth * zoomCompensation);
      }
    }

    return Math.round(optimal * zoomCompensation);
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
      this.userProperties.lineLength = this.computeScrollLength(this.userProperties.fontSize);
      this.container.style.width = `${ this.containerParent.clientWidth }px`;
    } else {
      const pagination = this.paginate(this.userProperties.fontSize, this.cachedColCount);
      this.userProperties.colCount = pagination.colCount;
      this.userProperties.lineLength = pagination.effectiveLineLength;
      this.pagedContainerWidth = pagination.pagedContainerWidth;
      this.container.style.width = `${ this.pagedContainerWidth }px`;
    }
  }
}