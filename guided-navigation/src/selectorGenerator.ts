// The id-or-generated-CSS-selector heuristic every other textref option
// (domRange, textFragment) builds its own reference on top of.
import { getCssSelector } from "css-selector-generator";
import { encodeCssSelectorFragment } from "./textrefFragment.ts";

function isUniqueId(doc: Document, id: string): boolean {
  return doc.querySelectorAll(`#${CSS.escape(id)}`).length === 1;
}

// One level of a >-joined climb, reasoning only about node's own siblings.
// Never an attribute selector: those latch onto JS-mutated attributes (e.g. layout-script `style`) and can stop matching later.
function siblingSelector(node: Element): string {
  const id = node.getAttribute("id");
  if (id && isUniqueId(node.ownerDocument, id)) return `#${CSS.escape(id)}`;
  const parent = node.parentElement;
  const tag = node.tagName.toLowerCase();
  if (!parent) return tag;
  const siblings = Array.from(parent.children);
  for (const cls of node.classList) {
    const escaped = `.${CSS.escape(cls)}`;
    if (siblings.filter((s) => s.matches(escaped)).length === 1) return escaped;
  }
  if (siblings.filter((s) => s.tagName === node.tagName).length === 1) return tag;
  return `${tag}:nth-child(${siblings.indexOf(node) + 1})`;
}

// Climbs from node up to (not including) stopAt, one siblingSelector() per level, short-circuiting once an ancestor id resolves (siblingSelector already confirmed it's document-unique).
// Returns undefined if node turns out not to be inside stopAt at all.
function climb(node: Element, stopAt: Element): string[] | undefined {
  const parts: string[] = [];
  let cur: Element | null = node;
  while (cur && cur !== stopAt) {
    const part = siblingSelector(cur);
    parts.unshift(part);
    if (part.startsWith("#")) return parts;
    cur = cur.parentElement;
  }
  return cur === stopAt ? parts : undefined;
}

// Stable, page-global anchor for selectorRoot, built via the same climbing logic as selectorForElement.
// Avoids css-selector-generator's own root/fallback modes, which can silently emit a `:scope`-relative selector — only valid via `root.querySelector()`, never as a global one.
export function rootAnchorSelector(selectorRoot: Element | null): string | null {
  if (!selectorRoot) return null;
  const id = selectorRoot.getAttribute("id");
  if (id && isUniqueId(selectorRoot.ownerDocument, id)) return `#${CSS.escape(id)}`;
  const docEl = selectorRoot.ownerDocument.documentElement;
  const parts = climb(selectorRoot, docEl) ?? [];
  if (parts.length > 0 && parts[0].startsWith("#")) return parts.join(" > ");
  return [docEl.tagName.toLowerCase(), ...parts].join(" > ");
}

// An element's own "#id" when unique, else a selector relative to selectorRoot (the live element the conversion is scoped to) — for embedding elsewhere (e.g. domRangeGenerator.ts's DomRangeJSON), not as a textref by itself.
// Without a live selectorRoot (a detached, throwaway document), there's no unrelated host content to guard against, so any id is trusted as-is.
export function selectorForElement(
  el: Element,
  selectorRoot: Element | null,
  rootAnchor: string | null,
): string | undefined {
  const id = el.getAttribute("id");
  if (id && (!selectorRoot || isUniqueId(el.ownerDocument, id))) return `#${CSS.escape(id)}`;

  if (!selectorRoot) {
    return getCssSelector(el, { selectors: ["id", "class", "tag", "nthchild"] }) ?? undefined;
  }

  if (el === selectorRoot) return rootAnchor ?? undefined;

  const parts = climb(el, selectorRoot);
  if (!parts || parts.length === 0) return undefined;
  if (parts[0].startsWith("#")) return parts.join(" > ");
  return rootAnchor ? `${rootAnchor} > ${parts.join(" > ")}` : parts.join(" > ");
}

// The base textref every generated node gets: a bare "#id" fragment when
// the element has one, a "#css(<selector>)" fragment otherwise. Wraps
// selectorForElement's raw value so callers that already hold that value
// (e.g. domRangeGenerator.ts, reusing it for the same element) can skip
// recomputing it.
// Bare-id iff selector equals this element's own escaped id — mirrors
// decodeTextref's check, unfooled by CSS.escape's literal spaces (id="foo bar").
export function textrefForSelector(selector: string | undefined, el: Element): string | undefined {
  if (!selector) return undefined;
  const id = el.getAttribute("id");
  const isBareId = !!id && selector === `#${CSS.escape(id)}`;
  return isBareId ? selector : encodeCssSelectorFragment(selector);
}
