import {
  ensureBoolean,
  ensureEnumValue,
  ensureNonNegative,
  ensureString,
  ensureValueInRange
} from "../../preferences/guards.ts";

import { DivinaQuality } from "../DivinaVariantSelector.ts";
import { stripWidthRangeConfig } from "./DivinaPreferences.ts";

export interface IDivinaDefaults {
  backgroundColor?: string | null,
  constraint?: number | null,
  quality?: DivinaQuality | null,
  scrolled?: boolean | null,
  spreads?: boolean | null,
  stripWidth?: number | null
}

export class DivinaDefaults {
  backgroundColor: string | null;
  constraint: number;
  quality: DivinaQuality;
  scrolled: boolean | null;
  spreads: boolean;
  stripWidth: number;

  constructor(defaults: IDivinaDefaults) {
    this.backgroundColor = ensureString(defaults.backgroundColor) || null;
    this.constraint = ensureNonNegative(defaults.constraint) || 0;
    this.quality = ensureEnumValue<DivinaQuality>(defaults.quality, DivinaQuality) || DivinaQuality.auto;
    this.scrolled = ensureBoolean(defaults.scrolled) ?? null;
    this.spreads = ensureBoolean(defaults.spreads) ?? true;
    this.stripWidth = ensureValueInRange(defaults.stripWidth, stripWidthRangeConfig.range) || 720;
  }
}
