import { getCssSelector, Locator } from "@readium/shared";
import { TextQuoteAnchor } from "../vendor/hypothesis/anchoring/types.ts";

function isReplacedLikeElement(element: Element): boolean {
    const tagName = element.tagName.toUpperCase();
    return tagName === "IMG" || tagName === "VIDEO" || tagName === "AUDIO" || tagName === "IFRAME" || tagName === "OBJECT" || tagName === "EMBED" || tagName === "CANVAS";
}

// Based on the kotlin-toolkit code
export function rangeFromLocator(doc: Document, locator: Locator) {
    try {
        const locations = locator.locations;
        const text = locator.text;
        if (text && text.highlight) {
            let root;
            if (locations && getCssSelector(locations)) {
                root = doc.querySelector(getCssSelector(locations)!);
            }
            if (!root) {
                root = doc.body;
            }

            const anchor = new TextQuoteAnchor(root, text.highlight, {
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
            let element = null;

            if (!element && getCssSelector(locations)) {
                element = doc.querySelector(getCssSelector(locations)!);
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
                const range = doc.createRange();

                if (element.childNodes.length === 0 || isReplacedLikeElement(element)) {
                    range.selectNode(element);
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
