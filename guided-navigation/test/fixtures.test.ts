import { GuidedNavigationObject } from "@readium/shared";
import { loadManifest, loadFixture, stripLocatorDetails } from "./testUtils.ts";
import { parseMarkup } from "../src/converter.ts";

const manifest = loadManifest();

test("manifest is a non-empty array", () => {
  expect(Array.isArray(manifest)).toBe(true);
  expect(manifest.length).toBeGreaterThan(0);
});

test("manifest has no duplicate ids", () => {
  const ids = manifest.map((entry) => entry.id);
  expect(new Set(ids).size).toBe(ids.length);
});

function sortKeysDeep(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortKeysDeep);
  if (value && typeof value === "object") {
    return Object.keys(value)
      .sort()
      .reduce((acc: Record<string, unknown>, key) => {
        acc[key] = sortKeysDeep((value as Record<string, unknown>)[key]);
        return acc;
      }, {});
  }
  return value;
}

// gnd.json stores a single fixture's expected top-level item(s) directly —
// a bare object for one item, or a role-less/id-less `{children: [...]}` for
// several siblings — while `parseMarkup()` always returns an array. This maps
// the stored file format onto that array shape for comparison.
function expectedTopLevel(gnd: unknown): unknown[] {
  if (gnd && typeof gnd === "object" && !Array.isArray(gnd)) {
    const keys = Object.keys(gnd);
    if (keys.length === 1 && keys[0] === "children") {
      return (gnd as { children: unknown[] }).children;
    }
  }
  return [gnd];
}

describe.each(manifest.map((entry) => [entry.id, entry] as const))("fixture %s", (id, entry) => {
  const fixture = loadFixture(id);

  test("loads", () => {
    expect(entry.dir).toBe(id);
    expect(fixture.meta.id).toBe(id);
    expect(fixture.meta.role).toBe(entry.role);
    expect(fixture.inputHtml.trim().length).toBeGreaterThan(0);
    expect(typeof fixture.gnd === "object" && fixture.gnd !== null).toBe(true);
  });

  test("gnd.json is valid against the Guided Navigation schema", () => {
    for (const item of expectedTopLevel(fixture.gnd)) {
      expect(GuidedNavigationObject.deserialize(item)?.serialize()).toEqual(item);
    }
  });

  test("parseMarkup matches gnd.json", () => {
    const actual = parseMarkup(fixture.inputHtml).map((o) => o.serialize());
    expect(sortKeysDeep(stripLocatorDetails(actual))).toEqual(sortKeysDeep(stripLocatorDetails(expectedTopLevel(fixture.gnd))));
  });
});
