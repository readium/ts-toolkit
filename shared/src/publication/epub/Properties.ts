import { Properties } from '../Properties.ts';

// EPUB extensions for link Properties.
// https://readium.org/webpub-manifest/schema/extensions/epub/properties.schema.json

export function getContains(properties: Properties): Set<string> {
  return new Set<string>(properties.otherProperties['contains'] || []);
}
