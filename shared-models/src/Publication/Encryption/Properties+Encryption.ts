/* Copyright 2020 Readium Foundation. All rights reserved.
 * Use of this source code is governed by a BSD-style license,
 * available in the LICENSE file present in the Github repository of the project.
 */

import { Properties } from "../Properties";
import { IEncryption } from "./Encryption";

declare module "../Properties" {
  export interface Properties {
    getEncryption: () => IEncryption | null;
  }
}

Properties.prototype.getEncryption = function() {
  return this.otherProperties["encryption"] || null;
}