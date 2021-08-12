import { LocatorLocations } from '../Locator';
import { DomRange } from './DomRange';

// HTML extensions for [Locations].
// https://github.com/readium/architecture/blob/master/models/locators/extensions/html.md

declare module '../Locator' {
  export interface LocatorLocations {
    /**
     * A CSS Selector.
     */
    getCssSelector(): string | undefined;

    /**
     * [partialCfi] is an expression conforming to the "right-hand" side of the EPUB CFI syntax, that is
     * to say: without the EPUB-specific OPF spine item reference that precedes the first ! exclamation
     * mark (which denotes the "step indirection" into a publication document). Note that the wrapping
     * epubcfi(***) syntax is not used for the [partialCfi] string, i.e. the "fragment" part of the CFI
     * grammar is ignored.
     */
    getPartialCfi(): string | undefined;

    /**
     * An HTML DOM range.
     */
    getDomRange(): DomRange | undefined;
  }
}

LocatorLocations.prototype.getCssSelector = function(): string | undefined {
  return this.otherLocations?.get('cssSelector');
};

LocatorLocations.prototype.getPartialCfi = function(): string | undefined {
  return this.otherLocations?.get('partialCfi');
};

LocatorLocations.prototype.getDomRange = function(): DomRange | undefined {
  return DomRange.deserialize(this.otherLocations?.get('domRange'));
};
