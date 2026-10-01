import { GuidedNavigationText } from "@readium/shared";

export interface TextBuilder {
  plain: string;
  ssml: string;
  language: string;
}

export function textIsEmpty(t: TextBuilder): boolean {
  return t.plain === "" && t.ssml === "" && t.language === "";
}

export function finalizeText(t?: TextBuilder): GuidedNavigationText | undefined {
  if (!t || (t.plain === "" && t.ssml === "")) return undefined;
  return new GuidedNavigationText({
    plain: t.plain !== "" ? t.plain : undefined,
    ssml: t.ssml !== "" ? t.ssml : undefined,
    language: t.language !== "" ? t.language : undefined,
  });
}

export interface SSMLContext {
  lang: string;
  tag: string;
  attrs?: Record<string, string>;
}

export function ctxEqual(a: SSMLContext, b: SSMLContext): boolean {
  if (a.lang !== b.lang || a.tag !== b.tag) return false;
  const ae = Object.entries(a.attrs ?? {});
  const be = Object.entries(b.attrs ?? {});
  if (ae.length !== be.length) return false;
  return ae.every(([k, v]) => b.attrs?.[k] === v);
}

// Unicode's Line_Break=GL ("glue") space codepoints; no `\p{...}` covers this directly.
const NO_BREAK_SPACE_RE = /[\u00A0\u2007\u202F]/;

export function isNoBreakSpace(ch: string): boolean {
  return NO_BREAK_SPACE_RE.test(ch);
}

export function normalizeWhitespace(text: string, stripLeading: boolean): string {
  let out = "";
  let lastWasWhite = false;
  let reachedNonWhite = false;
  for (const ch of text) {
    if (isNoBreakSpace(ch)) {
      // Never collapsed or stripped as leading, unlike an ordinary space.
      out += ch;
      lastWasWhite = false;
      reachedNonWhite = true;
    } else if (/\s/.test(ch)) {
      if ((stripLeading && !reachedNonWhite) || lastWasWhite) continue;
      out += " ";
      lastWasWhite = true;
    } else if (ch !== "\u200B" && ch !== "\u00AD") {
      // zero width space, soft hyphen
      out += ch;
      lastWasWhite = false;
      reachedNonWhite = true;
    }
  }
  return out;
}
