// Generates a WICG Text Fragment directive for TextrefOptions.textFragment —
// see Converter.applyTextref in converter.ts. Delegates to @readium/helpers'
// text-fragments-polyfill port rather than reimplementing WICG's
// word-boundary/disambiguation logic.
import { generateFragmentFromRange, GenerateFragmentStatus } from "@readium/helpers";
import type { TextFragmentDirective } from "./textrefFragment.ts";

export function textFragmentDirectiveFor(range: Range): TextFragmentDirective | undefined {
  const result = generateFragmentFromRange(range);
  return result.status === GenerateFragmentStatus.SUCCESS ? result.fragment : undefined;
}
