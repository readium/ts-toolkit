import { existsSync, readFileSync } from "fs";
import { join } from "path";

export interface FixtureManifestEntry {
  id: string;
  dir: string;
  role: string;
  description: string;
  files: {
    input: string;
    gnd: string;
  };
}

export interface FixtureMeta {
  id: string;
  description: string;
  role: string;
  rolesCovered: string[];
  sourceRef: string;
  inputKind: "fragment" | "document";
}

export interface LoadedFixture {
  meta: FixtureMeta;
  inputHtml: string;
  gnd: unknown;
}

const fixturesDir = join(__dirname, "../fixtures");

export function loadManifest(): FixtureManifestEntry[] {
  return JSON.parse(readFileSync(join(fixturesDir, "manifest.json"), "utf-8"));
}

export function loadFixture(id: string): LoadedFixture {
  const dir = join(fixturesDir, id);
  const meta: FixtureMeta = JSON.parse(readFileSync(join(dir, "meta.json"), "utf-8"));
  const inputFile = existsSync(join(dir, "input.xhtml")) ? "input.xhtml" : "input.html";
  const inputHtml = readFileSync(join(dir, inputFile), "utf-8");
  const gnd = JSON.parse(readFileSync(join(dir, "gnd.json"), "utf-8"));
  return { meta, inputHtml, gnd };
}

// Generated selectors differ across implementations, so fixtures don't compare textref values.
export function stripLocatorDetails(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stripLocatorDetails);
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value)) {
      if (key === "textref") continue;
      out[key] = stripLocatorDetails(val);
    }
    return out;
  }
  return value;
}
