/* Copyright 2020 Readium Foundation. All rights reserved.
 * Use of this source code is governed by a BSD-style license,
 * available in the LICENSE file present in the Github repository of the project.
 */

import { Metadata } from "../Metadata";
import { Presentation } from "./Presentation";

declare module "../Metadata" {
  export interface Metadata {
    getPresentation: () => Presentation;
  }
}

Metadata.prototype.getPresentation = function () {
  return (this.otherMetadata && this.otherMetadata.json["presentation"])
    ? new Presentation(this.otherMetadata.json["presentation"])
    : new Presentation({});
}