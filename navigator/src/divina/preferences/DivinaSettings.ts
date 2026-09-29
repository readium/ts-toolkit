import { ConfigurableSettings } from "../../preferences/Configurable.ts";
import { DivinaQuality } from "../DivinaVariantSelector.ts";
import { DivinaDefaults } from "./DivinaDefaults.ts";
import { DivinaPreferences } from "./DivinaPreferences.ts";

export interface IDivinaSettings {
  backgroundColor?: string | null,
  constraint?: number | null,
  quality?: DivinaQuality | null,
  scrolled?: boolean | null,
  spreads?: boolean | null,
  stripWidth?: number | null
}

export class DivinaSettings implements ConfigurableSettings {
  backgroundColor: string | null;
  constraint: number;
  quality: DivinaQuality;
  scrolled: boolean;
  spreads: boolean;
  stripWidth: number;

  /**
   * @param manifestScrolled Whether the publication itself declares `layout: scrolled`.
   * A natively scrolled publication (e.g. webtoon) cannot be switched to paged mode,
   * while a fixed publication can be switched to scrolled by the user.
   */
  constructor(preferences: DivinaPreferences, defaults: DivinaDefaults, manifestScrolled: boolean) {
    this.backgroundColor = preferences.backgroundColor ?? defaults.backgroundColor;
    this.constraint = preferences.constraint ?? defaults.constraint;
    this.quality = preferences.quality ?? defaults.quality;
    this.scrolled = manifestScrolled
      ? true
      : (preferences.scrolled ?? defaults.scrolled ?? false);
    this.spreads = preferences.spreads ?? defaults.spreads;
    this.stripWidth = preferences.stripWidth ?? defaults.stripWidth;
  }
}
