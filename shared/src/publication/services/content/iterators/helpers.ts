import { LocatorText } from "../../../Locator";


// https://github.com/jhy/jsoup/blob/0b10d516ed8f907f8fb4acb9a0806137a8988d45/src/main/java/org/jsoup/parser/Tag.java#L243
const inlineTags = [
    "OBJECT",
    "BASE",
    "FONT",
    "TT",
    "I",
    "B",
    "U",
    "BIG",
    "SMALL",
    "EM",
    "STRONG",
    "DFN",
    "CODE",
    "SAMP",
    "KBD",
    "VAR",
    "CITE",
    "ABBR",
    "TIME",
    "ACRONYM",
    "MARK",
    "RUBY",
    "RT",
    "RP",
    "RTC",
    "A",
    "IMG",
    "BR",
    "WBR",
    "MAP",
    "Q",
    "SUB",
    "SUP",
    "BDO",
    "IFRAME",
    "EMBED",
    "SPAN",
    "INPUT",
    "SELECT",
    "TEXTAREA",
    "LABEL",
    "BUTTON",
    "OPTGROUP",
    "OPTION",
    "LEGEND",
    "DATALIST",
    "KEYGEN",
    "OUTPUT",
    "PROGRESS",
    "METER",
    "AREA",
    "PARAM",
    "SOURCE",
    "TRACK",
    "SUMMARY",
    "COMMAND",
    "DEVICE",
    "BASEFONT",
    "BGSOUND",
    "MENUITEM",
    "DATA",
    "BDI",
    "S",
    "STRIKE",
    "NOBR",
    "RB"
];

export function isInlineTag(n: Node) {
    return inlineTags.includes(n.nodeName);
}

export function srcRelativeToHref(e: Element, base?: string | URL): string | null {
    const src = e.getAttribute("src");
    if (!src?.length) return null;
    return new URL(src, base).toString(); // TODO use readium util Href class?
}

// Inspired by golang's unicode.IsSpace
const unicodeSpaceRange = `[\\s\\u0085\\u00A0\\u2000-\\u200A\\u2028\\u2029\\u202F\\u205F\\u3000]`;
const allUnicodeSpace = new RegExp(`^${unicodeSpaceRange}+$`, "g");
const unicodeSpaceTrim = new RegExp(`^${unicodeSpaceRange}+|${unicodeSpaceRange}+$/g`, "g");
const unicodeSpaceStart = new RegExp(`^${unicodeSpaceRange}+`, "g");
const unicodeSpaceEnd = new RegExp(`${unicodeSpaceRange}+$`, "g");

console.log(allUnicodeSpace.source);
export const isBlank = (s: string | null) =>
    // Normal spaces, \t, \n, \v, \f, \r, U+0085, U+00A0, U+2000 to U+200A, U+2028, U+2029, U+202F, U+205F, U+3000
    !s?.length ? true : allUnicodeSpace.test(s);

// Like Go's strings.TrimSpace
export const trimUnicodeSpace = (s: string) => s.replace(unicodeSpaceTrim, "");
export const trimUnicodeSpaceStart = (s: string) => s.replace(unicodeSpaceStart, "");
export const trimUnicodeSpaceEnd = (s: string) => s.replace(unicodeSpaceEnd, "");

export const trimmingTextLocator = (text: string, before: string = ""): LocatorText =>
    new LocatorText({
        before: before + (unicodeSpaceStart.exec(text)?.[0] ?? ""),
        highlight: trimUnicodeSpace(text),
        after: unicodeSpaceEnd.exec(text)?.[0] ?? "",
    });

export function elementLanguage(e: HTMLElement | null) {
    while (e) {
        let lang = e.getAttribute("lang") || e.getAttributeNS("http://www.w3.org/1999/xhtml", "lang");
        if (lang) return lang;
        e = e.parentElement;
    }
    return null;
}

// Inspired by JSoup: https://github.com/jhy/jsoup/blob/1762412a28fa7b08ccf71d93fc4c98dc73086e03/src/main/java/org/jsoup/internal/StringUtil.java#L233
// Slight differing definition of what a whitespace characacter is
export function appendNormalizedWhitespace(accum: string, text: string): string {
    const stripLeading = accum.length > 0 && accum[accum.length - 1] === " ";
    let lastWasWhite = false, reachedNonWhite = false;
    for (let i = 0; i < text.length; i++) {
        if (isBlank(text[i])) {
            if ((stripLeading && !reachedNonWhite) || lastWasWhite) {
                continue;
            }
            accum += " ";
            lastWasWhite = true;
        } else {
            const cp = text.charCodeAt(i);
            // zero width sp, soft hyphen
            if (cp !== 8203 && cp !== 173) {
                accum += text[i];
                lastWasWhite = false;
                reachedNonWhite = true;
            }
        }
    }
    return accum;
}

/**
 * Handy function to get the minimal CSS selector of any element in a web page
 * https://gist.github.com/ErosLever/51c794dc1f2bab888f571e47275c85cd
 * @param {Element} e - the Element whose selector will be returned
 * @returns {string} s - the minimal CSS Selector including its ancestors elements
 */
export function getMinSelector(e: Element) {
    var s = "", t, i, c, p, n;
    do {
        t = e.tagName.toLowerCase();
        i = e.hasAttribute("id") ? "#" + e.id : "";
        c = e.hasAttribute("class") ? "." + e.className.split(/\s+/).join(".") : "";
        p = e.parentNode;
        n = Array.prototype.filter.call(e.parentNode?.childNodes, function (x) {
            return x.nodeType === Node.ELEMENT_NODE;
        }).indexOf(e) + 1;
        n = ":nth-child(" + n + ")";
        if (i && p?.querySelectorAll(i).length === 1)
            s = i + " > " + s;
        else if (p?.querySelectorAll(t).length === 1)
            s = t + " > " + s;
        else if (c && p?.querySelectorAll(t + c).length === 1)
            s = t + c + " > " + s;
        else if (i && c && p?.querySelectorAll(t + i + c).length === 1)
            s = t + i + c + " > " + s;
        else
            s = t + i + c + n + " > " + s;
    } while (!p || !(e = p as Element).tagName.match(/^HTML$/i));
    // try to remove parent selectors
    const cs = s.slice(0, -(" > ".length)).split(" > ");
    s = cs.pop()!;
    while (document.querySelectorAll(s).length > 1) {
        s = cs.pop() + " > " + s;
    }
    return s;
}