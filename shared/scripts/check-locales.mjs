import { readFile, readdir } from 'node:fs/promises';
import { dirname, join, basename } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const localesPath = join(__dirname, '..', 'node_modules', '@edrlab', 'thorium-locales', 'publication-metadata');


function countKeys(obj) {
  let count = 0;
  for (const [key, value] of Object.entries(obj)) {
    count++;
    if (typeof value === 'object' && value !== null) {
      count += countKeys(value);
    }
  }
  return count;
}

function checkMissing(enObj, localeObj) {
  let missing = [];
  for (const [key, value] of Object.entries(enObj)) {
    if (typeof value === 'object' && value !== null) {
      missing = missing.concat(checkMissing(value, localeObj?.[key] || {}));
    } else if (!(key in (localeObj || {}))) {
      missing.push(key);
    }
  }
  return missing;
}

async function main() {
  const files = await readdir(localesPath);
  const localeFiles = files.filter(file => file.endsWith('.json') && file !== 'en.json');

  const enContent = await readFile(join(localesPath, 'en.json'), 'utf-8');
  const enData = JSON.parse(enContent);
  const enDisplayGuide = enData?.publication?.metadata?.accessibility?.['display-guide'];
  const totalKeys = countKeys(enDisplayGuide);

  console.log('📊 Localization Completion');
  console.log('='.repeat(30));

  const results = [];

  for (const file of localeFiles) {
    const localeCode = basename(file, '.json');
    
    try {
      const content = await readFile(join(localesPath, file), 'utf-8');
      const data = JSON.parse(content);
      const displayGuide = data?.publication?.metadata?.accessibility?.['display-guide'];
      
      if (!displayGuide) {
        results.push({ localeCode, percentage: 0, present: 0, status: '❌' });
        continue;
      }
      
      const missing = checkMissing(enDisplayGuide, displayGuide);
      const present = totalKeys - missing.length;
      const percentage = Math.round((present / totalKeys) * 100);
      const status = percentage === 100 ? '✅' : percentage > 0 ? '🔄' : '❌';
      
      results.push({ localeCode, percentage, present, status });
      
    } catch (error) {
      results.push({ localeCode, percentage: -1, present: 0, status: '❌' });
    }
  }

  results.sort((a, b) => {
    if (a.percentage !== b.percentage) {
      return b.percentage - a.percentage;
    }
    return a.localeCode.localeCompare(b.localeCode);
  });

  const enBar = '■'.repeat(20);
  console.log(`✅ en    : ${enBar} 100% (${totalKeys}/${totalKeys})`);

  const completedLocales = results.filter(r => r.percentage === 100);

  for (const result of results) {
    if (result.percentage === -1) {
      console.log(`${result.status} ${result.localeCode.padEnd(6)}: ERROR`);
    } else {
      const bar = result.percentage === 0 ? '□'.repeat(20) : '■'.repeat(Math.round(result.percentage / 5)) + '□'.repeat(20 - Math.round(result.percentage / 5));
      const percentageStr = result.percentage.toString().padStart(3);
      console.log(`${result.status} ${result.localeCode.padEnd(6)}: ${bar} ${percentageStr}% (${result.present}/${totalKeys})`);
    }
  }

  if (completedLocales.length > 0) {
    const allCompleted = ['en', ...completedLocales.map(r => r.localeCode)];
    console.log('\n✅ Completed languages: [' + allCompleted.map(c => `"${c}"`).join(', ') + ']\n');
  }
}

main().catch(console.error);
