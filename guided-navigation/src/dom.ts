const ELEMENT_NODE = 1;

export function nodeLanguage(el: Element | null): string {
  for (let n: Element | null = el; n; n = n.parentElement) {
    const xmlLang = n.getAttribute("xml:lang");
    if (xmlLang) return xmlLang;
    const lang = n.getAttribute("lang");
    if (lang) return lang;
  }
  return "";
}

export function hasElementChild(el: Element): boolean {
  for (let c = el.firstChild; c; c = c.nextSibling) {
    if (c.nodeType === ELEMENT_NODE) return true;
  }
  return false;
}

export function isAncestorOf(anc: Element, n: Element): boolean {
  for (let p: Element | null = n; p; p = p.parentElement) {
    if (p === anc) return true;
  }
  return false;
}

// From jsoup, everything except "device":
// https://github.com/jhy/jsoup/blob/0b10d516ed8f907f8fb4acb9a0806137a8988d45/src/main/java/org/jsoup/parser/Tag.java#L243
const inlineTags = new Set([
  "object", "base", "font", "tt", "i", "b", "u", "big", "small", "em", "strong",
  "dfn", "code", "samp", "kbd", "var", "cite", "abbr", "time", "acronym",
  "mark", "ruby", "rt", "rp", "rtc", "a", "img", "br", "wbr", "map", "q",
  "sub", "sup", "bdo", "iframe", "embed", "span", "input", "select",
  "textarea", "label", "button", "optgroup", "option", "legend", "datalist",
  "keygen", "output", "progress", "meter", "area", "param", "source",
  "track", "summary", "command", "basefont", "bgsound", "menuitem", "data",
  "bdi", "s", "strike", "nobr", "rb",
]);

export function isInlineTag(tagName: string): boolean {
  return inlineTags.has(tagName);
}

export type GndMediaType = "text/html" | "application/xhtml+xml";

export function sniffMediaType(input: string): GndMediaType {
  const head = input.slice(0, 500);
  if (
    /<\?xml\b/.test(head) ||
    /xmlns:epub=/.test(head) ||
    /DOCTYPE\s+html\s+PUBLIC\s+"-\/\/W3C\/\/DTD XHTML/i.test(head)
  ) {
    return "application/xhtml+xml";
  }
  return "text/html";
}
