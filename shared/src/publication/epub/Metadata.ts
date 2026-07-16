import { Metadata } from '../Metadata.ts';
import { MediaOverlay } from './MediaOverlay.ts';

// EPUB extensions for Metadata.

export function getMediaOverlay(metadata: Metadata): MediaOverlay | undefined {
  const mediaOverlay = metadata.otherMetadata?.['mediaOverlay'];
  if (!mediaOverlay) return;
  return MediaOverlay.deserialize(mediaOverlay);
}
