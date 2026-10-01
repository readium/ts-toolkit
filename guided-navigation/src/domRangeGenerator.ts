// Builds a Locator DomRange for TextrefOptions.domRange — see
// Converter.applyTextref in converter.ts.
import type { DomRangeJSON } from "./textrefFragment.ts";
import { selectorForElement } from "./selectorGenerator.ts";

const TEXT_NODE = 3;

// A DomRangePoint's textNodeIndex counts only among container's Text-node
// children, per the Locator HTML extension spec.
function textNodeIndexAmongChildren(container: Element, target: Text): number {
  let idx = 0;
  for (const child of Array.from(container.childNodes)) {
    if (child === target) return idx;
    if (child.nodeType === TEXT_NODE) idx++;
  }
  return idx;
}

// A selector already computed for `el` elsewhere (applyTextref's own base
// textref) — reused instead of recomputed when a range point's container
// turns out to be that same element.
export interface KnownSelector {
  el: Element;
  selector: string;
}

function domRangePoint(
  node: Text,
  offset: number,
  selectorRoot: Element | null,
  rootAnchor: string | null,
  known: KnownSelector | undefined,
): DomRangeJSON["start"] | undefined {
  const container = node.parentElement;
  if (!container) return undefined;
  const cssSelector =
    known && container === known.el ? known.selector : selectorForElement(container, selectorRoot, rootAnchor);
  if (!cssSelector) return undefined;
  return { cssSelector, textNodeIndex: textNodeIndexAmongChildren(container, node), charOffset: offset };
}

// Builds a Locator DomRange pinpointing range's exact start/end text nodes
// and character offsets, not just the containing element — only meaningful
// against a live, already-rendered document (see TextrefOptions.domRange).
export function generateDomRange(
  range: { first: [Text, number]; last: [Text, number] },
  selectorRoot: Element | null,
  rootAnchor: string | null,
  known?: KnownSelector,
): DomRangeJSON | undefined {
  const start = domRangePoint(...range.first, selectorRoot, rootAnchor, known);
  if (!start) return undefined;
  const end = domRangePoint(...range.last, selectorRoot, rootAnchor, known);
  return end ? { start, end } : { start };
}
