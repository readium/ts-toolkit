export enum TextAlignment {
  start = "start",
  left = "left",
  right = "right",
  justify = "justify"
};

export enum Theme {
  light = "day",
  sepia = "sepia",
  night = "night"
}

export type BodyHyphens = "auto" | "none";

export type BoxSizing = "content-box" | "border-box";

export type FontOpticalSizing = "auto" | "none";

export type FontWidth = /* "ultra-condensed" | "extra-condensed" | "condensed" | "semi-condensed" | "normal" | "semi-expanded" | "expanded" | "extra-expanded" | "ultra-expanded" | */ number;

export type Ligatures = "common-ligatures" | "none";

export type TypeScale = 1 | 1.067 | 1.125 | 1.2 | 1.25 | 1.333 | 1.414 | 1.5 | 1.618;

export type View = "paged" | "scroll";