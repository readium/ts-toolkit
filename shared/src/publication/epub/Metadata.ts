/* Copyright 2025 Readium Foundation. All rights reserved.
 * Use of this source code is governed by a BSD-style license,
 * available in the LICENSE file present in the Github repository of the project.
 */

import { Metadata } from "../Metadata";
import { MediaOverlay } from "./MediaOverlay";

declare module '../Metadata' {
  export interface Metadata {
    getMediaOverlay(): MediaOverlay | undefined;
  }
}

Metadata.prototype.getMediaOverlay = function(): MediaOverlay | undefined {
  const mediaOverlay = this.otherMetadata?.['mediaOverlay'];

  if (!mediaOverlay) return;

  return MediaOverlay.deserialize(mediaOverlay);
};