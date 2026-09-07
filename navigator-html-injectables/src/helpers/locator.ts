import { DomRangePoint, getCssSelector, getDomRange, Locator } from "@readium/shared";
import { TextQuoteAnchor } from "../vendor/hypothesis/anchoring/types.ts";

function isReplacedLikeElement(element: Element): boolean {
    const tagName = element.tagName.toUpperCase();
    return tagName === "IMG" || tagName === "VIDEO" || tagName === "AUDIO" || tagName === "IFRAME" || tagName === "OBJECT" || tagName === "EMBED" || tagName === "CANVAS";
}

function resolveDomRangePoint(doc: Document, point: DomRangePoint): { node: Text; offset?: number } | null {
    const container = doc.querySelector(point.cssSelector);
    if (!container) {
        console.error(`Can't resolve domRange cssSelector: ${point.cssSelector}`);
        return null;
    }

    let index = 0;
    for (const child of Array.from(container.childNodes)) {
        if (child.nodeType === Node.TEXT_NODE) {
            if (index === point.textNodeIndex) {
                return { node: child as Text, offset: point.charOffset };
            }
            index++;
        }
    }

    console.error(`Can't resolve domRange textNodeIndex ${point.textNodeIndex} for selector: ${point.cssSelector}`);
    return null;
}

// Based on the kotlin-toolkit code
export function rangeFromLocator(doc: Document, locator: Locator) {
    try {
        const locations = locator.locations;
        const text = locator.text;

        // Tried before text.highlight: a domRange pinpoints an exact node/offset,
        // which disambiguates between multiple occurrences of the same quote that
        // a text-based search alone cannot tell apart.
        if (locations) {
            const domRange = getDomRange(locations);
            if (domRange) {
                const start = resolveDomRangePoint(doc, domRange.start);
                const end = domRange.end ? resolveDomRangePoint(doc, domRange.end) : start;
                if (start && end) {
                    const range = doc.createRange();

                    if (start.offset !== undefined) {
                        range.setStart(start.node, start.offset);
                    } else {
                        range.setStartBefore(start.node);
                    }

                    if (end.offset !== undefined) {
                        range.setEnd(end.node, end.offset);
                    } else {
                        range.setEndBefore(end.node);
                    }

                    return range;
                }
            }
        }

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
