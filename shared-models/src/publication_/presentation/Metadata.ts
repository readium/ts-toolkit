import { Metadata } from '../Metadata';
import { Presentation } from './Presentation';

// Presentation extensions for [Metadata]

declare module '../Metadata' {
  export interface Metadata {
    getPresentation(): Presentation | undefined;
  }
}

Metadata.prototype.getPresentation = function(): Presentation | undefined {
  const presentation =
    this.otherMetadata?.['presentation'] || this.otherMetadata?.['rendition'];

  if (!presentation) return;

  return Presentation.deserialize(presentation);
};
