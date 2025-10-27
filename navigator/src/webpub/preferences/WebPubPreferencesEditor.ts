import { Metadata } from "@readium/shared";
import { IPreferencesEditor } from "../../preferences/PreferencesEditor";
import { WebPubPreferences } from "./WebPubPreferences";
import { WebPubSettings } from "./WebPubSettings";
import { RangePreference } from "../../preferences/Preference";
import { zoomRangeConfig } from "../../preferences/Types";

// WIP: will change cos' of all the missing pieces
export class WebPubPreferencesEditor implements IPreferencesEditor {
  preferences: WebPubPreferences;
  private settings: WebPubSettings;
  private metadata: Metadata | null;

  constructor(initialPreferences: WebPubPreferences, settings: WebPubSettings, metadata: Metadata) {
    this.preferences = initialPreferences;
    this.settings = settings;
    this.metadata = metadata;
  }

  clear() {
    this.preferences = new WebPubPreferences({ zoom: 1 });
  }

  private updatePreference<K extends keyof WebPubPreferences>(key: K, value: WebPubPreferences[K]) {
    this.preferences[key] = value;
  }

  get zoom(): RangePreference<number> {
    return new RangePreference<number>({
      initialValue: this.preferences.zoom,
      effectiveValue: this.settings.zoom || 1,
      isEffective: true,
      onChange: (newValue: number | null | undefined) => {
        this.updatePreference("zoom", newValue || null);
      },
      supportedRange: zoomRangeConfig.range,
      step: zoomRangeConfig.step
    });
  }
}
