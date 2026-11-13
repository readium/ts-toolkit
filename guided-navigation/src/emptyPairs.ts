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

interface Marks {
  pairs: Set<string>;
  opening: Set<string>;
  closing: Set<string>;
}

const marksByLanguage = new Map<string, Marks>();

function marksFor(lang: string | undefined): Marks {
  const tag = lang?.toLowerCase() ?? "";
  let marks = marksByLanguage.get(tag);
  if (marks) return marks;
  const chars = BRACKET_PAIRS + STRAIGHT_QUOTE_PAIRS + (QUOTE_PAIRS[tag] ?? QUOTE_PAIRS[tag.split("-")[0]] ?? QUOTE_PAIRS.en);
  marks = { pairs: new Set(), opening: new Set(), closing: new Set() };
  for (let i = 0; i < chars.length; i += 2) {
    marks.pairs.add(chars[i] + chars[i + 1]);
    marks.opening.add(chars[i]);
    marks.closing.add(chars[i + 1]);
  }
  marksByLanguage.set(tag, marks);
  return marks;
}

// Whether text starts with punctuation attaching to what precedes it, unlike a quote it opens, e.g. German »Welt«.
// French spaces its closing guillemet and high punctuation instead.
export function bindsToPrevious(text: string, lang: string | undefined): boolean {
  if (!startsWithBindingPunct(text)) return false;
  if (lang?.toLowerCase().split("-")[0] === "fr" && "»;:!?".includes(text[0])) return false;
  return !(marksFor(lang).opening.has(text[0]) && text.length > 1 && !/[\s\p{P}]/u.test(text[1]));
}

/** Which characters of plain text in `lang` `removeDropped` takes out, as a mask of the same length.
 * A collapsed pair owns its marks and fillers; where spaces collapse to one, the first space is the one kept. */
export function droppedMask(plain: string, lang: string | undefined): boolean[] {
  const { pairs, opening, closing } = marksFor(lang);
  let text = plain;
  // Indices in `plain` behind each character of `text`.
  const sources: number[][] = Array.from({ length: plain.length }, (_, i) => [i]);
  for (let i = text.indexOf(DROPPED); i !== -1; i = text.indexOf(DROPPED, i + 1)) {
    let start = i;
    let end = i + 1;
    while (start > 0 && FILLER.test(text[start - 1])) start--;
    while (end < text.length && FILLER.test(text[end])) end++;
    const open = text[start - 1];
    const close = text[end];
    if (open === undefined || close === undefined || !pairs.has(open + close)) continue;
    // A mark that both opens and closes must be placed as the one it is here.
    if (closing.has(open) && start > 1 && !/[\s\p{Ps}\p{Pi}\p{Pd}]/u.test(text[start - 2])) continue;
    if (opening.has(close) && end < text.length - 1 && !/[\s\p{P}]/u.test(text[end + 1])) continue;
    // The pair becomes one dropped object, which may leave an enclosing pair empty in turn.
    text = text.slice(0, start - 1) + DROPPED + text.slice(end + 1);
    sources.splice(start - 1, end - start + 2, sources.slice(start - 1, end + 1).flat());
    i = start - 2;
  }
  const mask: boolean[] = new Array(plain.length).fill(false);
  // A space is kept only where there was one around the dropped objects, and never before binding punctuation.
  for (const match of text.matchAll(/ *\u0000[\u0000 ]*/g)) {
    const offset = match.index;
    const end = offset + match[0].length;
    const rest = text.slice(end);
    const kept = offset > 0 && rest !== "" && match[0].includes(" ") && !bindsToPrevious(rest, lang) ? text.indexOf(" ", offset) : -1;
    for (let j = offset; j < end; j++) {
      if (j !== kept) for (const source of sources[j]) mask[source] = true;
    }
  }
  return mask;
}

/** Takes each `DROPPED` out of plain text in `lang`, with any bracket or quote pair left enclosing only fillers (spaces, commas, other `DROPPED`).
 * Spaces around what's removed collapse to one, dropped at either end of the text and before binding punctuation; no space is added where there was none. */
export function removeDropped(plain: string, lang: string | undefined): string {
  const mask = droppedMask(plain, lang);
  let result = "";
  for (let i = 0; i < plain.length; i++) if (!mask[i]) result += plain[i];
  return result;
}
