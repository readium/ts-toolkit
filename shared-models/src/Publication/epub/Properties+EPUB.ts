/* Copyright 2020 Readium Foundation. All rights reserved.
 * Use of this source code is governed by a BSD-style license,
 * available in the LICENSE file present in the Github repository of the project.
 */

import { EPUBLayout } from "./Layout";
import { Properties } from "../Properties";

declare module "../Properties" {
  export interface Properties {
    getContains: () => Array<string>;
    getLayout: () => EPUBLayout | null;
  }
}

Properties.prototype.getContains = function() {
  return this.otherProperties["contains"] || [];
}

Properties.prototype.getLayout = function() {
  return this.otherProperties["layout"] || null
}