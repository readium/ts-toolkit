import { DomRangePoint, getCssSelector, getDomRange, getTextFragment, Locator, LocatorLocations } from "@readium/shared";
import { processTextFragmentDirective } from "@readium/helpers";
import { TextQuoteAnchor } from "../vendor/hypothesis/anchoring/types.ts";

function isReplacedLikeElement(element: Element): boolean {
    const tagName = element.tagName.toUpperCase();
    return tagName === "IMG" || tagName === "VIDEO" || tagName === "AUDIO" || tagName === "IFRAME" || tagName === "OBJECT" || tagName === "EMBED" || tagName === "CANVAS";
}

// Root used for text-based searches: the cssSelector-referenced element when
// present and resolvable, otherwise the whole document body.
function resolveTextSearchRoot(doc: Document, locations: LocatorLocations | undefined): Element {
    const cssSelector = locations && getCssSelector(locations);
    const root = cssSelector ? doc.querySelector(cssSelector) : null;
    return root ?? doc.body;
}

function resolveDomRangePoint(doc: Document, point: DomRangePoint): { node: Text; offset?: number } | null {
    const container = doc.querySelector(point.cssSelector);
    if (!container) {
        console.error(`Can't resolve domRange cssSelector: ${point.cssSelector}`);
        return null;
    }

    const walker = doc.createTreeWalker(container, NodeFilter.SHOW_TEXT);
    let index = 0;
    let node: Node | null;
    while ((node = walker.nextNode())) {
        if (index === point.textNodeIndex) {
            return { node: node as Text, offset: point.charOffset };
        }
        index++;
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

        // Tried before text.highlight for the same reason as domRange: a
        // ":~:text=" fragment is a strict superset of what text.highlight can
        // express (it also supports a textStart...textEnd range), so checking
        // text.highlight first would mean this branch is rarely reached.
        if (locations) {
            const fragmentDirective = getTextFragment(locations);

            if (fragmentDirective) {
                const root = resolveTextSearchRoot(doc, locations);
                const results = processTextFragmentDirective(fragmentDirective, doc, root);
                if (results.length > 0) {
                    return results[0]!;
                }
            }
        }

        if (text && text.highlight) {
            const root = resolveTextSearchRoot(doc, locations);

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
