/* Copyright 2020 Readium Foundation. All rights reserved.
 * Use of this source code is governed by a BSD-style license,
 * available in the LICENSE file present in the Github repository of the project.
 */

import { Fit, Orientation, Overflow, Page, Spread } from "./Presentation";
import { Properties } from "../Properties";

declare module "../Properties" {
  export interface Properties {
    getClipped: () => boolean;
    getFit: () => Fit | null;
    getOrientation: () => Orientation | null;
    getOverflow: () => Overflow | null;
    getPage: () => Page | null;
    getSpread: () => Spread | null;
  }
}

Properties.prototype.getClipped = function() {
  return this.otherProperties["clipped"] || false;
}

Properties.prototype.getFit = function() {
  return this.otherProperties["fit"] || null;
}

Properties.prototype.getOrientation = function() {
  return this.otherProperties["orientation"] || null;
}

Properties.prototype.getOverflow = function() {
  return this.otherProperties["overflow"] || null;
}

Properties.prototype.getPage = function() {
  return this.otherProperties["page"] || null;
}

Properties.prototype.getSpread = function() {
  return this.otherProperties["spread"] || null;
}