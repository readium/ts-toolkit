import { writeFile, mkdir } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { rimraf } from 'rimraf';

const __dirname = dirname(fileURLToPath(import.meta.url));
const destDir = join(__dirname, '../src/locales/publication-metadata');
const API_URL = 'https://api.github.com/repos/edrlab/thorium-locales/contents/publication-metadata';

const listResponse = await fetch(API_URL, {
  headers: { 'Accept': 'application/vnd.github+json', 'User-Agent': 'ts-toolkit' }
});

if (!listResponse.ok) {
  console.error(`GitHub API request failed: ${listResponse.status} ${listResponse.statusText}`);
  process.exit(1);
}

const entries = await listResponse.json();

if (!Array.isArray(entries)) {
  console.error('Unexpected GitHub API response:', entries);
  process.exit(1);
}

await rimraf(destDir);
await mkdir(destDir, { recursive: true });

for (const file of entries.filter(f => f.name.endsWith('.json'))) {
  const fileResponse = await fetch(file.download_url);
  if (!fileResponse.ok) {
    console.error(`Failed to download ${file.name}: ${fileResponse.status} ${fileResponse.statusText}`);
    process.exit(1);
  }
  const content = await fileResponse.text();
  await writeFile(join(destDir, file.name), content, 'utf-8');
  console.log(`  ✓ ${file.name}`);
}

console.log('\nDone. Run check-locales to see coverage.');
