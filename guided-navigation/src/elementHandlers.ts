// Handlers for element kinds that build one placeholder ObjBuilder each
// (pagebreak/noteref/link), calling back into the converter for
// placeholder() and, for noteref's footnote embedding, convert()/resultBuilders()
// on a sub-Converter of its own.
import type { GndRole } from "./types.ts";
import { normalizedNodeText } from "./a11y.ts";
import { textIsEmpty } from "./text.ts";
import { type ObjBuilder, ariaSubstitutedBuilders, substitutedOwnSelectorBuilders } from "./object.ts";
import { hasElementChild, isAncestorOf } from "./dom.ts";
import { Converter } from "./converter.ts";
import { selectorForElement, textrefForSelector } from "./selectorGenerator.ts";

// Returns true if el's children should still be descended into (a
// pagebreak with element children of its own, in HTML parsing).
export function pagebreak(converter: Converter, el: Element, aria: string | null, roles: GndRole[]): boolean {
  const obj: ObjBuilder = { role: roles };
  const title = (el.getAttribute("title") ?? "").trim();
  if (title) {
    obj.text = { plain: title, ssml: "", language: "" };
  } else if (aria) {
    obj.text = { plain: aria, ssml: "", language: "" };
    ariaSubstitutedBuilders.add(obj);
  }
  const labelled = !!(obj.text && !textIsEmpty(obj.text));
  const descend = !converter.xmlParsed && (hasElementChild(el) || (labelled && el.firstChild !== null));
  if (!labelled && !descend) {
    const text = normalizedNodeText(el);
    if (text) obj.text = { plain: text, ssml: "", language: "" };
  }
  const selector = selectorForElement(el, converter.selectorRoot, converter.selectorRootAnchor);
  const textref = textrefForSelector(selector, el);
  if (textref) obj.textref = textref;
  converter.placeholder(el, "pagebreak", obj);
  return descend;
}

export function noteref(converter: Converter, el: Element, roles: GndRole[]): void {
  const obj: ObjBuilder = { role: roles };
  const text = normalizedNodeText(el);
  if (text) obj.text = { plain: text, ssml: "", language: "" };

  const href = el.getAttribute("href") ?? "";
  let candidateID = el.getAttribute("id") ?? "";
  if (!candidateID && href.startsWith("#")) {
    candidateID = href.slice(1);
  }

  if (href.startsWith("#")) {
    const fragment = href.slice(1);
    const target = converter.ids.get(fragment);
    if (target && !isAncestorOf(target, el) && converter.noterefDepth < 3) {
      const sub = converter.spawnChild(target);
      sub.convert(target);
      const children = sub.resultBuilders();
      if (children.length > 0) {
        // The target's own id already carries its meaning via this
        // noteref's own id — repeating it on the embedded content would
        // be redundant.
        for (const c of children) delete c.id;
        obj.children = children;
      }
    }
  }
  if (!obj.children && href) {
    obj.children = [{ textref: href }];
  }

  converter.placeholder(el, "noteref", obj, candidateID || undefined);
}

export function link(converter: Converter, el: Element, roles: GndRole[], aria: string | null): void {
  const obj: ObjBuilder = {};
  if (roles.length > 0) obj.role = roles;
  if (aria) {
    obj.text = { plain: aria, ssml: "", language: "" };
    ariaSubstitutedBuilders.add(obj);
    const selector = selectorForElement(el, converter.selectorRoot, converter.selectorRootAnchor);
    if (selector) substitutedOwnSelectorBuilders.set(obj, selector);
  } else {
    const text = normalizedNodeText(el);
    if (text) obj.text = { plain: text, ssml: "", language: "" };
  }
  const href = el.getAttribute("href");
  if (href) obj.textref = href;
  converter.placeholder(el, roles[0] ?? "link", obj);
}
