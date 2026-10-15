const XML_NS = "http://www.w3.org/XML/1998/namespace";

// An element's own language declaration, `null` when it has none. An HTML `xml:lang` (no namespace)
// isn't in the XML namespace, so it only counts when not empty, as it never makes a language unknown.
function ownLanguage(el: Element): string | null {
  const xmlLang = el.getAttributeNS(XML_NS, "lang") ?? (el.getAttribute("xml:lang")?.trim() || null);
  return xmlLang ?? el.getAttribute("lang");
}

// The language declared on `el` or its nearest ancestor, `undefined` when none is.
// An empty declaration (`lang=""`) means the language is unknown, so it isn't inherited past it.
export function declaredLanguage(el: Element | null): string | undefined {
  for (let n: Element | null = el; n; n = n.parentElement) {
    const language = ownLanguage(n);
    if (language !== null) return language.trim();
  }
  return undefined;
}

export function nodeLanguage(el: Element | null): string {
  return declaredLanguage(el) ?? "";
}

export function sharedLanguage(languages: Set<string>): string {
  return languages.size === 1 ? [...languages][0] : "";
}
