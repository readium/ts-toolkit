import type { GndRole } from "./types.ts";

// https://github.com/readium/guided-navigation/blob/main/schema/roles.schema.json
// `sequence` is intentionally omitted: it has no documented HTML/ARIA/epub:type
// mapping anywhere in the spec or its examples.

const headingRoles: GndRole[] = [
  "heading1",
  "heading2",
  "heading3",
  "heading4",
  "heading5",
  "heading6",
];

const ariaRoles: Record<string, GndRole> = {
  "doc-abstract": "abstract",
  "doc-acknowledgments": "acknowledgments",
  "doc-afterword": "afterword",
  "doc-appendix": "appendix",
  article: "article",
  "doc-backlink": "backlink",
  "doc-biblioentry": "listItem", // Deprecated in DPUB-ARIA 1.1
  "doc-bibliography": "bibliography",
  "doc-biblioref": "biblioref",
  blockquote: "blockquote",
  caption: "caption",
  cell: "cell",
  "doc-chapter": "chapter",
  "doc-colophon": "colophon",
  columnheader: "columnheader",
  complementary: "complementary",
  "doc-conclusion": "conclusion",
  "doc-cover": "cover",
  "doc-credit": "credit",
  "doc-credits": "credits",
  "doc-dedication": "dedication",
  definition: "definition",
  "doc-endnote": "footnote", // Deprecated in DPUB-ARIA 1.1
  "doc-endnotes": "endnotes",
  "doc-epigraph": "epigraph",
  "doc-epilogue": "epilogue",
  "doc-errata": "errata",
  "doc-example": "example",
  figure: "figure",
  "doc-footnote": "footnote",
  "doc-foreword": "foreword",
  "doc-glossary": "glossary",
  "doc-glossref": "glossref",
  img: "image",
  image: "image", // ARIA 1.3 synonym of img
  "doc-index": "index",
  "doc-introduction": "introduction",
  list: "list",
  listitem: "listItem",
  main: "main",
  math: "math",
  navigation: "navigation",
  "doc-noteref": "noteref",
  "doc-notice": "notice",
  "doc-pagebreak": "pagebreak",
  "doc-pagelist": "pagelist",
  paragraph: "paragraph",
  "doc-part": "part",
  "doc-preface": "preface",
  "doc-prologue": "prologue",
  "doc-pullquote": "pullquote",
  grid: "table",
  gridcell: "cell",
  presentation: "presentation",
  none: "presentation",
  "doc-qna": "qna",
  qna: "qna",
  region: "region",
  row: "row",
  rowheader: "rowheader",
  separator: "separator",
  "doc-subtitle": "subtitle",
  table: "table",
  term: "term",
  "doc-tip": "tip",
  "doc-toc": "toc",
};

const epubTypeRoles: Record<string, GndRole> = {
  abstract: "abstract",
  acknowledgments: "acknowledgments",
  afterword: "afterword",
  appendix: "appendix",
  aside: "aside",
  backlink: "backlink",
  biblioentry: "listItem", // Deprecated in DPUB-ARIA 1.1
  bibliography: "bibliography",
  biblioref: "biblioref",
  "table-cell": "cell",
  chapter: "chapter",
  colophon: "colophon",
  conclusion: "conclusion",
  cover: "cover",
  credit: "credit",
  credits: "credits",
  dedication: "dedication",
  glossdef: "definition",
  endnote: "footnote",
  endnotes: "endnotes",
  rearnote: "footnote", // Deprecated alias of endnote
  rearnotes: "endnotes", // Deprecated alias of endnotes
  epigraph: "epigraph",
  epilogue: "epilogue",
  errata: "errata",
  example: "example",
  figure: "figure",
  footnote: "footnote",
  foreword: "foreword",
  glossary: "glossary",
  glossref: "glossref",
  index: "index",
  introduction: "introduction",
  landmarks: "landmarks",
  list: "list",
  "list-item": "listItem",
  loa: "loa",
  loi: "loi",
  lot: "lot",
  lov: "lov",
  noteref: "noteref",
  notice: "notice",
  pagebreak: "pagebreak",
  "page-list": "pagelist",
  pagelist: "pagelist",
  part: "part",
  preface: "preface",
  prologue: "prologue",
  pullquote: "pullquote",
  qna: "qna",
  "table-row": "row",
  subtitle: "subtitle",
  table: "table",
  glossterm: "term",
  tip: "tip",
  toc: "toc",
};

// Elements whose role depends only on their tag name.
const simpleElementTypeRoles: Record<string, GndRole> = {
  article: "article",
  aside: "aside",
  audio: "audio",
  blockquote: "blockquote",
  caption: "caption",
  figcaption: "caption",
  td: "cell",
  dd: "definition",
  details: "details",
  figure: "figure",
  header: "header",
  h1: "heading1",
  h2: "heading2",
  h3: "heading3",
  h4: "heading4",
  h5: "heading5",
  h6: "heading6",
  img: "image",
  ul: "list",
  ol: "list",
  li: "listItem",
  main: "main",
  math: "math",
  nav: "navigation",
  p: "paragraph",
  pre: "preformatted",
  tr: "row",
  section: "section",
  hr: "separator",
  summary: "summary",
  table: "table",
  dfn: "term",
  dt: "term",
  video: "video",
  svg: "image",
};

// HTML-AAM's presentational table rule: role="presentation"/"none" cascades
// to the whole subtree, unconditionally, no per-descendant escape hatch.
const tableStructuralTags = new Set(["table", "tr", "td", "th"]);
const tableStructuralRoles: ReadonlySet<GndRole> = new Set(["table", "row", "cell", "columnheader", "rowheader"]);

function isElementPresentational(el: Element): boolean {
  const role = el.getAttribute("role");
  if (!role) return false;
  const vals = role.split(/\s+/).filter(Boolean);
  return vals.includes("presentation") || vals.includes("none");
}

// Any presentational ancestor, not just a literal <table> — an ARIA-encoded
// table has no tag/role saying "table", only its structural descendants.
function hasPresentationalAncestor(el: Element): boolean {
  for (let p = el.parentElement; p; p = p.parentElement) {
    if (isElementPresentational(p)) return true;
  }
  return false;
}

function isTableStructuralCandidate(tagName: string, attrRoles: GndRole[]): boolean {
  return tableStructuralTags.has(tagName) || attrRoles.some((role) => tableStructuralRoles.has(role));
}

function hasRole(el: Element, role: string): boolean {
  const attr = el.getAttribute("role");
  if (!attr) return false;
  return attr.split(/\s+/).filter(Boolean).includes(role);
}

function isTableContainer(el: Element): boolean {
  return el.tagName.toLowerCase() === "table" || hasRole(el, "table") || hasRole(el, "grid") || hasRole(el, "treegrid");
}

function isRowElement(el: Element): boolean {
  return el.tagName.toLowerCase() === "tr" || hasRole(el, "row");
}

// Unscoped <th> fallback: first row -> columnheader, else -> rowheader.
// Walks ancestors by tag/role instead of `closest("table")` — an ARIA-only
// table (role="grid"/"table", no literal <table> tag) has no HTML tag to
// find, only its structural descendants.
function isFirstRowOfTable(tr: Element): boolean {
  let container: Element | null = null;
  for (let p = tr.parentElement; p; p = p.parentElement) {
    if (isTableContainer(p)) {
      container = p;
      break;
    }
  }
  if (!container) return false;

  const walker = container.ownerDocument.createTreeWalker(container, NodeFilter.SHOW_ELEMENT, {
    acceptNode: (n) => (isRowElement(n as Element) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_SKIP),
  });
  return walker.nextNode() === tr;
}

/**
 * Determines the Guided Navigation roles of an element, combining the roles
 * derived from the element type itself with the ones from its ARIA `role` and
 * `epub:type` attributes, e.g. `<section epub:type="chapter">` -> `[section, chapter]`.
 * An ARIA role of "presentation"/"none" strips the element of its native semantics.
 */
// Roles from an explicit `role=`/`epub:type` attribute, as opposed to the
// tag-name mapping below that every element gets for free.
function computeAttrRoles(el: Element): { attrRoles: GndRole[]; presentational: boolean } {
  const attrRoles: GndRole[] = [];
  let presentational = false;

  const role = el.getAttribute("role");
  if (role) {
    for (const val of role.split(/\s+/).filter(Boolean)) {
      if (val === "presentation" || val === "none") {
        presentational = true;
      }
      if (val === "heading") {
        // The heading level comes from aria-level. It defaults to 2:
        // https://www.w3.org/TR/wai-aria/#heading
        let level = 2;
        const ariaLevel = parseInt(el.getAttribute("aria-level") ?? "", 10);
        if (Number.isFinite(ariaLevel) && ariaLevel >= 1) {
          level = Math.min(ariaLevel, 6);
        }
        attrRoles.push(headingRoles[level - 1]);
      } else if (ariaRoles[val]) {
        attrRoles.push(ariaRoles[val]);
      }
    }
  }

  // epub:type is only meaningful (and only ever set) in XHTML documents with
  // the epub namespace declared; read the literal attribute name rather than
  // resolving the namespace, since XHTML documents always use the "epub"
  // prefix in practice.
  const epubType = el.getAttribute("epub:type");
  if (epubType) {
    for (const val of epubType.split(/\s+/).filter(Boolean)) {
      const mapped = epubTypeRoles[val];
      if (mapped) attrRoles.push(mapped);
    }
  }

  return { attrRoles, presentational };
}

// Whether el's role was explicitly authored (`role=`/`epub:type`), not just
// inferred from its tag — e.g. a credit line vs. a plain `<p>`/`<pre>`.
export function hasExplicitRole(el: Element): boolean {
  const { attrRoles, presentational } = computeAttrRoles(el);
  return attrRoles.length > 0 || presentational;
}

export function extractNodeRoles(el: Element): GndRole[] {
  const roles: GndRole[] = [];
  const add = (role: GndRole) => {
    if (!roles.includes(role)) roles.push(role);
  };

  const { attrRoles, presentational } = computeAttrRoles(el);

  const tagName = el.tagName.toLowerCase();

  if (presentational) {
    // The element only retains the presentation role
    return ["presentation"];
  }

  if (isTableStructuralCandidate(tagName, attrRoles) && hasPresentationalAncestor(el)) {
    return ["presentation"];
  }

  // Based on element type. The element's own role comes first, followed by the
  // more specific attribute-based roles, matching the ordering of the examples
  // in the Guided Navigation specification.
  if (tagName === "body") {
    add("body");
  } else if (tagName === "th") {
    switch (el.getAttribute("scope")) {
      case "col":
        add("columnheader");
        break;
      case "row":
        add("rowheader");
        break;
      default: {
        const tr = el.parentElement;
        if (tr && isFirstRowOfTable(tr)) {
          add("columnheader");
        } else if (el.previousElementSibling === null) {
          add("rowheader");
        } else {
          add("cell");
        }
      }
    }
  } else {
    const mapped = simpleElementTypeRoles[tagName];
    if (mapped) add(mapped);
  }

  for (const r of attrRoles) add(r);

  return roles;
}
