import { ConfigurablePreferences } from "../../preferences/Configurable.ts";
import { RangeConfig } from "../../preferences/Types.ts";
import { DivinaQuality } from "../DivinaVariantSelector.ts";

import {
  ensureBoolean,
  ensureEnumValue,
  ensureNonNegative,
  ensureString,
  ensureValueInRange
} from "../../preferences/guards.ts";

/**
 * Maximum width in pixels of the vertical strip in scrolled mode.
 */
export const stripWidthRangeConfig: RangeConfig = {
  range: [480, 2400],
  step: 20
}

export interface IDivinaPreferences {
  /** Background color behind the pages (equivalent of the EPUB page background theme) */
  backgroundColor?: string | null,
  /** Number of pixels to constrain the container width by (e.g. for docked panels) */
  constraint?: number | null,
  /** Image quality when the publication offers alternate resolutions */
  quality?: DivinaQuality | null,
  /** Display the publication as a vertical scroll instead of horizontal pages */
  scrolled?: boolean | null,
  /** Display two pages side-by-side on landscape viewports (paged mode only) */
  spreads?: boolean | null,
  /** Maximum width in pixels of the vertical strip in scrolled mode */
  stripWidth?: number | null
}

export class DivinaPreferences implements ConfigurablePreferences<DivinaPreferences> {
  backgroundColor?: string | null;
  constraint?: number | null;
  quality?: DivinaQuality | null;
  scrolled?: boolean | null;
  spreads?: boolean | null;
  stripWidth?: number | null;

  constructor(preferences: IDivinaPreferences = {}) {
    this.backgroundColor = ensureString(preferences.backgroundColor);
    this.constraint = ensureNonNegative(preferences.constraint);
    this.quality = ensureEnumValue<DivinaQuality>(preferences.quality, DivinaQuality);
    this.scrolled = ensureBoolean(preferences.scrolled);
    this.spreads = ensureBoolean(preferences.spreads);
    this.stripWidth = ensureValueInRange(preferences.stripWidth, stripWidthRangeConfig.range);
  }

  static serialize(preferences: DivinaPreferences): string {
    const { ...properties } = preferences;
    return JSON.stringify(properties);
  }

  static deserialize(preferences: string): DivinaPreferences | null {
    try {
      const parsedPreferences = JSON.parse(preferences);
      return new DivinaPreferences(parsedPreferences);
    } catch (error) {
      console.error("Failed to deserialize preferences:", error);
      return null;
    }
  }

  merging(other: DivinaPreferences): DivinaPreferences {
    const merged: IDivinaPreferences = { ...this };
    for (const key of Object.keys(other) as (keyof IDivinaPreferences)[]) {
      if (other[key] !== undefined) {
        (merged as Record<string, unknown>)[key] = other[key];
      }
    }
    return new DivinaPreferences(merged);
  }
}
