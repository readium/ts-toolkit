// Brackets and quotes left empty in plain text by the objects it drops, e.g. "1870s (◆) along".
import { startsWithBindingPunct } from "@readium/helpers";

// Stands in plain text for a dropped object, until removeDropped() takes it out.
export const DROPPED = "\u0000";

// Opening and closing marks, two characters per pair.
const BRACKET_PAIRS = "()[]{}（）［］｛｝「」『』【】〔〕〈〉《》";
const STRAIGHT_QUOTE_PAIRS = "\"\"''";
// From CLDR's delimiters, plus guillemets: »…« in German and Danish books, «…» in Swiss German, »…» in Swedish and Finnish.
const QUOTE_PAIRS: Record<string, string> = {
  ar: "”“’‘", bg: "„“", cs: "„“‚‘", da: "“”‘’»«›‹", de: "„“‚‘»«›‹«»‹›", el: "«»“”", en: "“”‘’", es: "“”‘’", et: "„“‚‘",
  fi: "””’’»»››", fr: "«»", he: "””’’", hr: "„“‚‘", hu: "„”»«", hy: "«»", is: "„“‚‘", it: "«»“”", ja: "「」『』",
  ka: "„“«»", ko: "“”‘’", lt: "„“", lv: "“”‘’", nb: "«»‘’", nl: "‘’", pl: "„”«»", pt: "“”‘’", ro: "„”«»", ru: "«»„“",
  sk: "„“‚‘", sl: "„“‚‘", sr: "„”’’", sv: "””’’»»››", tr: "“”‘’", uk: "«»„“", zh: "“”‘’", "zh-hant": "「」『』",
};
// What may sit between a pair's marks and still leave it empty.
const FILLER = /[\s​-‍⁠﻿,;、，\u0000]/;

// Takes dropped objects out of plain text, with any bracket or quote pair they leave empty.
export function removeDropped(plain: string, lang: string | undefined): string {
  const tag = lang?.toLowerCase() ?? "";
  const marks = BRACKET_PAIRS + STRAIGHT_QUOTE_PAIRS + (QUOTE_PAIRS[tag] ?? QUOTE_PAIRS[tag.split("-")[0]] ?? QUOTE_PAIRS.en);
  const pairs = new Set<string>();
  const opening = new Set<string>();
  const closing = new Set<string>();
  for (let i = 0; i < marks.length; i += 2) {
    pairs.add(marks[i] + marks[i + 1]);
    opening.add(marks[i]);
    closing.add(marks[i + 1]);
  }
  for (let i = plain.indexOf(DROPPED); i !== -1; i = plain.indexOf(DROPPED, i + 1)) {
    let start = i;
    let end = i + 1;
    while (start > 0 && FILLER.test(plain[start - 1])) start--;
    while (end < plain.length && FILLER.test(plain[end])) end++;
    const open = plain[start - 1];
    const close = plain[end];
    if (open === undefined || close === undefined || !pairs.has(open + close)) continue;
    // A mark that both opens and closes must be placed as the one it is here.
    if (closing.has(open) && start > 1 && !/[\s\p{Ps}\p{Pi}\p{Pd}]/u.test(plain[start - 2])) continue;
    if (opening.has(close) && end < plain.length - 1 && !/[\s\p{P}]/u.test(plain[end + 1])) continue;
    // The pair becomes one dropped object, which may leave an enclosing pair empty in turn.
    plain = plain.slice(0, start - 1) + DROPPED + plain.slice(end + 1);
    i = start - 2;
  }
  // A space is kept only where there was one around the dropped objects, and never before binding punctuation.
  return plain.replace(/( *)\u0000+( *)/g, (match: string, before: string, after: string, offset: number) => {
    const rest = plain.slice(offset + match.length);
    return offset > 0 && rest !== "" && (before || after) && !startsWithBindingPunct(rest) ? " " : "";
  });
}
