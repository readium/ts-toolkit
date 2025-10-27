import { zoomRangeConfig } from "../../preferences/Types";

import {
  ensureValueInRange
} from "../../preferences/guards";

export interface IWebPubDefaults {
  zoom?: number | null;
}

export class WebPubDefaults {
  zoom: number;

  constructor(defaults: IWebPubDefaults) {
    this.zoom = ensureValueInRange(defaults.zoom, zoomRangeConfig.range) || 1;
  }
}
