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

// BCP 47 tags are case-insensitive: "en-US" and "en-us" are the same language.
export function sameLanguage(a: string | undefined, b: string | undefined): boolean {
  return a === b || (a !== undefined && b !== undefined && a.toLowerCase() === b.toLowerCase());
}

// The language all of `languages` are in, as first spelled, unknown ("") when they differ.
export function sharedLanguage(languages: Iterable<string>): string {
  let shared: string | undefined;
  for (const language of languages) {
    if (shared === undefined) shared = language;
    else if (!sameLanguage(shared, language)) return "";
  }
  return shared ?? "";
}
