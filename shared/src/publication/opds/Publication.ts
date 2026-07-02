import { Links } from '../Link.ts';
import { Publication } from '../Publication.ts';

// OPDS extensions for [Publication]

declare module '../Publication' {
  export interface Publication {
    getImages(): Links | undefined;
  }
}

export const __opdsPublication = ((): true => {
  Publication.prototype.getImages = function(): Links | undefined {
    return this.linksWithRole('images');
  };

  return true;
})();
