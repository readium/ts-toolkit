import { Properties } from '../Properties';
import { EPUBLayout } from './EPUBLayout';

// EPUB extensions for link [Properties].
// https://readium.org/webpub-manifest/schema/extensions/epub/properties.schema.json

declare module '../Properties' {
  export interface Properties {
    /**
     * Identifies content contained in the linked resource, that cannot be strictly identified using a
     * media type.
     */
    getContains(): Set<string> | undefined;

    /**
     * Hints how the layout of the resource should be presented.
     */
    getLayout(): EPUBLayout | undefined;
  }
}

Properties.prototype.getContains = function(): Set<string> | undefined {
  return new Set<string>(this.otherProperties['contains'] || []);
};

Properties.prototype.getLayout = function(): EPUBLayout | undefined {
  return this.otherProperties['layout'];
};
