import type { GuidedNavigationObject } from "@readium/shared";
import type { GndRole } from "./types.ts";
import { extractNodeRoles, hasExplicitRole } from "./roles.ts";
import {
  extractNodeAria,
  normalizedNodeText,
  normalizedNodeTextExcludingExplicitRoles,
  convertElementToSSMLTag,
  skippedElements,
} from "./a11y.ts";
import {
  type TextBuilder,
  type SSMLContext,
  ctxEqual,
  normalizeWhitespace,
} from "./text.ts";
import { ssmlAttrEscape, ssmlTextEscape, startsWithBindingPunct } from "@readium/helpers";
import { type ObjBuilder, NavObject, isEmptyObj, finalizeToGuidedNavigationObject } from "./object.ts";
import { type GndMediaType, nodeLanguage, isInlineTag, sniffMediaType } from "./dom.ts";
import { encodeDomRangeFragment, encodeTextFragmentDirective } from "./textrefFragment.ts";
import { rootAnchorSelector, selectorForElement, textrefForSelector } from "./selectorGenerator.ts";
import { generateDomRange } from "./domRangeGenerator.ts";
import { textFragmentDirectiveFor } from "./textFragmentGenerator.ts";
import { type GndGenerationOptions, normalizeTextrefOptions } from "./options.ts";
import { IdAllocator } from "./idAllocator.ts";
import { prescan as prescanImpl } from "./prescan.ts";
import { pagebreak, noteref, link } from "./elementHandlers.ts";

const MATHML_NS = "http://www.w3.org/1998/Math/MathML";

const TEXT_NODE = 3;
const ELEMENT_NODE = 1;

// These elements are normally treated as inline (text flows through them
// without opening their own object), but when they carry a role of their own
// that role shouldn't be silently discarded — they become block elements instead.
const roleOverridesInline = new Set(["summary", "dfn", "span"]);

function isBlockNode(tagName: string, roles: GndRole[]): boolean {
  if (roleOverridesInline.has(tagName) && roles.length > 0) return true;
  return !isInlineTag(tagName);
}

type SegmentKind = "text" | "break" | "placeholder";

interface Segment {
  kind: SegmentKind;
  text?: string;
  ctx?: SSMLContext;
  tag?: string;
  child?: NavObject;
  candidateID?: string;
}

/** Walks a DOM subtree, building the Guided Navigation object tree. */
export class Converter {
  xmlParsed: boolean;
  ids = new Map<string, Element>();
  suppressed = new Set<Element>();
  idAlloc = new IdAllocator();
  noterefDepth = 0;
  allowNode: Element | null = null;
  selectorPredicate: ((roles: GndRole[]) => boolean) | null = null;
  // Only meaningful (and safe) when converting a live, already-rendered
  // element — see TextrefOptions.domRange in options.ts.
  domRangeEnabled = false;
  // Unlike domRangeEnabled, safe against a detached parsed document too —
  // see TextrefOptions.textFragment in options.ts.
  textFragmentEnabled = false;
  // See TextrefOptions.roles' leafTextRoleKeyword in options.ts.
  leafTextEnabled = false;
  docRoot: Document | null = null;
  // The live element selectors are climbed relative to — see
  // selectorGenerator.ts's selectorForElement(). Only set when converting a
  // live, already-rendered element (same caveat as domRangeEnabled).
  selectorRoot: Element | null = null;
  // Prefixed onto every generated selector — see selectorGenerator.ts's rootAnchorSelector().
  selectorRootAnchor: string | null = null;

  private root = new NavObject();
  private current = this.root;

  // Captions whose text was already folded into a table's `description` —
  // only these specific elements go silent, not the whole table (rows/cells
  // still need their own text).
  private foldedCaptions = new Set<Element>();

  private segments: Segment[] = [];
  private textAcc = "";
  private currentCtx: SSMLContext = { lang: "", tag: "" };
  private flowEndsWithSpace = true;
  private pendingChildren: NavObject[] = [];

  // Boundary text nodes of the flow currently being accumulated, for
  // domRange generation — see text()/resetFlow()/flushText().
  private flowFirstNode: Text | null = null;
  private flowFirstOffset = 0;
  private flowLastNode: Text | null = null;
  private flowLastOffset = 0;
  // The boundary nodes of the flow flushText() just flushed, read by tail()
  // right after calling it to build a domRange for the block it closes.
  private lastFlowRange: { first: [Text, number]; last: [Text, number] } | null = null;
  // The plain-text string of the flow flushText() just flushed, read by
  // tail() right after calling it as the text-fragment candidate text.
  private lastFlowText: string | null = null;

  constructor(xmlParsed: boolean) {
    this.xmlParsed = xmlParsed;
  }

  // A sub-conversion sharing this converter's document-wide state (ids,
  // suppressed, idAlloc) — for content reached from within the same
  // document, e.g. a noteref's footnote target. New fields shared this way
  // belong here, not re-copied at each call site.
  spawnChild(allowNode: Element, depthDelta = 1): Converter {
    const child = new Converter(this.xmlParsed);
    child.ids = this.ids;
    child.suppressed = this.suppressed;
    child.idAlloc = this.idAlloc;
    child.noterefDepth = this.noterefDepth + depthDelta;
    child.allowNode = allowNode;
    child.docRoot = this.docRoot;
    child.selectorRoot = this.selectorRoot;
    child.selectorRootAnchor = this.selectorRootAnchor;
    child.selectorPredicate = this.selectorPredicate;
    child.domRangeEnabled = this.domRangeEnabled;
    child.textFragmentEnabled = this.textFragmentEnabled;
    child.leafTextEnabled = this.leafTextEnabled;
    return child;
  }

  prescan(root: Element) {
    prescanImpl(root, this.ids, this.suppressed);
  }

  // Converts root itself — used when root is meaningful content in its own
  // right (e.g. a footnote element referenced by a noteref), not just a
  // structural container.
  convert(root: Element) {
    this.prescan(root);
    this.walk(root);
  }

  // Converts root's children — used at the top level, where root is always
  // just the document's <body> (or a fragment's implicit wrapper), never
  // content of its own.
  convertChildren(root: Element) {
    this.prescan(root);
    for (let c = root.firstChild; c; c = c.nextSibling) this.walk(c);
    this.flushText();
  }

  resultBuilders(): ObjBuilder[] {
    const res = this.root.finalize((el) => textrefForSelector(selectorForElement(el, this.selectorRoot, this.selectorRootAnchor), el));
    if (!res.children || res.children.length === 0) {
      if (isEmptyObj(res)) return [];
      return [res];
    }
    return res.children;
  }

  result(): GuidedNavigationObject[] {
    return this.resultBuilders().map(finalizeToGuidedNavigationObject);
  }

  // An explicit-role descendant is content in its own right and skips
  // inherited `noText` — except `caption`, always the already-folded source.
  private descend(el: Element, roles: GndRole[]) {
    const node = new NavObject();
    node.el = el;
    node.noText =
      this.foldedCaptions.has(el) || ((!hasExplicitRole(el) || roles.includes("caption")) && this.current.noText);
    this.current.children.push(node);
    this.current = node;
  }

  private appendChild(child: NavObject) {
    child.noText = this.current.noText;
    this.current.children.push(child);
  }

  private walk(node: Node) {
    if (node.nodeType === TEXT_NODE) {
      this.text(node);
      return;
    }
    if (node.nodeType !== ELEMENT_NODE) return;
    const el = node as Element;

    const parent = this.current;
    const wasSkip = this.head(el);
    if (!wasSkip) {
      for (let c = el.firstChild; c; c = c.nextSibling) this.walk(c);
    }
    this.tail(el, wasSkip, parent);
  }

  // Returns true if children should not be traversed (already handled
  // wholesale, invisible, or explicitly skipped).
  private head(el: Element): boolean {
    const tagName = el.tagName.toLowerCase();

    if (skippedElements.has(tagName)) return true;
    if (this.suppressed.has(el) && el !== this.allowNode) return true;

    const [aria, visible] = extractNodeAria(el);
    if (!visible && el !== this.allowNode) return true;

    const roles = extractNodeRoles(el);

    if (
      (tagName === "img" || tagName === "svg") &&
      (roles.includes("presentation") ||
        (aria === null && el.hasAttribute("alt") && el.getAttribute("alt")!.trim() === ""))
    ) {
      return true;
    }

    if (tagName === "br") {
      if (!this.current.noText) {
        this.closeSegment();
        this.segments.push({ kind: "break" });
        this.flowEndsWithSpace = true;
      }
      return true;
    }

    if (roles.includes("pagebreak")) {
      return !pagebreak(this, el, aria, roles);
    }
    if (tagName === "a" && roles.includes("noteref") && el.getAttribute("href")) {
      noteref(this, el, roles);
      return true;
    }
    if (tagName === "a" && el.getAttribute("href")) {
      // Any other link — backlink/biblioref/glossref, or a plain navigational
      // link with no specific role (e.g. a TOC entry) — carries its href as
      // textref. When it's the sole content of its enclosing block (the usual
      // case for list items), the hoist rule promotes it onto that block;
      // otherwise it becomes an inline SSML placeholder like any other
      // embedded object.
      link(this, el, roles, aria);
      return true;
    }
    if (tagName === "img") {
      const obj: ObjBuilder = { role: roles };
      const src = el.getAttribute("src");
      if (src) obj.imgref = src;
      if (aria) obj.description = aria;
      this.placeholder(el, "image", obj);
      return true;
    }
    if (tagName === "audio" || tagName === "video") {
      const obj: ObjBuilder = { role: roles };
      let src = el.getAttribute("src");
      if (!src) {
        const source = el.querySelector(":scope > source[src]");
        if (source) src = source.getAttribute("src");
      }
      if (tagName === "audio") {
        if (src) obj.audioref = src;
      } else if (src) {
        obj.videoref = src;
      }
      if (aria) obj.description = aria;
      this.placeholder(el, tagName, obj);
      return true;
    }
    if (roles.includes("image") || roles.includes("math")) {
      // Elements acting as images without being one, e.g. <span role="img">:
      // their content is replaced by their accessible name.
      const obj: ObjBuilder = { role: roles };
      if (aria) obj.description = aria;
      if (roles.includes("math")) {
        // MathML is carried as-is in SSML, other math markup as plain text.
        if (el.namespaceURI === MATHML_NS) {
          obj.text = { plain: "", ssml: new XMLSerializer().serializeToString(el), language: "" };
        } else {
          const text = normalizedNodeText(el);
          if (text) obj.text = { plain: text, ssml: "", language: "" };
        }
        obj.textref = textrefForSelector(selectorForElement(el, this.selectorRoot, this.selectorRootAnchor), el);
      }
      this.placeholder(el, roles.includes("math") ? "math" : "image", obj);
      return true;
    }

    if (!isBlockNode(tagName, roles)) {
      return false;
    }

    this.flushText();
    this.descend(el, roles);

    const cur = this.current.object;
    if (roles.length > 0) cur.role = roles;
    if (aria) {
      cur.description = aria;
      if (roles.includes("figure")) {
        this.current.noText = true;
      }
    } else if (roles.includes("figure")) {
      const caption = this.implicitCaptionOf(el);
      if (caption) {
        // Not suppressed — walked normally so a nested explicit-role
        // descendant (e.g. a credit) still speaks.
        const text = normalizedNodeTextExcludingExplicitRoles(caption);
        if (text) {
          cur.description = text;
          this.current.noText = true;
        }
      }
    } else if (roles.includes("table")) {
      const caption = this.implicitCaptionOf(el);
      if (caption) {
        const text = normalizedNodeTextExcludingExplicitRoles(caption);
        if (text) {
          cur.description = text;
          this.foldedCaptions.add(caption);
        }
      }
    }
    const id = el.getAttribute("id");
    if (id) cur.id = id;

    return false;
  }

  // HTML-AAM implicit name: a table/figure with no explicit ARIA name folds
  // its native/ARIA caption child's text in as its own description instead
  // of speaking that child separately.
  private implicitCaptionOf(el: Element): Element | null {
    for (let c = el.firstElementChild; c; c = c.nextElementSibling) {
      if (extractNodeRoles(c).includes("caption") && !c.getAttribute("aria-labelledby")) return c;
    }
    return null;
  }

  private tail(el: Element, wasSkip: boolean, parent: NavObject) {
    if (wasSkip) return;
    const tagName = el.tagName.toLowerCase();
    const roles = extractNodeRoles(el);
    if (isBlockNode(tagName, roles)) {
      this.flushText();
      const isLeafText = this.leafTextEnabled && roles.length === 0 && !!this.lastFlowText;
      if (this.selectorPredicate?.(roles) || isLeafText) {
        this.applyTextref(el);
      }
      this.current = parent;
    }
  }

  // Sets cur.textref to a reference for el: the base id-or-selector
  // reference (selectorGenerator.ts), upgraded to a domRange
  // (domRangeGenerator.ts) when domRangeEnabled and el's own flow just
  // flushed some text, with a text-fragment directive
  // (textFragmentGenerator.ts) appended on top when textFragmentEnabled and
  // el's own flow flushed text with real source-node boundaries (a flow with
  // no such boundary — e.g. purely synthesized text — has no Range to
  // generate a fragment from) — each an independent option, applied in this
  // fixed order regardless of which others are also enabled.
  private applyTextref(el: Element) {
    const cur = this.current.object;
    const selector = selectorForElement(el, this.selectorRoot, this.selectorRootAnchor);
    cur.textref = textrefForSelector(selector, el);

    if (this.domRangeEnabled && this.lastFlowRange) {
      const known = selector ? { el, selector } : undefined;
      const domRange = generateDomRange(this.lastFlowRange, this.selectorRoot, this.selectorRootAnchor, known);
      if (domRange) cur.textref = encodeDomRangeFragment({ ...domRange, container: selector });
    }

    if (this.textFragmentEnabled && this.lastFlowRange && this.docRoot) {
      const range = this.docRoot.createRange();
      range.setStart(...this.lastFlowRange.first);
      range.setEnd(...this.lastFlowRange.last);
      const directive = textFragmentDirectiveFor(range);
      if (directive) cur.textref = `${cur.textref ?? "#"}${encodeTextFragmentDirective(directive)}`;
    }
  }

  private text(node: Node) {
    if (this.current.noText) return;
    const data = node.nodeValue ?? "";
    if (/^\s*$/.test(data)) {
      if (this.textAcc.length > 0 || this.segments.length > 0) {
        this.textAcc += normalizeWhitespace(data, this.flowEndsWithSpace);
        this.updateFlowSpace();
      }
      return;
    }
    const ctx = this.textContext(node);
    if (!ctxEqual(ctx, this.currentCtx)) {
      this.closeSegment();
      this.currentCtx = ctx;
    }
    this.textAcc += normalizeWhitespace(data, this.flowEndsWithSpace);
    this.updateFlowSpace();

    if (this.domRangeEnabled || this.textFragmentEnabled) {
      const text = node as Text;
      if (this.flowFirstNode === null) {
        this.flowFirstNode = text;
        this.flowFirstOffset = data.search(/\S/);
      }
      this.flowLastNode = text;
      this.flowLastOffset = data.length - (data.match(/\s+$/)?.[0].length ?? 0);
    }
  }

  private textContext(node: Node): SSMLContext {
    const ctx: SSMLContext = { lang: nodeLanguage(node.parentElement), tag: "" };
    for (let p = node.parentElement; p && p !== this.current.el; p = p.parentElement) {
      const [tag, attrs] = convertElementToSSMLTag(p.tagName.toLowerCase());
      if (tag && tag !== "break") {
        ctx.tag = tag;
        ctx.attrs = attrs;
        break;
      }
    }
    return ctx;
  }

  private updateFlowSpace() {
    if (this.textAcc.length > 0) {
      this.flowEndsWithSpace = this.textAcc.endsWith(" ");
    }
  }

  private closeSegment() {
    if (this.textAcc.length === 0) return;
    this.segments.push({ kind: "text", text: this.textAcc, ctx: this.currentCtx });
    this.textAcc = "";
  }

  private resetFlow() {
    this.segments = [];
    this.textAcc = "";
    this.currentCtx = { lang: "", tag: "" };
    this.flowEndsWithSpace = true;
    this.pendingChildren = [];
    this.flowFirstNode = null;
    this.flowFirstOffset = 0;
    this.flowLastNode = null;
    this.flowLastOffset = 0;
  }

  placeholder(el: Element, tag: string, object: ObjBuilder, candidateID?: string) {
    if (isEmptyObj(object)) return;
    const child = new NavObject();
    child.el = el;
    child.object = object;
    if (this.current.noText) {
      this.appendChild(child);
      return;
    }
    this.closeSegment();
    this.pendingChildren.push(child);
    this.segments.push({
      kind: "placeholder",
      tag,
      child,
      candidateID: candidateID ?? el.getAttribute("id") ?? undefined,
    });
    this.flowEndsWithSpace = false;
  }

  private flushText() {
    this.closeSegment();
    let segments = this.segments;
    const pending = this.pendingChildren;
    const flowFirstNode = this.flowFirstNode;
    const flowFirstOffset = this.flowFirstOffset;
    const flowLastNode = this.flowLastNode;
    const flowLastOffset = this.flowLastOffset;
    this.resetFlow();
    this.lastFlowRange = null;
    this.lastFlowText = null;

    if (segments.length === 0) return;

    // Trim the edges of the flow.
    while (segments.length > 0) {
      const seg = segments[0];
      if (seg.kind === "break") {
        segments = segments.slice(1);
        continue;
      }
      if (seg.kind === "text") {
        const trimmed = seg.text!.replace(/^\s+/, "");
        if (trimmed === "") {
          segments = segments.slice(1);
          continue;
        }
        segments = [{ ...seg, text: trimmed }, ...segments.slice(1)];
      }
      break;
    }
    while (segments.length > 0) {
      const seg = segments[segments.length - 1];
      if (seg.kind === "break") {
        segments = segments.slice(0, -1);
        continue;
      }
      if (seg.kind === "text") {
        const trimmed = seg.text!.replace(/\s+$/, "");
        if (trimmed === "") {
          segments = segments.slice(0, -1);
          continue;
        }
        segments = [...segments.slice(0, -1), { ...seg, text: trimmed }];
      }
      break;
    }

    const hasText = segments.some((s) => s.kind === "text" && s.text!.trim() !== "");
    if (!hasText) {
      for (const child of pending) this.appendChild(child);
      return;
    }

    const textLangs: string[] = [];
    for (const seg of segments) {
      if (seg.kind === "text" && seg.text!.trim() !== "") {
        const lang = seg.ctx!.lang;
        if (!textLangs.includes(lang)) textLangs.push(lang);
      }
    }
    let baseLang = nodeLanguage(this.current.el ?? null);
    if (textLangs.length === 1 && textLangs[0] !== "") {
      baseLang = textLangs[0];
    }

    let needSSML = false;
    for (const seg of segments) {
      if (seg.kind !== "text" || seg.ctx!.tag !== "" || seg.ctx!.lang !== baseLang) {
        needSSML = true;
        break;
      }
    }

    // Default to English when an SSML representation is required (mixed
    // formatting, embedded objects, or a language shift) but no explicit
    // language was declared anywhere in the document.
    if (needSSML && baseLang === "") {
      baseLang = "en";
    }

    if (needSSML) {
      for (const seg of segments) {
        if (seg.kind !== "placeholder") continue;
        let id = seg.candidateID;
        if (!id || !this.idAlloc.claim(id)) {
          id = this.idAlloc.allocate(seg.tag!, (candidate) => this.ids.has(candidate));
        }
        seg.child!.object.id = id;
      }
    }

    let plainB = "";
    let prevTrail = false;
    let sawBreak = false;
    let sawPlaceholder = false;
    let midSpace = false;
    for (const seg of segments) {
      if (seg.kind === "text") {
        const lead = seg.text!.startsWith(" ");
        const t = seg.text!.replace(/^ +| +$/g, "");
        if (t === "") {
          midSpace = true;
          continue;
        }
        let join = false;
        if (plainB.length > 0) {
          const spaced = prevTrail || midSpace || lead;
          if (sawBreak) join = true;
          else if (sawPlaceholder) join = spaced && !startsWithBindingPunct(t);
          else join = spaced;
        }
        if (join) plainB += " ";
        plainB += t;
        prevTrail = seg.text!.endsWith(" ");
        sawBreak = false;
        sawPlaceholder = false;
        midSpace = false;
      } else if (seg.kind === "break") {
        sawBreak = true;
      } else if (seg.kind === "placeholder") {
        sawPlaceholder = true;
      }
    }

    // Plain text is only worth keeping alongside SSML when it diverges from
    // what stripping tags from the SSML would produce — i.e. when a
    // placeholder (an embedded reference) was dropped from it. A pure
    // formatting/language shift with no embedded objects makes plain text a
    // redundant, mechanical derivative of the SSML, so it's left out.
    const hasPlaceholder = segments.some((s) => s.kind === "placeholder");
    this.lastFlowText = plainB.trim();
    const text: TextBuilder = {
      plain: needSSML && !hasPlaceholder ? "" : plainB.trim(),
      ssml: "",
      language: baseLang,
    };

    if (needSSML) {
      let sb = "";
      for (const seg of segments) {
        if (seg.kind === "text") {
          let tag = seg.ctx!.tag;
          let attrs = seg.ctx!.attrs;
          if (seg.ctx!.lang !== baseLang && seg.ctx!.lang !== "") {
            // A language shift takes priority over whatever SSML tag the
            // shifting element would otherwise map to.
            tag = "lang";
            attrs = undefined;
          }
          if (tag) {
            sb += `<${tag}`;
            for (const [k, v] of Object.entries(attrs ?? {})) {
              sb += ` ${k}="${ssmlAttrEscape(v)}"`;
            }
            if (seg.ctx!.lang !== baseLang && seg.ctx!.lang !== "") {
              sb += ` xml:lang="${ssmlAttrEscape(seg.ctx!.lang)}"`;
            }
            sb += `>${ssmlTextEscape(seg.text!)}</${tag}>`;
          } else {
            sb += ssmlTextEscape(seg.text!);
          }
        } else if (seg.kind === "break") {
          sb += "<break/>";
        } else if (seg.kind === "placeholder") {
          sb += `<readium:${seg.tag} id="${ssmlAttrEscape(seg.child!.object.id!)}" />`;
        }
      }
      text.ssml = sb;
    }

    const textObj = new NavObject();
    textObj.object = { text };
    for (const child of pending) {
      textObj.children.push(child);
    }
    this.appendChild(textObj);

    if (flowFirstNode && flowLastNode) {
      this.lastFlowRange = { first: [flowFirstNode, flowFirstOffset], last: [flowLastNode, flowLastOffset] };
    }
  }
}

// A DOM <body> only counts as real content when the input actually wrote
// one — text/html parsing synthesizes a <body> around any fragment
// regardless of what was passed in, and that synthesized wrapper was
// never "in the input" just because the parser added it.
const BODY_TAG_RE = /<body[\s>]/i;

/**
 * Converts an HTML or XHTML fragment or document into Guided Navigation
 * objects.
 *
 * Given a string, `input` is parsed into a detached document that's never
 * seen again — `options.textrefs.domRange` has nothing to resolve back
 * against there, so it's ignored. Reflects exactly the input it's given: a
 * real, author-written <body> becomes its own role: ["body"] node like any
 * other element; a <body> synthesized only by text/html parsing around a
 * bodyless fragment is not content and is skipped through; a bodyless XHTML
 * fragment's root element is itself the content.
 *
 * Given a live, already-rendered element instead, it's converted in place —
 * no parsing, no detached copy — so `domRange` can pinpoint exact text
 * nodes a DOM-highlighting consumer can resolve straight back against that
 * same document.
 */
export function parseMarkup(
  input: string | Element,
  mediaType?: GndMediaType,
  options?: GndGenerationOptions,
): GuidedNavigationObject[] {
  const { predicate, leafText, domRange, textFragment } = normalizeTextrefOptions(options?.textrefs);

  if (typeof input !== "string") {
    const mt = mediaType ?? (input.ownerDocument.contentType === "text/html" ? "text/html" : "application/xhtml+xml");
    const converter = new Converter(mt === "application/xhtml+xml");
    converter.selectorPredicate = predicate;
    converter.leafTextEnabled = leafText;
    converter.domRangeEnabled = domRange;
    converter.textFragmentEnabled = textFragment;
    converter.docRoot = input.ownerDocument;
    converter.selectorRoot = input;
    converter.selectorRootAnchor = rootAnchorSelector(input);
    converter.convert(input);
    return converter.result();
  }

  const mt = mediaType ?? sniffMediaType(input);
  const doc = new DOMParser().parseFromString(input, mt);
  const converter = new Converter(mt === "application/xhtml+xml");
  converter.selectorPredicate = predicate;
  converter.leafTextEnabled = leafText;
  converter.textFragmentEnabled = textFragment;
  converter.docRoot = doc;
  const body = doc.querySelector("body");
  if (body && !BODY_TAG_RE.test(input)) {
    converter.convertChildren(body);
  } else {
    converter.convert(body ?? doc.documentElement);
  }
  return converter.result();
}
