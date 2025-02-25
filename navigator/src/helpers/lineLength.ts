export interface ICustomFontFace {
  name: string;
  url: string;
}

export interface ILineLengthsConfig {
  optimalChars: number;
  minChars?: number | null;
  userChars?: number | null;
  fontSize?: number | null;
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
  user: number | null;
  optimal: number;
  fontSize: number;
}

export const DEFAULT_FONT_SIZE = 16;

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
// Instead of measuring text for min, user, and optimal each, we define multipliers
// at the end, with optimalLineLength as a ref, before returning the lineLengths object.

export class LineLengths {
  private _canvas: HTMLCanvasElement;

  private _optimalChars: number;
  private _minChars?: number | null;
  private _userChars: number | null;
  private _fontSize: number;
  private _fontFace: string | ICustomFontFace | null;
  private _sample: string | null;
  private _pageGutter: number;
  private _letterSpacing: number;
  private _wordSpacing: number;
  private _isCJK: boolean;
  private _getRelative: boolean;
  
  private _padding: number;
  private _minDivider: number | null;
  private _userMultiplier: number | null;
  private _approximatedWordSpaces: number;

  private _optimalLineLength: number | null = null;

  constructor(config: ILineLengthsConfig) {
    this._canvas = document.createElement("canvas");
    this._optimalChars = config.optimalChars;
    this._minChars = config.minChars;
    this._userChars = config.userChars || null;
    this._fontSize = config.fontSize || DEFAULT_FONT_SIZE;
    this._fontFace = config.fontFace || null;
    this._sample = config.sample || null;
    this._pageGutter = config.pageGutter || 0;
    this._letterSpacing = config.letterSpacing 
      ? Math.round(config.letterSpacing * this._fontSize) 
      : 0;
    this._wordSpacing = config.wordSpacing 
      ? Math.round(config.wordSpacing * this._fontSize) 
      : 0;
    this._isCJK = config.isCJK || false;
    this._getRelative = config.getRelative || false;
    this._padding = this._pageGutter * 2;
    this._minDivider = this._minChars && this._minChars < this._optimalChars 
      ? this._optimalChars / this._minChars 
      : this._minChars === null 
        ? null
        : 1;
    this._userMultiplier = this._userChars 
      ? this._userChars / this._optimalChars 
      : null;
    this._approximatedWordSpaces = LineLengths.approximateWordSpaces(this._optimalChars, this._sample);
  }

  set userChars(n: number | null) {
    this._userChars = n;
    this._userMultiplier = this._userChars ? this._userChars / this._optimalChars : null;
  }

  set letterSpacing(n: number) {
    this._letterSpacing = Math.round(n * this._fontSize);
    this._optimalLineLength = this.getOptimalLineLength();
  }
  
  set wordSpacing(n: number) {
    this._wordSpacing = Math.round(n * this._fontSize);
    this._optimalLineLength = this.getOptimalLineLength();
  }

  set fontSize(n: number) {
    this._fontSize = n;
    this._optimalLineLength = this.getOptimalLineLength();
  }

  set fontFace(f: string | ICustomFontFace | null) {
    this._fontFace = f;
    this._optimalLineLength = this.getOptimalLineLength();
  }

  set sample(s: string) {
    this._sample = s;
    this._approximatedWordSpaces = LineLengths.approximateWordSpaces(this._optimalChars, this._sample);
  }

  set pageGutter(n: number) {
    this._pageGutter = n;
    this._padding = this._pageGutter * 2;
    this._optimalLineLength = this.getOptimalLineLength();
  }

  set relativeGetters(b: boolean) {
    this._getRelative = b;
  }

  get fontSize() {
    return this._fontSize;
  }

  get minimalLineLength(): number | null {
    if (!this._optimalLineLength) {
      this._optimalLineLength = this.getOptimalLineLength();
    }
    return this._minDivider !== null 
      ? Math.round((this._optimalLineLength / this._minDivider) + this._padding) / (this._getRelative ? this._fontSize : 1) 
      : null;
  }

  get userLineLength(): number | null {
    if (!this._optimalLineLength) {
      this._optimalLineLength = this.getOptimalLineLength();
    }
    return this._userMultiplier !== null 
      ? Math.round((this._optimalLineLength * this._userMultiplier) + this._padding) / (this._getRelative ? this._fontSize : 1) 
      : null;
  }

  get optimalLineLength(): number {
    if (!this._optimalLineLength) {
      this._optimalLineLength = this.getOptimalLineLength();
    }
    return Math.round(this._optimalLineLength + this._padding) / (this._getRelative ? this._fontSize : 1);
  }

  get all(): ILineLengths {
    if (!this._optimalLineLength) {
      this._optimalLineLength = this.getOptimalLineLength();
    }
    return {
      min: this.minimalLineLength,
      user: this.userLineLength,
      optimal: this.optimalLineLength,
      fontSize: this._fontSize
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
    return (this._optimalChars * (this._fontSize * 0.5)) + letterSpace + wordSpace;
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
      ctx.font = `${this._fontSize}px ${fontFace}`;

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