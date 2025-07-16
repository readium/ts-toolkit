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