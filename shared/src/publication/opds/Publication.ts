import { Links } from '../Link.ts';
import { Publication } from '../Publication.ts';

// OPDS extensions for Publication.

export function getImages(pub: Publication): Links | undefined {
  return pub.linksWithRole('images');
}
