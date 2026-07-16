import { LocatorLocations } from '../Locator.ts';
import { DomRange } from './DomRange.ts';
import { parseNptTime } from '../../util/npt.ts';

// HTML extensions for LocatorLocations.
// https://github.com/readium/architecture/blob/master/models/locators/extensions/html.md

export function getCssSelector(loc: LocatorLocations): string | undefined {
  return loc.otherLocations?.get('cssSelector');
}

export function getPartialCfi(loc: LocatorLocations): string | undefined {
  return loc.otherLocations?.get('partialCfi');
}

export function getDomRange(loc: LocatorLocations): DomRange | undefined {
  return DomRange.deserialize(loc.otherLocations?.get('domRange'));
}

export function getFragmentParameters(loc: LocatorLocations): Map<string, string> {
  return new Map(
    loc.fragments
      .map(f => f.startsWith('#') ? f.slice(1) : f)
      .join('&')
      .split('&')
      .filter(f => !f.startsWith('#'))
      .map(f => f.split('='))
      .filter(f => f.length === 2)
      .map(f => [f[0].trim().toLowerCase(), f[1].trim()])
  );
}

export function getHtmlId(loc: LocatorLocations): string | undefined {
  /*
  The HTML 5 specification (used for WebPub) allows any character in an HTML ID, except spaces.
  This is an issue to differentiate with named parameters, so we ignore any ID containing `=`.
  */
  if (!loc.fragments.length) return;
  let f = loc.fragments.find(f => f.length && !f.includes('='));
  if (!f) {
    const fp = getFragmentParameters(loc);
    if (fp.has('id')) f = fp.get('id');
    else if (fp.has('name')) f = fp.get('name');
  }
  return f?.startsWith('#') ? f.slice(1) : f;
}

export function getPage(loc: LocatorLocations): number | undefined {
  const i = parseInt(getFragmentParameters(loc).get('page')!);
  if (!isNaN(i) && i >= 0) return i;
  return undefined;
}

export function getTime(loc: LocatorLocations): number | undefined {
  const raw = getFragmentParameters(loc).get('t');
  if (!raw) return undefined;
  return parseNptTime(raw);
}

export function getSpace(loc: LocatorLocations): { unit: "pixel" | "percent"; x: number; y: number; width: number; height: number } | undefined {
  const fp = getFragmentParameters(loc);
  if (!fp.has('xywh')) return;

  const raw = fp.get('xywh')!;
  let unit: "pixel" | "percent" = "pixel";
  let coords = raw;

  const normalizedRaw = raw.toLowerCase();
  if (normalizedRaw.startsWith("pixel:")) {
    coords = raw.slice(6);
  } else if (normalizedRaw.startsWith("percent:")) {
    unit = "percent";
    coords = raw.slice(8);
  }

  const parse = unit === "percent" ? parseFloat : (s: string) => parseInt(s, 10);
  const parts = coords.split(",").map(parse);
  if (parts.length !== 4 || parts.some(isNaN)) return;

  const [x, y, width, height] = parts;
  return { unit, x, y, width, height };
}
