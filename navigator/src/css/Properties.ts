export type BodyHyphens = "auto" | "none";
export type BoxSizing = "content-box" | "border-box";
export type FontOpticalSizing = "auto" | "none";
export type FontWidth = "ultra-condensed" | "extra-condensed" | "condensed" | "semi-condensed" | "normal" | "semi-expanded" | "expanded" | "extra-expanded" | "ultra-expanded" | number;
export type Ligatures = "common-ligatures" | "none";
export type TypeScale = 1 | 1.067 | 1.125 | 1.2 | 1.25 | 1.333 | 1.414 | 1.5 | 1.618;
export type View = "paged" | "scroll";

export abstract class Properties {
  constructor() {}

  protected toFlag(name: string) {
    return `readium-${ name }-on`;
  }

  protected toUnitless(value: number) {
    return value.toString();
  }

  protected toPercentage(value: number, ratio: boolean = false) {
    if (ratio || value > 0 && value <= 1) {
      return `${ Math.round(value * 100) }%`;
    } else {
      return `${ value }%`;
    }
  }

  protected toVw(value: number) {
    const percentage = Math.round(value * 100);
    return `${ Math.min(percentage, 100) }vw`;
  }

  protected toVh(value: number) {
    const percentage = Math.round(value * 100);
    return `${ Math.min(percentage, 100) }vh`;
  }

  protected toPx(value: number) {
    return `${ value }px`;
  }

  protected toRem(value: number) {
    return `${ value }rem`;
  }

  abstract toCSSProperties(): { [key: string]: string };
}