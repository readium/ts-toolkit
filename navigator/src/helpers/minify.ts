/**
 * Utilities for processing CSS and JavaScript content
 */

/**
 * Minifies JavaScript by removing comments and normalizing whitespace
 */
export const stripJS = (source: string) => source.replace(/\/\/.*/g, "").replace(/\/\*[\s\S]*?\*\//g, "").replace(/\n/g, "").replace(/\s+/g, " ");

/**
 * Minifies CSS by removing comments and normalizing whitespace
 * Note: URL resolution should be handled by the caller with correct context
 */
export const stripCSS = (source: string) => source.replace(/\/\*(?:(?!\*\/)[\s\S])*\*\/|[\r\n\t]+/g, "").replace(/ {2,}/g, " ");
