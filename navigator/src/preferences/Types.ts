export enum TextAlignment {
  start = "start",
  left = "left",
  right = "right",
  justify = "justify"
};

export enum Theme {
  sepia = "sepia",
  night = "night",
  custom = "custom"
}

export enum LayoutStrategy {
  margin = "margin",
  lineLength = "lineLength",
  columns = "columns"
}

export type RangeConfig = {
  range: [number, number],
  step: number
}

export const fontSizeRangeConfig: RangeConfig = {
  range: [0.7, 4],
  step: 0.05
}

export const fontWeightRangeConfig: RangeConfig = {
  range: [100, 1000],
  step: 100
}

export const fontWidthRangeConfig: RangeConfig = {
  range: [50, 250],
  step: 10
}