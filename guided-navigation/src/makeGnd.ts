import { GuidedNavigationDocument } from "@readium/shared";
import { parseMarkup } from "./converter.ts";
import type { GndMediaType } from "./dom.ts";
import type { GndGenerationOptions } from "./options.ts";

export type { GndMediaType };

/**
 * Builds a Guided Navigation document from an HTML or XHTML fragment or
 * document, following https://github.com/readium/guided-navigation.
 * Returns undefined when the input has no navigable content, as `guided` can't be empty.
 */
export function makeGnd(
  input: string | Element,
  mediaType?: GndMediaType,
  options?: GndGenerationOptions,
): GuidedNavigationDocument | undefined {
  const guided = parseMarkup(input, mediaType, options);
  return guided.length > 0 ? new GuidedNavigationDocument({ guided }) : undefined;
}
