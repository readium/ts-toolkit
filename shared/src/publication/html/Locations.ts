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

export function fragmentParameters(loc: LocatorLocations): Map<string, string> {
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

export function htmlId(loc: LocatorLocations): string | undefined {
  /*
  The HTML 5 specification (used for WebPub) allows any character in an HTML ID, except spaces.
  This is an issue to differentiate with named parameters, so we ignore any ID containing `=`.
  */
  if (!loc.fragments.length) return;
  let f = loc.fragments.find(f => f.length && !f.includes('='));
  if (!f) {
    const fp = fragmentParameters(loc);
    if (fp.has('id')) f = fp.get('id');
    else if (fp.has('name')) f = fp.get('name');
  }
  return f?.startsWith('#') ? f.slice(1) : f;
}

export function page(loc: LocatorLocations): number | undefined {
  const i = parseInt(fragmentParameters(loc).get('page')!);
  if (!isNaN(i) && i >= 0) return i;
  return undefined;
}

export function time(loc: LocatorLocations): number | undefined {
  const raw = fragmentParameters(loc).get('t');
  if (!raw) return undefined;
  return parseNptTime(raw);
}

export function space(loc: LocatorLocations): [number, number, number, number] | undefined {
  const fp = fragmentParameters(loc);
  if (!fp.has('xywh')) return;
  // TODO more sophisticated parsing to handle the format
  const xywh = fp.get('xywh')!.split(',').map(s => parseInt(s));
  if (xywh.length !== 4) return;
  if (xywh.some(isNaN)) return;
  return xywh as [number, number, number, number];
}
