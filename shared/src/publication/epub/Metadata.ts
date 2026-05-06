import { Metadata } from "../Metadata.ts";
import { MediaOverlay } from "./MediaOverlay.ts";

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
