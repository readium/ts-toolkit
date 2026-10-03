import { DecorationStyleType } from "../../decorations/index.ts";
import { ensureDecorationStyle, ensureEnumValue } from "../../preferences/guards.ts";
import { IReadAloudPreferences, ReadAloudAutoPause, ReadAloudDecorationStyle } from "./ReadAloudPreferences.ts";

export type IReadAloudDefaults = IReadAloudPreferences;

export class ReadAloudDefaults {
  /** Defaults of the speech fields, validated by speech itself. */
  speech: IReadAloudPreferences;
  autoPause: ReadAloudAutoPause;
  utteranceStyle: ReadAloudDecorationStyle;
  wordStyle: ReadAloudDecorationStyle;

  constructor(defaults: IReadAloudDefaults = {}) {
    const { autoPause, utteranceStyle, wordStyle, ...speech } = defaults;
    // Sentences are only joined across objects, and so across pages, in sentence segmentation.
    this.speech = { segmentation: "sentence", skip: ["pagebreak"], ...speech };
    this.autoPause = ensureEnumValue<ReadAloudAutoPause>(autoPause, ReadAloudAutoPause) || ReadAloudAutoPause.none;
    this.utteranceStyle = ensureDecorationStyle(utteranceStyle) ?? { type: DecorationStyleType.Highlight };
    this.wordStyle = ensureDecorationStyle(wordStyle) ?? { type: DecorationStyleType.Underline };
  }
}
