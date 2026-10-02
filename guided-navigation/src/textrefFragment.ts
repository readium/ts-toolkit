// textref fragments: a "#css()" fragment carrying a CSS selector, a
// "#domrange()" fragment (for callers converting a live, already-rendered
// DOM) carrying a serialized Locator DomRange — see the Locator HTML
// extension spec: https://readium.org/architecture/models/locators/extensions/html.html#the-domrange-object
// — and a ":~:text=..." suffix per the WICG Text Fragments spec
// (https://wicg.github.io/scroll-to-text-fragment/), which appends onto
// whatever fragment already precedes it rather than replacing it. None of
// these is a Locator itself — textref is a plain URI reference, per the
// guided-navigation spec.

const CSS_PREFIX = "#css(";
const CSS_SUFFIX = ")";

export function encodeCssSelectorFragment(selector: string): string {
  return `${CSS_PREFIX}${encodeURIComponent(selector)}${CSS_SUFFIX}`;
}

export function decodeCssSelectorFragment(textref: string | undefined): string | undefined {
  if (!textref || !textref.startsWith(CSS_PREFIX) || !textref.endsWith(CSS_SUFFIX)) return undefined;
  return decodeURIComponent(textref.slice(CSS_PREFIX.length, -CSS_SUFFIX.length));
}

const DOMRANGE_PREFIX = "#domrange(";
const DOMRANGE_SUFFIX = ")";

// The RWPM JSON shape produced/consumed by @readium/shared's DomRange —
// {start: {cssSelector, textNodeIndex, charOffset?}, end?: {...}}.
export interface DomRangeJSON {
  start: { cssSelector: string; textNodeIndex: number; charOffset?: number };
  end?: { cssSelector: string; textNodeIndex: number; charOffset?: number };
  // The block element's own selector — distinct from start's selector, which
  // is whatever child actually contains the first flow text node (e.g. a
  // word-token <span>), not the block itself.
  container?: string;
}

export function encodeDomRangeFragment(domRange: DomRangeJSON): string {
  return `${DOMRANGE_PREFIX}${encodeURIComponent(JSON.stringify(domRange))}${DOMRANGE_SUFFIX}`;
}

export function decodeDomRangeFragment(textref: string | undefined): DomRangeJSON | undefined {
  if (!textref || !textref.startsWith(DOMRANGE_PREFIX) || !textref.endsWith(DOMRANGE_SUFFIX)) return undefined;
  try {
    const json = JSON.parse(decodeURIComponent(textref.slice(DOMRANGE_PREFIX.length, -DOMRANGE_SUFFIX.length)));
    if (!json?.start?.cssSelector || typeof json.start.textNodeIndex !== "number") return undefined;
    return json as DomRangeJSON;
  } catch {
    return undefined;
  }
}

const TEXT_DIRECTIVE_MARK = ":~:text=";

// WICG Text Fragments directive grammar: text=[prefix-,]textStart[,textEnd][,-suffix].
export interface TextFragmentDirective {
  textStart: string;
  textEnd?: string;
  prefix?: string;
  suffix?: string;
}

// A literal "-" isn't touched by encodeURIComponent, but the grammar uses
// "-," and ",-" as prefix/suffix markers, so it must always be escaped in
// content to stay unambiguous.
function encodeFragmentPart(s: string): string {
  return encodeURIComponent(s).replace(/-/g, "%2D");
}

export function encodeTextFragmentDirective(fragment: TextFragmentDirective): string {
  let s = "";
  if (fragment.prefix) s += `${encodeFragmentPart(fragment.prefix)}-,`;
  s += encodeFragmentPart(fragment.textStart);
  if (fragment.textEnd) s += `,${encodeFragmentPart(fragment.textEnd)}`;
  if (fragment.suffix) s += `,-${encodeFragmentPart(fragment.suffix)}`;
  return `${TEXT_DIRECTIVE_MARK}${s}`;
}

// Locates ":~:text=" anywhere in textref — it's a suffix appended onto
// whatever fragment (bare id / #css(...) / #domrange(...)) already precedes
// it, never the whole string.
export function decodeTextFragmentDirective(textref: string | undefined): TextFragmentDirective | undefined {
  if (!textref) return undefined;
  const markIndex = textref.indexOf(TEXT_DIRECTIVE_MARK);
  if (markIndex === -1) return undefined;
  const raw = textref.slice(markIndex + TEXT_DIRECTIVE_MARK.length).split("&")[0];
  if (!raw) return undefined;

  try {
    let parts = raw.split(",");
    const result: TextFragmentDirective = { textStart: "" };

    if (parts[0].endsWith("-")) {
      result.prefix = decodeURIComponent(parts[0].slice(0, -1));
      parts = parts.slice(1);
    }
    if (parts.length > 0 && parts[parts.length - 1].startsWith("-")) {
      result.suffix = decodeURIComponent(parts[parts.length - 1].slice(1));
      parts = parts.slice(0, -1);
    }
    if (parts.length === 0 || parts[0] === "") return undefined;

    result.textStart = decodeURIComponent(parts[0]);
    if (parts.length > 1) result.textEnd = decodeURIComponent(parts[1]);
    return result;
  } catch {
    return undefined;
  }
}

export interface DecodedTextref {
  // The resource the reference points into, when the textref names one.
  href?: string;
  cssSelector?: string;
  domRange?: DomRangeJSON;
  text?: { highlight?: string; before?: string; after?: string };
  fragment?: string;
}

// Combines two nodes' own decoded textrefs into one spanning locator (each
// `DomRangeJSON` point carries its own `cssSelector`, so start/end in two
// different elements is already legal). `undefined` when either side has no
// `domRange` to combine — a bare selector has no `textNodeIndex` to build one from.
export function combineDomRangeTextrefs(first: DecodedTextref, last: DecodedTextref): DecodedTextref | undefined {
  if (!first.domRange || !last.domRange) return undefined;
  // A DOM range can't span two documents.
  if (first.href !== last.href) return undefined;
  const domRange: DomRangeJSON = { start: first.domRange.start, end: last.domRange.end ?? last.domRange.start };
  if (first.domRange.container !== undefined) domRange.container = first.domRange.container;
  const combined: DecodedTextref = { domRange, cssSelector: domRange.container ?? domRange.start.cssSelector };
  if (first.href !== undefined) combined.href = first.href;
  return combined;
}

function decodeIdFragment(base: string): string | undefined {
  if (!base.startsWith("#")) return undefined;
  try {
    return decodeURIComponent(base.slice(1));
  } catch {
    return undefined;
  }
}

// Decodes a reference to a node's own content, distinguishing it from a
// navigational textref (link href, noteref target). A textref is
// "[href]#fragment", the href naming the resource when present (e.g.
// "chapter.xhtml#css(...)"). "#css(...)"/"#domrange(...)" fragments are
// always self-references; a bare "#id" only is when it matches the node's
// own id. A ":~:text=..." suffix can accompany any of the above, or stand
// alone, so it's decoded separately and merged into the result.
export function decodeTextref(node: { id?: string; textref?: string } | undefined): DecodedTextref | undefined {
  const textref = node?.textref;
  if (!textref) return undefined;

  const markIndex = textref.indexOf(":~:");
  const base = markIndex === -1 ? textref : textref.slice(0, markIndex);
  const hashIndex = base.indexOf("#");
  const href = hashIndex === -1 ? base : base.slice(0, hashIndex);
  const fragment = hashIndex === -1 ? "" : base.slice(hashIndex);

  let cssSelector: string | undefined;
  let domRange: DomRangeJSON | undefined;
  const fragmentDomRange = decodeDomRangeFragment(fragment);
  if (fragmentDomRange) {
    domRange = fragmentDomRange;
    cssSelector = fragmentDomRange.container ?? fragmentDomRange.start.cssSelector;
  } else {
    const decoded = decodeCssSelectorFragment(fragment);
    if (decoded !== undefined) {
      cssSelector = decoded;
    } else if (node.id && decodeIdFragment(fragment) === node.id) {
      cssSelector = `#${CSS.escape(node.id)}`;
    }
  }

  // A textStart/textEnd range can't be collapsed back into one exact
  // "highlight" string without the full text in between, so it's carried
  // as-is via locations.fragments (which the WICG grammar natively
  // supports) instead. Only the exact-match case (no textEnd) becomes a
  // text.highlight/before/after quote.
  const directive = decodeTextFragmentDirective(textref);

  if (cssSelector === undefined && domRange === undefined && directive === undefined) {
    return undefined;
  }

  const result: DecodedTextref = {};
  if (href !== "") result.href = href;
  if (cssSelector !== undefined) result.cssSelector = cssSelector;
  if (domRange !== undefined) result.domRange = domRange;
  if (directive?.textEnd !== undefined) {
    result.fragment = encodeTextFragmentDirective(directive);
  } else if (directive) {
    result.text = { highlight: directive.textStart };
    if (directive.prefix !== undefined) result.text.before = directive.prefix;
    if (directive.suffix !== undefined) result.text.after = directive.suffix;
  }
  return result;
}
