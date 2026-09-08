// Parses a WICG Text Fragment directive string:
// text=[prefix-,]textStart[,textEnd][,-suffix]
// https://wicg.github.io/scroll-to-text-fragment/

const TEXT_DIRECTIVE_MARK = ":~:text=";

export interface TextFragmentDirective {
  textStart: string;
  textEnd?: string;
  prefix?: string;
  suffix?: string;
}

// Locates ":~:text=" anywhere in the input — it's a suffix appended onto
// whatever fragment (e.g. an element id) already precedes it, never the
// whole string.
export function decodeTextFragmentDirective(textref: string | undefined): TextFragmentDirective | undefined {
  if (!textref) return undefined;
  const markIndex = textref.indexOf(TEXT_DIRECTIVE_MARK);
  if (markIndex === -1) return undefined;
  const raw = textref.slice(markIndex + TEXT_DIRECTIVE_MARK.length).split("&")[0];
  if (!raw) return undefined;

  try {
    let parts = raw.split(",");
    const result: TextFragmentDirective = { textStart: "" };

    if (parts.length > 1 && parts[0]!.endsWith("-")) {
      result.prefix = decodeURIComponent(parts[0]!.slice(0, -1));
      parts = parts.slice(1);
    }
    if (parts.length > 1 && parts[parts.length - 1]!.startsWith("-")) {
      result.suffix = decodeURIComponent(parts[parts.length - 1]!.slice(1));
      parts = parts.slice(0, -1);
    }
    if (parts.length === 0 || parts[0] === "") return undefined;

    result.textStart = decodeURIComponent(parts[0]!);
    if (parts.length > 1) result.textEnd = decodeURIComponent(parts[1]!);
    return result;
  } catch {
    return undefined;
  }
}
