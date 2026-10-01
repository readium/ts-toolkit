import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const FIXTURES_DIR = path.join(__dirname, "../fixtures");
const MANIFEST_FILE = path.join(FIXTURES_DIR, "manifest.json");
const COVERAGE_FILE = path.join(FIXTURES_DIR, "ROLES_COVERAGE.md");

// The filesystem is the source of truth: every subdirectory of fixtures/
// with a meta.json is a fixture. This script is the only thing that should
// ever write manifest.json or ROLES_COVERAGE.md — never hand-edit them.

const fixtureIds = fs
  .readdirSync(FIXTURES_DIR, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name)
  .filter((id) => fs.existsSync(path.join(FIXTURES_DIR, id, "meta.json")))
  .sort();

const manifest = fixtureIds.map((id) => {
  const dir = path.join(FIXTURES_DIR, id);
  const meta = JSON.parse(fs.readFileSync(path.join(dir, "meta.json"), "utf-8"));

  const inputFile = fs.existsSync(path.join(dir, "input.xhtml")) ? "input.xhtml" : "input.html";
  for (const file of [inputFile, "gnd.json"]) {
    if (!fs.existsSync(path.join(dir, file))) {
      throw new Error(`fixtures/${id} is missing ${file}`);
    }
  }
  if (meta.id !== id) {
    throw new Error(`fixtures/${id}/meta.json has id "${meta.id}", expected "${id}"`);
  }

  return {
    id,
    dir: id,
    role: meta.role,
    description: meta.description,
    files: {
      input: inputFile,
      gnd: "gnd.json",
    },
  };
});

const ids = manifest.map((e) => e.id);
const duplicates = ids.filter((id, i) => ids.indexOf(id) !== i);
if (duplicates.length > 0) {
  throw new Error(`duplicate fixture ids: ${[...new Set(duplicates)].join(", ")}`);
}

fs.writeFileSync(MANIFEST_FILE, JSON.stringify(manifest, null, 2) + "\n");

// Flat "what exists" list, grouped only by role — not by any external
// document's structure. This is not a checklist against roles.md; roles.md
// was only ever the seed used to originally populate this suite.
const byRole = new Map();
for (const entry of manifest) {
  if (!byRole.has(entry.role)) byRole.set(entry.role, []);
  byRole.get(entry.role).push(entry);
}

let coverage = `# Fixture Coverage

Every role currently covered by a fixture in this directory, generated from
\`fixtures/*/meta.json\` by \`scripts/build-fixtures-manifest.js\` — do not
hand-edit this file. Run \`npm run generate-fixtures-manifest\` after adding,
renaming, or removing a fixture.

| Role | Fixtures |
| --- | --- |
`;

for (const [role, entries] of [...byRole.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
  coverage += `| \`${role}\` | ${entries.map((e) => `\`${e.id}\``).join(", ")} |\n`;
}

coverage += `\n${manifest.length} fixtures across ${byRole.size} roles.\n`;

fs.writeFileSync(COVERAGE_FILE, coverage);

console.log(`Wrote manifest.json (${manifest.length} fixtures) and ROLES_COVERAGE.md (${byRole.size} roles).`);
