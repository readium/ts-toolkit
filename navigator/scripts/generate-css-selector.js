import { readFileSync, writeFileSync, mkdirSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const inputFile = join(__dirname, "..", "node_modules", "css-selector-generator", "build", "index.js");
const outputFile = join(__dirname, "..", "src", "dom", "_readium_cssSelectorGenerator.js");

try {
  // Read the original file
  let content = readFileSync(inputFile, "utf8");
  
  // Replace all occurrences of cssSelectorGenerator with _readium_cssSelectorGenerator, case-insensitive
  content = content.replace(/(_?)cssSelectorGenerator/gi, "_readium_cssSelectorGenerator");

  // Create the output directory if it doesn't exist
  mkdirSync(dirname(outputFile), { recursive: true });
  
  // Write the patched file
  writeFileSync(outputFile, content, "utf8");
  
  console.log("Successfully generated patched CSS Selector Generator");
} catch (error) {
  console.error("Failed to generate patched CSS Selector Generator:", error);
  process.exit(1);
}
