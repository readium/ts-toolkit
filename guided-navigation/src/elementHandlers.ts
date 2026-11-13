// Handlers for element kinds that build one placeholder ObjBuilder each
// (pagebreak/noteref/reference/link), calling back into the converter for
// placeholder() and, for noteref's and reference's target embedding, convert()/resultBuilders()
// on a sub-Converter of its own.
import type { GndRole } from "./types.ts";
import { ssmlAttrEscape } from "@readium/helpers";
import { normalizedNodeText } from "./a11y.ts";
import { normalizeWhitespace, textIsEmpty } from "./text.ts";
import { type ObjBuilder, ariaSubstitutedBuilders, isHoistable, substitutedOwnSelectorBuilders } from "./object.ts";
import { hasElementChild, isAncestorOf } from "./dom.ts";
import { nodeLanguage } from "./language.ts";
import { Converter, type Segment } from "./converter.ts";
import { selectorForElement, textrefForSelector } from "./selectorGenerator.ts";
import { decodeIdFragment } from "./textrefFragment.ts";

// Returns true if el's children should still be descended into (a
// pagebreak with element children of its own, in HTML parsing).
export function pagebreak(converter: Converter, el: Element, aria: string | null, ariaLanguage: string, roles: GndRole[]): boolean {
  const obj: ObjBuilder = { role: roles };
  const title = normalizeWhitespace(el.getAttribute("title") ?? "", true).trim();
  if (title) {
    obj.text = { plain: title, ssml: "", language: nodeLanguage(el) };
  } else if (aria) {
    obj.text = { plain: aria, ssml: "", language: ariaLanguage };
    ariaSubstitutedBuilders.add(obj);
  }
  const labelled = !!(obj.text && !textIsEmpty(obj.text));
  const descend = !converter.xmlParsed && (hasElementChild(el) || (labelled && el.firstChild !== null));
  if (!labelled && !descend) {
    const { text, language } = normalizedNodeText(el);
    if (text) obj.text = { plain: text, ssml: "", language };
  }
  const selector = selectorForElement(el, converter.selectorRoot, converter.selectorRootAnchor);
  const textref = textrefForSelector(selector, el);
  if (textref) obj.textref = textref;
  converter.placeholder(el, "pagebreak", obj);
  return descend;
}

export function noteref(converter: Converter, el: Element, roles: GndRole[]): void {
  const obj: ObjBuilder = { role: roles };
  const { text, language } = normalizedNodeText(el);
  if (text) obj.text = { plain: text, ssml: "", language };

  const href = el.getAttribute("href") ?? "";
  const fragment = href.startsWith("#") ? (decodeIdFragment(href) ?? href.slice(1)) : undefined;
  let candidateID = el.getAttribute("id") ?? "";
  if (!candidateID && fragment !== undefined) {
    // A target still output at its own location keeps its id there.
    const target = converter.ids.get(fragment);
    if (!target || converter.suppressed.has(target)) candidateID = fragment;
  }

  if (fragment !== undefined) {
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

  converter.placeholder(el, "noteref", obj, { candidateID: candidateID || undefined });
}

export function link(converter: Converter, el: Element, roles: GndRole[], aria: string | null, ariaLanguage: string): void {
  const { obj, words } = linkObject(converter, el, roles, aria, ariaLanguage);
  // A backlink is navigation, not part of the text it follows.
  converter.placeholder(el, roles[0] ?? "link", obj, { words: roles.includes("backlink") ? undefined : words });
}

// A glossref or biblioref: a link that also embeds its same-document target, like a noteref its footnote.
export function reference(converter: Converter, el: Element, roles: GndRole[], aria: string | null, ariaLanguage: string): void {
  const { obj, words } = linkObject(converter, el, roles, aria, ariaLanguage);
  const href = el.getAttribute("href") ?? "";
  if (href.startsWith("#")) {
    const target = converter.ids.get(decodeIdFragment(href) ?? href.slice(1));
    if (target && !isAncestorOf(target, el) && converter.noterefDepth < 3) {
      const children = referencedContent(target).flatMap((content) => {
        const sub = converter.spawnChild(content);
        sub.copy = true;
        sub.convert(content);
        return sub.resultBuilders();
      });
      // Still output at its own location, which keeps its ids.
      removeCopiedIds(children);
      if (children.length > 0) obj.children = [...(obj.children ?? []), ...children];
    }
  }
  converter.placeholder(el, roles[0], obj, { words });
}

// A link's content is converted like any other: its text, inline semantics and objects become the link's own.
// `words`: the link's pieces of the plain text of the sentence it sits in.
function linkObject(
  converter: Converter,
  el: Element,
  roles: GndRole[],
  aria: string | null,
  ariaLanguage: string,
): { obj: ObjBuilder; words: Segment[] } {
  const obj: ObjBuilder = {};
  if (roles.length > 0) obj.role = roles;
  const words: Segment[] = aria ? [{ kind: "text", text: aria }] : [];
  if (aria) {
    obj.text = { plain: aria, ssml: "", language: ariaLanguage };
    ariaSubstitutedBuilders.add(obj);
    const selector = selectorForElement(el, converter.selectorRoot, converter.selectorRootAnchor);
    if (selector) substitutedOwnSelectorBuilders.set(obj, selector);
  } else {
    const sub = converter.spawnChild(el, 0);
    sub.words = words;
    sub.convertChildren(el);
    const content = sub.resultBuilders();
    // A lone hoistable result is the content's own text; anything else is objects of its own.
    if (content.length === 1 && content[0].text && isHoistable(content[0])) {
      obj.text = content[0].text;
      if (content[0].children) obj.children = content[0].children;
    } else if (content.length > 0) {
      obj.children = content;
    }
  }
  return { obj, words };
}

// Removes the ids a copy repeats from its original, keeping placeholders', allocated unique and referenced by their parent's SSML.
function removeCopiedIds(objs: ObjBuilder[], parent?: ObjBuilder) {
  for (const obj of objs) {
    if (obj.id === undefined || !parent?.text?.ssml.includes(`id="${ssmlAttrEscape(obj.id)}"`)) delete obj.id;
    if (obj.children) removeCopiedIds(obj.children, obj);
  }
}

// A glossary term and its definitions, else the target itself.
function referencedContent(target: Element): Element[] {
  const term = target.tagName.toLowerCase() === "dt" ? target : target.closest("dt");
  if (!term) return [target];
  let n = term.nextElementSibling;
  while (n && n.tagName.toLowerCase() === "dt") n = n.nextElementSibling;
  const definitions: Element[] = [];
  for (; n && n.tagName.toLowerCase() === "dd"; n = n.nextElementSibling) definitions.push(n);
  return definitions.length > 0 ? [term, ...definitions] : [target];
}
