import { Locator } from "@readium/shared/src";
import { TextQuoteAnchor } from "../vendor/hypothesis/anchoring/types";

// From the kotlin-toolkit code
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
        return anchor.toRange();
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