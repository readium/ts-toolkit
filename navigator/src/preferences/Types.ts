import RCSSExperiments from "@readium/css/css/vars/experiments.json";
import RCSSSettings from "@readium/css/css/vars/settings.json";
import RCSSI18n from "@readium/css/css/vars/i18n.json";

export type ExperimentKey = keyof typeof RCSSExperiments;
export type SettingsKey = keyof typeof RCSSSettings;
export type I18nKey = keyof typeof RCSSI18n;

export type RCSSSettingsProperty =
  | (typeof RCSSSettings)[SettingsKey]["disabled"][number]
  | (typeof RCSSSettings)[SettingsKey]["added"][number];

export type RCSSSettingsEntry = {
  disabled: readonly RCSSSettingsProperty[];
  added: readonly RCSSSettingsProperty[];
}

export type RCSSI18nEntry = {
  baseFontFamily: string;
  lineHeightCompensation?: number;
}

export const experiments = RCSSExperiments;
export const settings: Record<SettingsKey, RCSSSettingsEntry> = RCSSSettings;
export const i18n: Record<I18nKey, RCSSI18nEntry> = RCSSI18n;

export enum TextAlignment {
  start = "start",
  left = "left",
  right = "right",
  justify = "justify"
};

export type RangeConfig = {
  range: [number, number],
  step: number
}

// ReadiumCSS preferences

export const filterRangeConfig: RangeConfig = {
  range: [0, 100],
  step: 1
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

export const letterSpacingRangeConfig: RangeConfig = {
  range: [0, 1],
  step: .125
}

export const lineHeightRangeConfig: RangeConfig = {
  range: [1, 2.5],
  step: .1
}

export const lineLengthRangeConfig: RangeConfig = {
  range: [20, 100],
  step: 1
}

export const paragraphIndentRangeConfig: RangeConfig = {
  range: [0, 3],
  step: .25
}

export const paragraphSpacingRangeConfig: RangeConfig = {
  range: [0, 3],
  step: .25
}

export const wordSpacingRangeConfig: RangeConfig = {
  range: [0, 2],
  step: .125
}

export const zoomRangeConfig: RangeConfig = {
  range: [0.7, 4],
  step: 0.05
}

// Audio preferences

export const volumeRangeConfig: RangeConfig = {
  range: [0, 1],
  step: 0.1
}

export const playbackRateRangeConfig: RangeConfig = {
  range: [0.5, 4],
  step: 0.1
}

export const skipIntervalRangeConfig: RangeConfig = {
  range: [5, 60],
  step: 5
}