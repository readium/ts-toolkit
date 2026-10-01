export type { GndRole } from "./types.ts";
export { makeGnd } from "./makeGnd.ts";
export { parseMarkup } from "./converter.ts";
export type { GndMediaType } from "./dom.ts";
export type { GndGenerationOptions, TextrefOptions } from "./options.ts";
export {
  encodeCssSelectorFragment,
  decodeCssSelectorFragment,
  encodeDomRangeFragment,
  decodeDomRangeFragment,
  decodeTextref,
  combineDomRangeTextrefs,
} from "./textrefFragment.ts";
export type { DomRangeJSON, DecodedTextref } from "./textrefFragment.ts";
export { isAriaSubstituted, substitutedOwnSelector } from "./object.ts";
