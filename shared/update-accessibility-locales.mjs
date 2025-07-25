import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { promises as fs } from 'fs';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const TARGET_DIR = join(__dirname, 'src', 'publication', 'accessibility', 'locales');
const THORIUM_LOCALES_REPO = 'https://github.com/edrlab/thorium-locales.git';
const THORIUM_LOCALES_DIR = join(__dirname, 'temp-thorium-locales');

function cloneOrUpdateRepo() {
  return fs.access(THORIUM_LOCALES_DIR)
    .then(() => {
      console.log('Updating thorium-locales repository...');
      return execAsync('git pull', { cwd: THORIUM_LOCALES_DIR });
    })
    .catch(() => {
      console.log('Cloning thorium-locales repository...');
      return execAsync(`git clone ${THORIUM_LOCALES_REPO} ${THORIUM_LOCALES_DIR}`);
    });
}

function extractAccessibilityLocales() {
  // Ensure target directory exists
  return fs.mkdir(TARGET_DIR, { recursive: true })
    .then(() => {
      // Read all JSON files in the publication-metadata directory
      const sourceDir = join(THORIUM_LOCALES_DIR, 'publication-metadata');
      return fs.readdir(sourceDir)
        .then(files => files.filter(file => file.endsWith('.json')))
        .then(files => {
          const processFile = (index) => {
            if (index >= files.length) {
              console.log('Extraction completed successfully!');
              return Promise.resolve();
            }
            
            const file = files[index];
            const langCode = file.replace('.json', '');
            const filePath = join(sourceDir, file);
            
            // Read and parse the source file
            return fs.readFile(filePath, 'utf-8')
              .then(content => {
                let data;
                try {
                  data = JSON.parse(content);
                } catch (e) {
                  console.error(`Error parsing ${file}:`, e);
                  return processFile(index + 1);
                }
                
                // Extract the accessibility.display-guide part
                const accessibilityData = data && 
                                        data.publication && 
                                        data.publication.metadata &&
                                        data.publication.metadata.accessibility &&
                                        data.publication.metadata.accessibility['display-guide'];
                
                if (accessibilityData) {
                  // Create the output file path
                  const outputFile = join(TARGET_DIR, `${langCode}.json`);
                  
                  // Write the extracted data to the new file
                  return fs.writeFile(
                    outputFile,
                    JSON.stringify(accessibilityData, null, 2) + '\n',
                    'utf-8'
                  )
                  .then(() => {
                    console.log(`Extracted ${langCode} accessibility strings to ${outputFile}`);
                    return processFile(index + 1);
                  });
                } else {
                  console.warn(`No accessibility strings found in ${file}`);
                  return processFile(index + 1);
                }
              });
          };
          
          return processFile(0);
        });
    })
    .catch(error => {
      console.error('Error extracting accessibility locales:', error);
      process.exit(1);
    });
}

function cleanup() {
  // Remove the temporary directory
  return fs.rm(THORIUM_LOCALES_DIR, { recursive: true, force: true })
    .catch(error => {
      console.warn('Error during cleanup:', error);
    });
}

// Main execution
cloneOrUpdateRepo()
  .then(extractAccessibilityLocales)
  .then(cleanup)
  .catch(error => {
    console.error('An error occurred:', error);
    process.exit(1);
  });
