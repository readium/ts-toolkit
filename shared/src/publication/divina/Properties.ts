import { Properties } from "../Properties";

// Divina extensions for link [Properties].
// https://github.com/readium/webpub-manifest/blob/master/schema/extensions/divina/properties.schema.json

declare module '../Properties' {
  export interface Properties {
    /**
     * Specifies that an item in the reading order should break the current continuous scroll 
     * and start a new one.
     */
    getBreakScrollBefore(): boolean;
  }
}

Properties.prototype.getBreakScrollBefore = function(): boolean {
  return this.otherProperties['break-scroll-before'] ?? false;
};