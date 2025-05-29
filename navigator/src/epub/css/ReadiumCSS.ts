import { LineLengths } from "../../helpers";
import { getContentWidth } from "../../helpers/dimensions";
import { LayoutStrategy } from "../../preferences";
import { EpubSettings } from "../preferences/EpubSettings";
import { IUserProperties, RSProperties, UserProperties } from "./Properties";

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
  private effectiveContainerWidth: number;

  constructor(props: IReadiumCSS) {
    this.rsProperties = props.rsProperties;
    this.userProperties = props.userProperties;
    this.lineLengths = props.lineLengths;
    this.container = props.container;
    this.containerParent = props.container.parentElement || document.documentElement;
    this.constraint = props.constraint;
    this.layoutStrategy = props.layoutStrategy || LayoutStrategy.lineLength;
    this.cachedColCount = props.userProperties.colCount;
    this.effectiveContainerWidth = getContentWidth(this.containerParent);
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
    this.lineLengths.update({
      fontFace: settings.fontFamily,
      letterSpacing: settings.letterSpacing,
      pageGutter: settings.pageGutter,
      wordSpacing: settings.wordSpacing,
      optimalChars: settings.optimalLineLength,
      minChars: settings.minimalLineLength,
      maxChars: settings.maximalLineLength
    });

    const layout = this.updateLayout(settings.fontSize, settings.deprecatedFontSize, settings.scroll, settings.columnCount);

    if (layout?.effectiveContainerWidth)
      this.effectiveContainerWidth = layout?.effectiveContainerWidth;
    
    const updated: IUserProperties = {
      a11yNormalize: settings.textNormalization,
      appearance: settings.theme,
      backgroundColor: settings.backgroundColor,
      blendFilter: settings.blendFilter,
      bodyHyphens: typeof settings.hyphens !== "boolean" 
        ? null 
        : settings.hyphens 
          ? "auto" 
          : "none",
      colCount: layout?.colCount,
      darkenFilter: settings.darkenFilter,
      deprecatedFontSize: settings.deprecatedFontSize,
      fontFamily: settings.fontFamily,
      fontOpticalSizing: typeof settings.fontOpticalSizing !== "boolean" 
        ? null 
        : settings.fontOpticalSizing 
          ? "auto" 
          : "none",
      fontOverride: settings.fontOverride !== null 
        ? settings.fontOverride 
        : (settings.textNormalization || settings.fontFamily 
          ? true 
          : false
        ),
      fontSize: settings.fontSize,
      fontSizeNormalize: settings.fontSizeNormalize,
      fontWeight: settings.fontWeight,
      fontWidth: settings.fontWidth,
      invertFilter: settings.invertFilter,
      invertGaijiFilter: settings.invertGaijiFilter,
      iPadOSPatch: settings.iPadOSPatch,
      letterSpacing: settings.letterSpacing,
      ligatures: typeof settings.ligatures !== "boolean" 
        ? null 
        : settings.ligatures 
          ? "common-ligatures" 
          : "none",
      lineHeight: settings.lineHeight,
      lineLength: layout?.effectiveLineLength,
      linkColor: settings.linkColor,
      noRuby: settings.noRuby,
      paraIndent: settings.paragraphIndent,
      paraSpacing: settings.paragraphSpacing,
      selectionBackgroundColor: settings.selectionBackgroundColor,
      selectionTextColor: settings.selectionTextColor,
      textAlign: settings.textAlign,
      textColor: settings.textColor,
      view: typeof settings.scroll !== "boolean" 
        ? null 
        : settings.scroll 
          ? "scroll" 
          : "paged",
      visitedColor: settings.visitedColor,
      wordSpacing: settings.wordSpacing
    };

    this.userProperties = new UserProperties(updated);
  }

  private updateLayout(scale: number | null, deprecatedImplem: boolean | null, scroll: boolean | null, colCount?: number | null) {
    const isScroll = scroll ?? this.userProperties.view === "scroll";

    if (isScroll) {
      return this.computeScrollLength(scale, deprecatedImplem);
    } else {
      return this.paginate(scale, deprecatedImplem, colCount);
    }
  }

  private getCompensatedMetrics(scale: number | null, deprecatedImplem: boolean | null) {
    const zoomFactor = scale || this.userProperties.fontSize || 1;
    const zoomCompensation = zoomFactor < 1 
      ? this.layoutStrategy === LayoutStrategy.margin 
        ? 1 / (zoomFactor + 0.003)
        : 1 / zoomFactor
      : deprecatedImplem 
        ? zoomFactor 
        : 1;

    return {
      zoomFactor: zoomFactor,
      zoomCompensation: zoomCompensation,
      optimal: Math.round(this.lineLengths.optimalLineLength) * zoomFactor,
      minimal: this.lineLengths.minimalLineLength !== null 
        ? Math.round(this.lineLengths.minimalLineLength * zoomFactor) 
        : null,
      maximal: this.lineLengths.maximalLineLength !== null 
        ? Math.round(this.lineLengths.maximalLineLength * zoomFactor) 
        : null
    }
  }

  // Note: Kept intentionally verbose for debugging
  // TODO: As scroll shows, the effective line-length
  // should be the same as uncompensated when scale >= 1
  private paginate(scale: number | null, deprecatedImplem: boolean | null, colCount?: number | null) {
    const constrainedWidth = Math.round(getContentWidth(this.containerParent) - (this.constraint));
    const metrics = this.getCompensatedMetrics(scale, deprecatedImplem);
    const zoomCompensation = metrics.zoomCompensation;
    const optimal = metrics.optimal;
    const minimal = metrics.minimal;
    const maximal = metrics.maximal;

    let RCSSColCount = 1;
    let effectiveContainerWidth = constrainedWidth;

    if (colCount === undefined) {
      return { 
        colCount: undefined, 
        effectiveContainerWidth: effectiveContainerWidth, 
        effectiveLineLength: Math.round((effectiveContainerWidth / RCSSColCount) * zoomCompensation) 
      };
    }
    
    if (colCount === null) {
      if (this.layoutStrategy === LayoutStrategy.margin) {
        if (constrainedWidth >= optimal) {
          RCSSColCount = Math.floor(constrainedWidth / optimal);
          const requiredWidth = Math.round(RCSSColCount * (optimal * zoomCompensation));
          effectiveContainerWidth = Math.min(requiredWidth, constrainedWidth);
        } else {
          RCSSColCount = 1;
          effectiveContainerWidth = constrainedWidth;
        }
      } else if (this.layoutStrategy === LayoutStrategy.lineLength) {
        if (constrainedWidth < optimal || maximal === null) {
          RCSSColCount = 1;
          effectiveContainerWidth = constrainedWidth;
        } else {
          RCSSColCount = Math.floor(constrainedWidth / optimal);
          const requiredWidth = Math.round(RCSSColCount * (maximal * zoomCompensation));
          effectiveContainerWidth = Math.min(requiredWidth, constrainedWidth);
        }
      } else if (this.layoutStrategy === LayoutStrategy.columns) {
        if (constrainedWidth >= optimal) {
          if (maximal === null) {
            RCSSColCount = Math.floor(constrainedWidth / optimal);
            effectiveContainerWidth = constrainedWidth;
          } else {
            RCSSColCount = Math.floor(constrainedWidth / (minimal || optimal));
            const requiredWidth = Math.round((RCSSColCount * (optimal * zoomCompensation)));
            effectiveContainerWidth = Math.min(requiredWidth, constrainedWidth);
          }
        } else {
          RCSSColCount = 1;
          effectiveContainerWidth = constrainedWidth;
        }
      }
    } else if (colCount > 1) {
      const minRequiredWidth = Math.round(colCount * (minimal !== null ? minimal : optimal));
    
      if (constrainedWidth >= minRequiredWidth) {
        RCSSColCount = colCount;
        if (this.layoutStrategy === LayoutStrategy.margin) {
          const requiredWidth = Math.round(RCSSColCount * (optimal * zoomCompensation));
          effectiveContainerWidth = Math.min(requiredWidth, constrainedWidth);
        } else if (
          this.layoutStrategy === LayoutStrategy.lineLength ||
          this.layoutStrategy === LayoutStrategy.columns
        ) {
          if (maximal === null) {
            effectiveContainerWidth = constrainedWidth
          } else {
            const requiredWidth = Math.round(RCSSColCount * (maximal * zoomCompensation));
            effectiveContainerWidth = Math.min(requiredWidth, constrainedWidth);
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
        effectiveContainerWidth = Math.min(requiredWidth, constrainedWidth);
      }
    } else {
      RCSSColCount = 1;
      
      if (constrainedWidth >= optimal) {
        if (this.layoutStrategy === LayoutStrategy.margin) {
          const requiredWidth = Math.round(optimal * zoomCompensation);
          effectiveContainerWidth = Math.min(requiredWidth, constrainedWidth);
        } else if (
          this.layoutStrategy === LayoutStrategy.lineLength ||
          this.layoutStrategy === LayoutStrategy.columns
        ) {
          if (maximal === null) {
            effectiveContainerWidth = constrainedWidth
          } else {
            const requiredWidth = Math.round(maximal * zoomCompensation);
            effectiveContainerWidth = Math.min(requiredWidth, constrainedWidth);
          }
          
          if (this.layoutStrategy === LayoutStrategy.columns) {
            console.error("Columns strategy is not compatible with a column count whose value is a number. Falling back to lineLength strategy.");
          }
        }
      } else {
        effectiveContainerWidth = constrainedWidth 
      }
    }

    return { 
      colCount: RCSSColCount, 
      effectiveContainerWidth: effectiveContainerWidth, 
      effectiveLineLength: Math.round(((effectiveContainerWidth / RCSSColCount) / (scale && scale >= 1 ? scale : 1)) * zoomCompensation)
    };
  }

  // This behaves as paginate where colCount = 1
  private computeScrollLength(scale: number | null, deprecatedImplem: boolean | null) {
    const constrainedWidth = Math.round(getContentWidth(this.containerParent) - (this.constraint));
    const metrics = this.getCompensatedMetrics(scale && (scale < 1 || deprecatedImplem) ? scale : 1, deprecatedImplem);
    const zoomCompensation = metrics.zoomCompensation;
    const optimal = metrics.optimal;
    const maximal = metrics.maximal;

    let RCSSColCount = undefined;
    let effectiveContainerWidth = constrainedWidth;
    let effectiveLineLength = Math.round(optimal * zoomCompensation);

    if (this.layoutStrategy === LayoutStrategy.margin) {
      const computedWidth = Math.min(Math.round(optimal * zoomCompensation), constrainedWidth);
      effectiveLineLength = deprecatedImplem ? computedWidth : Math.round(computedWidth * zoomCompensation);
    } else if (
      this.layoutStrategy === LayoutStrategy.lineLength ||
      this.layoutStrategy === LayoutStrategy.columns
    ) {
      if (this.layoutStrategy === LayoutStrategy.columns) {
        console.error("Columns strategy is not compatible with scroll. Falling back to lineLength strategy.");
      }
      if (maximal === null) {
        effectiveLineLength = constrainedWidth;
      } else {
        const computedWidth = Math.min(Math.round(maximal * zoomCompensation), constrainedWidth);
        effectiveLineLength = deprecatedImplem ? computedWidth : Math.round(computedWidth * zoomCompensation);
      }
    }

    return { 
      colCount: RCSSColCount, 
      effectiveContainerWidth: effectiveContainerWidth, 
      effectiveLineLength: effectiveLineLength
    }
  }

  setContainerWidth() {
    this.container.style.width = `${ this.effectiveContainerWidth }px`;
  }

  resizeHandler() {
    const pagination = this.updateLayout(this.userProperties.fontSize, this.userProperties.deprecatedFontSize, this.userProperties.view === "scroll", this.cachedColCount);
    this.userProperties.colCount = pagination.colCount;
    this.userProperties.lineLength = pagination.effectiveLineLength;
    this.effectiveContainerWidth = pagination.effectiveContainerWidth;
    this.container.style.width = `${ this.effectiveContainerWidth }px`;
  }
}