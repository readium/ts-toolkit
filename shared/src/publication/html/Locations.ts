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

    /**
     * All named parameters found in the fragments, such as `p=5`.
     */
    fragmentParameters(): Map<string, string>;

    /**
     * HTML ID fragment identifier.
     */
    htmlId(): string | undefined;

    /**
     * Page fragment identifier, used for example in PDF.
     */
    page(): number | undefined;

    /**
     * Temporal Dimension media fragment, used for example in audiobooks.
     *
     * https://www.w3.org/TR/media-frags/
     */
    time(): number | undefined;

    /**
     * Spatial Dimension media fragment, used for example in audiobooks.
     *
     * https://www.w3.org/TR/media-frags/
     */
    space(): [number, number, number, number] | undefined;
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

// Below is technically part of the Navigator's Locator extensions, we're putting it here for now

// Reference: https://www.w3.org/TR/fragid-best-practices
LocatorLocations.prototype.fragmentParameters = function(): Map<string, string> {
  return new Map(
    this.fragments
      // Concatenates fragments together, after dropping any #
      .map(f => f.startsWith("#") ? f.slice(1) : f)
      .join("&")
      // Splits parameters
      .split("&")
      .filter(f => !f.startsWith("#"))
      .map(f => f.split("="))
      // Only keep named parameters
      .filter(f => f.length === 2)
      .map(f => [
        f[0].trim().toLowerCase(),
        f[1].trim()
      ])
  );
};

LocatorLocations.prototype.htmlId = function(): string | undefined {
  /*
  The HTML 5 specification (used for WebPub) allows any character in an HTML ID, except spaces.
  This is an issue to differentiate with named parameters, so we ignore any ID containing `=`.
  */
  if(!this.fragments.length) return;
  let f = this.fragments.find(f => f.length && !f.includes("="));
  if(!f) {
    const fp = this.fragmentParameters();
    if(fp.has("id")) f = fp.get("id");
    else if(fp.has("name")) f = fp.get("name");
  }
  return f?.startsWith("#") ? f.slice(1) : f;
};

LocatorLocations.prototype.page = function(): number | undefined {
  const i = parseInt(this.fragmentParameters().get("page")!);
  if(!isNaN(i) && i >= 0) return i;
  return undefined;
}

LocatorLocations.prototype.time = function(): number | undefined {
  // TODO more sophiticated parsing
  const i = parseInt(this.fragmentParameters().get("t")!);
  if(!isNaN(i)) return i;
  return undefined;
}

LocatorLocations.prototype.space = function(): [number, number, number, number] | undefined {
  const fp = this.fragmentParameters();
  if(!fp.has("xywh")) return;
  // TODO more sophiticated parsing to handle the format
  const xywh = fp.get("xywh")!.split(",").map(s => parseInt(s));
  if(xywh.length !== 4) return; // Must have four parts
  if(xywh.some(isNaN)) return; // All parts must be numbers
  return xywh as [number, number, number, number];
}