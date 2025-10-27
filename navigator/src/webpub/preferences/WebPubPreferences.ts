import { ConfigurablePreferences } from "../../preferences/Configurable";

import { zoomRangeConfig } from "../../preferences/Types";

import {
  ensureValueInRange
} from "../../preferences/guards";

export interface IWebPubPreferences {
  zoom?: number | null;
}

export class WebPubPreferences implements ConfigurablePreferences {
  zoom?: number | null;

  constructor(preferences: IWebPubPreferences = {}) {
    this.zoom = ensureValueInRange(preferences.zoom, zoomRangeConfig.range);
  }

  static serialize(preferences: WebPubPreferences): string {
    const { ...properties } = preferences;
    return JSON.stringify(properties);
  }

  static deserialize(preferences: string): WebPubPreferences | null {
    try {
      const parsedPreferences = JSON.parse(preferences);
      return new WebPubPreferences(parsedPreferences);
    } catch (error) {
      console.error("Failed to deserialize preferences:", error);
      return null;
    }
  }

  merging(other: ConfigurablePreferences): ConfigurablePreferences {
    const merged: IWebPubPreferences = { ...this };
    for (const key of Object.keys(other) as (keyof IWebPubPreferences)[]) {
      if (other[key] !== undefined) {
        merged[key] = other[key];
      }
    }
    return new WebPubPreferences(merged);
  }
}
