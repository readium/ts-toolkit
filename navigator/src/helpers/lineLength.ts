import fontStacks from "@readium/css/css/vars/fontStacks.json";

export interface ICustomFontFace {
  name: string;
  url: string;
}

export interface ILineLengthsConfig {
  optimalChars: number;
  minChars?: number | null;
  maxChars?: number | null;
  baseFontSize?: number | null;
  sample?: string | null;
  pageGutter?: number | null;
  fontFace?: string | ICustomFontFace | null;
  letterSpacing?: number | null;
  wordSpacing?: number | null;
  isCJK?: boolean | null;
  getRelative?: boolean | null;
}

export interface ILineLengths {
  min: number | null;
  max: number | null;
  optimal: number;
  baseFontSize: number;
}

const DEFAULT_FONT_SIZE = 16;
const DEFAULT_FONT_FACE = fontStacks.RS__oldStyleTf;

// Notes: 
// 
// We’re “embracing” design limitations of the ch length
// See https://developer.mozilla.org/en-US/docs/Web/CSS/length#ch
//
// Vertical-writing is not implemented yet, as it is not supported in canvas
// which means it has to be emulated by writing each character with an
// offset on the y-axis (using fillText), and getting the total height.
// If you don’t need high accuracy, it’s acceptable to use the one returned with isCJK.
//
// Instead of measuring text for min and maximal, we define multipliers
// at the end, with optimalLineLength as a ref, before returning the lineLengths object.

export class LineLengths {
  private _canvas: HTMLCanvasElement;

  private _optimalChars: number;
  private _minChars?: number | null;
  private _maxChars?: number | null;
  private _baseFontSize: number;
  private _fontFace: string | ICustomFontFace;
  private _sample: string | null;
  private _pageGutter: number;
  private _letterSpacing: number;
  private _wordSpacing: number;
  private _isCJK: boolean;
  private _getRelative: boolean;
  
  private _padding: number;
  private _minDivider: number | null;
  private _maxMultiplier: number | null;
  private _approximatedWordSpaces: number;

  private _optimalLineLength: number | null = null;

  constructor(config: ILineLengthsConfig) {
    this._canvas = document.createElement("canvas");
    this._optimalChars = config.optimalChars;
    this._minChars = config.minChars;
    this._maxChars = config.maxChars;
    this._baseFontSize = config.baseFontSize || DEFAULT_FONT_SIZE;
    this._fontFace = config.fontFace || DEFAULT_FONT_FACE;
    this._sample = config.sample || null;
    this._pageGutter = config.pageGutter || 0;
    this._letterSpacing = config.letterSpacing 
      ? Math.round(config.letterSpacing * this._baseFontSize) 
      : 0;
    this._wordSpacing = config.wordSpacing 
      ? Math.round(config.wordSpacing * this._baseFontSize) 
      : 0;
    this._isCJK = config.isCJK || false;
    this._getRelative = config.getRelative || false;
    this._padding = this._pageGutter * 2;
    this._minDivider = this._minChars && this._minChars < this._optimalChars 
      ? this._optimalChars / this._minChars 
      : this._minChars === null 
        ? null
        : 1;
    this._maxMultiplier = this._maxChars && this._maxChars > this._optimalChars
      ? this._maxChars / this._optimalChars 
      : this._maxChars === null 
        ? null
        : 1;
    this._approximatedWordSpaces = LineLengths.approximateWordSpaces(this._optimalChars, this._sample);
  }

  private updateMultipliers() {
    this._minDivider = this._minChars && this._minChars < this._optimalChars 
      ? this._optimalChars / this._minChars 
      : this._minChars === null 
        ? null
        : 1;

    this._maxMultiplier = this._maxChars && this._maxChars > this._optimalChars 
      ? this._maxChars / this._optimalChars 
      : this._maxChars === null 
        ? null
        : 1;
  }

  // Batch update to guarantee up-to-date values
  // Not filtering because pretty much everything can
  // trigger a recomputation anyway.
  update(props: Partial<ILineLengthsConfig>) {
    if (props.optimalChars) this._optimalChars = props.optimalChars;
    if (props.minChars !== undefined) this._minChars = props.minChars;
    if (props.maxChars !== undefined) this._maxChars = props.maxChars;
    if (props.baseFontSize) this._baseFontSize = props.baseFontSize;
    if (props.fontFace !== undefined) this._fontFace = props.fontFace || DEFAULT_FONT_FACE;
    if (props.letterSpacing) this._letterSpacing = props.letterSpacing;
    if (props.wordSpacing) this._wordSpacing = props.wordSpacing;
    if (props.isCJK != null) this._isCJK = props.isCJK;
    if (props.pageGutter) this._pageGutter = props.pageGutter;
    if (props.getRelative) this._getRelative = props.getRelative;

    if (props.sample) {
      this._sample = props.sample;
      this._approximatedWordSpaces = LineLengths.approximateWordSpaces(this._optimalChars, this._sample);
    }

    this.updateMultipliers();
    this._optimalLineLength = this.getOptimalLineLength();
  }

  get baseFontSize() {
    return this._baseFontSize;
  }

  get minimalLineLength(): number | null {
    if (!this._optimalLineLength) {
      this._optimalLineLength = this.getOptimalLineLength();
    }
    return this._minDivider !== null 
      ? Math.round((this._optimalLineLength / this._minDivider) + this._padding) / (this._getRelative ? this._baseFontSize : 1) 
      : null;
  }

  get maximalLineLength(): number | null {
    if (!this._optimalLineLength) {
      this._optimalLineLength = this.getOptimalLineLength();
    }
    return this._maxMultiplier !== null 
      ? Math.round((this._optimalLineLength * this._maxMultiplier) + this._padding) / (this._getRelative ? this._baseFontSize : 1) 
      : null;
  }

  get optimalLineLength(): number {
    if (!this._optimalLineLength) {
      this._optimalLineLength = this.getOptimalLineLength();
    }
    return Math.round(this._optimalLineLength + this._padding) / (this._getRelative ? this._baseFontSize : 1);
  }

  get all(): ILineLengths {
    if (!this._optimalLineLength) {
      this._optimalLineLength = this.getOptimalLineLength();
    }
    return {
      min: this.minimalLineLength,
      max: this.maximalLineLength,
      optimal: this.optimalLineLength,
      baseFontSize: this._baseFontSize
    }
  }

  private static approximateWordSpaces(chars: number, sample: string | null | undefined) {
    let wordSpaces = 0;
    if (sample && sample.length >= chars) {
      const spaceCount = sample.match(/([\s]+)/gi);
      // Average for number of chars
      wordSpaces = (spaceCount ? spaceCount.length : 0) * (chars / sample.length);
    }
    return wordSpaces;
  }

  private getLineLengthFallback() {
    const letterSpace = this._letterSpacing * (this._optimalChars - 1);
    const wordSpace = this._wordSpacing * this._approximatedWordSpaces;
    return (this._optimalChars * (this._baseFontSize * 0.5)) + letterSpace + wordSpace;
  }

  private getOptimalLineLength() {
    if (this._fontFace) {
      // We know the font and can use canvas as a proxy
      // to get the optimal width for the number of characters
      if (typeof this._fontFace === "string") {
        return this.measureText(this._fontFace);
      } else {
        const customFont = new FontFace(this._fontFace.name, `url(${this._fontFace.url})`);
        customFont.load().then(
          () => {
            document.fonts.add(customFont);
            return this.measureText(customFont.family)
          },
          (_err) => {});
      }
    }
    
    return this.getLineLengthFallback();
  }

  private measureText(fontFace: string | null) {
    // Note: We don’t clear the canvas since we’re not filling it, just measuring
    const ctx: CanvasRenderingContext2D | null = this._canvas.getContext("2d");
    if (ctx && fontFace) {
      // ch based on 0, ic based on water ideograph
      let txt = this._isCJK ? "水".repeat(this._optimalChars) : "0".repeat(this._optimalChars);
      ctx.font = `${this._baseFontSize}px ${fontFace}`;

      if (this._sample && this._sample.length >= this._optimalChars) {
        txt = this._sample.slice(0, this._optimalChars);
      }

      // Not supported in Safari
      if (Object.hasOwn(ctx, "letterSpacing") && Object.hasOwn(ctx, "wordSpacing")) {
        ctx.letterSpacing = this._letterSpacing.toString() + "px";
        ctx.wordSpacing = this._wordSpacing.toString() + "px";
        return ctx.measureText(txt).width;
      } else {
        // Instead of filling text with an offset for each character and space
        // We simply add them to the measured width since we don’t need high accuracy
        const letterSpace = this._letterSpacing * (this._optimalChars - 1);
        const wordSpace = this._wordSpacing * LineLengths.approximateWordSpaces(this._optimalChars, this._sample);
        return ctx.measureText(txt).width + letterSpace + wordSpace;
      }
    } else {
      return this.getLineLengthFallback();
    }
  }
}