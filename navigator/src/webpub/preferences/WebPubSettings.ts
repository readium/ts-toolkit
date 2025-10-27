import { ConfigurableSettings } from "../../preferences/Configurable";
import { WebPubDefaults } from "./WebPubDefaults";
import { WebPubPreferences } from "./WebPubPreferences";

export interface IWebPubSettings {
  zoom?: number | null;
}

export class WebPubSettings implements ConfigurableSettings {
  zoom: number | null;

  constructor(preferences: WebPubPreferences, defaults: WebPubDefaults) {
    this.zoom = preferences.zoom !== undefined
      ? preferences.zoom
      : defaults.zoom !== undefined
        ? defaults.zoom
        : null;
  }
}
