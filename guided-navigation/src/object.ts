import { GuidedNavigationDescription, GuidedNavigationObject, GuidedNavigationText } from "@readium/shared";
import type { GndRole } from "./types.ts";
import { type TextBuilder, textIsEmpty, finalizeText } from "./text.ts";

export interface ObjBuilder {
  id?: string;
  audioref?: string;
  imgref?: string;
  textref?: string;
  videoref?: string;
  text?: TextBuilder;
  role?: GndRole[];
  children?: ObjBuilder[];
  description?: string;
}

// Roles whose entire information is the role itself, with no ref/text/
// children to otherwise survive on: `math` has no ref field of its own
// (unlike audio/image/video, it names no external resource), and
// `separator` (e.g. `<hr>`) is content-free by design.
const contentFreeRoles: readonly GndRole[] = ["math", "separator"];

// Marks text substituted from aria-label/aria-labelledby rather than the
// element's own content — the Node set mirrors the Builder one across finalizeToGuidedNavigationObject().
export const ariaSubstitutedBuilders = new WeakSet<ObjBuilder>();
const ariaSubstitutedNodes = new WeakSet<GuidedNavigationObject>();

// A substituted link's own CSS selector — its `textref` is its href, which
// never resolves to an on-page location, so this is its fallback box (set only by link()).
export const substitutedOwnSelectorBuilders = new WeakMap<ObjBuilder, string>();
const substitutedOwnSelectorNodes = new WeakMap<GuidedNavigationObject, string>();

// Only objects produced by this module's parseMarkup()/makeGnd() carry this; an object deserialized from JSON never does.
export function isAriaSubstituted(node: GuidedNavigationObject): boolean {
  return ariaSubstitutedNodes.has(node);
}

export function substitutedOwnSelector(node: GuidedNavigationObject): string | undefined {
  return substitutedOwnSelectorNodes.get(node);
}

export function isEmptyObj(o: ObjBuilder): boolean {
  if (o.role?.some((role) => contentFreeRoles.includes(role))) return false;
  return (
    !o.audioref &&
    !o.imgref &&
    !o.textref &&
    !o.videoref &&
    (!o.text || textIsEmpty(o.text)) &&
    !(o.children && o.children.length > 0) &&
    !o.description
  );
}

// A transparent wrapper (e.g. a plain <div>) carrying no information of its
// own besides its children — spliced into the parent's children.
function isChildrenOnly(o: ObjBuilder): boolean {
  return (
    !o.audioref &&
    !o.imgref &&
    !o.textref &&
    !o.videoref &&
    (!o.text || textIsEmpty(o.text)) &&
    !!(o.children && o.children.length > 0) &&
    !(o.role && o.role.length > 0) &&
    !o.id &&
    !o.description
  );
}

// A lone child with no role/id/ref of its own: its text is hoisted into the
// parent object directly, e.g. a paragraph wrapping plain emphasis becomes
// {role, text} rather than nesting an anonymous child. A child carrying its
// own ref (e.g. an <a href>'s textref) is never hoisted — refs identify a
// distinct target and merging them into the parent would silently discard
// whichever of the two textrefs isn't kept.
function isHoistable(o: ObjBuilder): boolean {
  return (
    !(o.role && o.role.length > 0) &&
    !o.id &&
    !o.description &&
    !o.textref &&
    !o.imgref &&
    !o.audioref &&
    !o.videoref
  );
}

/** A node being built up during the tree walk, before its final shape is known. */
export class NavObject {
  el?: Element;
  object: ObjBuilder = {};
  children: NavObject[] = [];
  noText = false;
  hasChildBlock = false;

  // `selfTextref` references this object's own element, for objects that would otherwise lack the schema's required content.
  finalize(selfTextref?: (el: Element) => string | undefined): ObjBuilder {
    const result = this.object;
    const finalChildren: ObjBuilder[] = [];
    for (const child of this.children) {
      const res = child.finalize(selfTextref);
      if (isEmptyObj(res)) continue;
      if (isChildrenOnly(res)) {
        finalChildren.push(...(res.children ?? []));
        continue;
      }
      finalChildren.push(res);
    }
    if (finalChildren.length > 0) result.children = finalChildren;

    // A wrapper whose own role is entirely redundant with its sole child's
    // role (e.g. <dt><dfn>term</dfn></dt> naming one term twice) sheds that
    // role — the child already carries it. Excludes "presentation": unlike
    // every other role, it cascades from an ancestor onto real structural
    // descendants (HTML-AAM's presentational-table rule) rather than
    // marking the same entity twice, so identical nesting there is genuine.
    if (result.role?.length && result.children?.length === 1 && !result.role.includes("presentation")) {
      const child = result.children[0];
      if (child.role?.length && result.role.every((role) => child.role!.includes(role))) {
        delete result.role;
      }
    }

    // Hoist a lone child with no role/id/ref into the object itself: its text
    // merges directly into the parent, e.g. a paragraph wrapping plain
    // emphasis becomes {role, text} instead of nesting an anonymous child.
    if ((!result.text || textIsEmpty(result.text)) && result.children?.length === 1) {
      const child = result.children[0];
      if (isHoistable(child)) {
        if (child.text) result.text = child.text;
        result.children = child.children;
      }
    }

    if (this.el && selfTextref && !isEmptyObj(result) && !hasRequiredContent(result)) {
      const textref = selfTextref(this.el);
      if (textref) result.textref = textref;
    }

    return result;
  }
}

// The Guided Navigation schema requires at least one ref, a non-empty text, or children.
function hasRequiredContent(o: ObjBuilder): boolean {
  return (
    !!o.audioref ||
    !!o.imgref ||
    !!o.textref ||
    !!o.videoref ||
    !!(o.text && (o.text.plain !== "" || o.text.ssml !== "")) ||
    !!(o.children && o.children.length > 0)
  );
}

export function finalizeToGuidedNavigationObject(o: ObjBuilder): GuidedNavigationObject {
  const node = new GuidedNavigationObject({
    id: o.id || undefined,
    textref: o.textref || undefined,
    imgref: o.imgref || undefined,
    audioref: o.audioref || undefined,
    videoref: o.videoref || undefined,
    text: finalizeText(o.text),
    role: o.role && o.role.length > 0 ? new Set(o.role) : undefined,
    children: o.children && o.children.length > 0 ? o.children.map(finalizeToGuidedNavigationObject) : undefined,
    description: o.description
      ? new GuidedNavigationDescription({ text: new GuidedNavigationText({ plain: o.description }) })
      : undefined,
  });
  if (ariaSubstitutedBuilders.has(o)) ariaSubstitutedNodes.add(node);
  const ownSelector = substitutedOwnSelectorBuilders.get(o);
  if (ownSelector) substitutedOwnSelectorNodes.set(node, ownSelector);
  return node;
}
