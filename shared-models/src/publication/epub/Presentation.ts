import { Link } from '../Link';
import { Presentation } from '../presentation/Presentation';
import { EPUBLayout } from './EPUBLayout';

declare module '../presentation/Presentation' {
  export interface Presentation {
    layoutOf(link: Link): EPUBLayout;
  }
}

/** Determines the layout of the given resource in this publication.
 *  Default layout is reflowable.
 */
Presentation.prototype.layoutOf = function(link: Link): EPUBLayout {
  return link.properties?.getLayout() || this.layout || EPUBLayout.reflowable;
};
