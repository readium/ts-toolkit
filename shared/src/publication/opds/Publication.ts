import { Links } from '../Link';
import { Publication } from '../Publication';

// OPDS extensions for [Publication]

declare module '../Publication' {
  export interface Publication {
    getImages(): Links | undefined;
  }
}

Publication.prototype.getImages = function(): Links | undefined {
  return this.linksWithRole('images');
};
