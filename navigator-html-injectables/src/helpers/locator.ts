import { Locator } from "@readium/shared/src/publication";
import { TextQuoteAnchor } from "../vendor/hypothesis/anchoring/types";

// Based on the kotlin-toolkit code
export function rangeFromLocator(doc: Document, locator: Locator) {
    try {
      let locations = locator.locations;
      let text = locator.text;
      if (text && text.highlight) {
        let root;
        if (locations && locations.getCssSelector()) {
          root = doc.querySelector(locations.getCssSelector()!);
        }
        if (!root) {
          root = doc.body;
        }
  
        let anchor = new TextQuoteAnchor(root, text.highlight, {
          prefix: text.before,
          suffix: text.after,
        });
        try {
          return anchor.toRange();
        } catch (error) {
          // We don't watch to "crash" when the quote is not found
          console.warn("Quote not found:", anchor);
          return null;
        }
      }
  
      if (locations) {
        var element = null;
  
        if (!element && locations.getCssSelector()) {
          element = doc.querySelector(locations.getCssSelector()!);
        }
  
        if (!element && locations.fragments) {
          for (const htmlId of locations.fragments) {
            element = doc.getElementById(htmlId);
            if (element) {
              break;
            }
          }
        }
  
        if (element) {
          let range = doc.createRange();

          // This is a special case where the node is
          // a single element with no children. Not sure
          // yet how effective this is yet, may remove in future.
          if(element.childNodes.length === 0) {
            range.selectNodeContents(element);
            return range;
          }

          range.setStartBefore(element);
          range.setEndAfter(element);
          return range;
        }
      }
    } catch (e) {
      console.error(e);
    }
    return null;
  }