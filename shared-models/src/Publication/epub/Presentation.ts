import { Link } from '../Link';
import { Presentation } from '../presentation/Presentation';
import { EpubLayout } from './EpubLayout';

declare module '../presentation/Presentation' {
  export interface Presentation {
    layoutOf(link: Link): EpubLayout;
  }
}

/** Determines the layout of the given resource in this publication.
 *  Default layout is reflowable.
 */
Presentation.prototype.layoutOf = function(link: Link): EpubLayout {
  return link.properties?.getLayout() || this.layout || EpubLayout.reflowable;
};
