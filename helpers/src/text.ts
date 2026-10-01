// Backward-binding: closing brackets/quotes (Pe/Pf) plus terminal marks (.,;:!? and CJK/Arabic equivalents).
export const BINDING_PUNCT_CLASS = "\\p{Pe}\\p{Pf}.,;:!?，。、；：！？،؛؟";

const BINDING_PUNCT_RE = new RegExp(`^[${BINDING_PUNCT_CLASS}]`, "u");

export function startsWithBindingPunct(s: string): boolean {
  return BINDING_PUNCT_RE.test(s);
}

export const ssmlTextEscape = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
export const ssmlAttrEscape = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
