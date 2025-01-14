// (From swift-toolkit @ https://github.com/hypothesis/client/blob/main/src/annotator/highlighter.ts)

import { Locator, LocatorLocations, LocatorText } from "@readium/shared";
import type { getCssSelector } from "css-selector-generator";

type BlockedEventData = [0, Function, any[], any[]] | [1, Event, EventTarget];

export interface EPUBReadingSystem {
    name: string;
    version: string;
    layoutStyle: "paginated" | "scrolling"; // Technically, more are allowed
    hasFeature: (feature: string, version?: string) => boolean;
}

// This is what is injected into the HTML documents
export interface ReadiumWindow extends Window {
    _readium_blockEvents: boolean;
    _readium_blockedEvents: BlockedEventData[];
    _readium_eventBlocker: EventListenerOrEventListenerObject;
    _readium_cssSelectorGenerator: {
        getCssSelector: typeof getCssSelector;
    };
    navigator: Navigator & { epubReadingSystem: EPUBReadingSystem };
}

export function deselect(wnd: ReadiumWindow) {
    const currentSelection = wnd.getSelection();
    if(currentSelection) currentSelection.removeAllRanges();
}

const interactiveTags = [
    "a",
    "audio",
    "button",
    "canvas",
    "details",
    "input",
    "label",
    "option",
    "select",
    "submit",
    "textarea",
    "video",
];

// See https://github.com/JayPanoz/architecture/tree/touch-handling/misc/touch-handling
export function nearestInteractiveElement(element: Element): Element | null {
    if (interactiveTags.indexOf(element.nodeName.toLowerCase()) !== -1) {
        return element;
    }

    // Checks whether the element is editable by the user.
    if (
        element.hasAttribute("contenteditable") &&
        element.getAttribute("contenteditable")?.toLowerCase() !== "false"
    ) {
        return element;
    }

    // Checks parents recursively because the touch might be for example on an <em> inside a <a>.
    if (element.parentElement) {
        return nearestInteractiveElement(element.parentElement);
    }

    return null;
}

/// Returns the `Locator` object to the first block element that is visible on
/// the screen.
export function findFirstVisibleLocator(wnd: ReadiumWindow, scrolling: boolean) {
    const element = findElement(wnd, wnd.document.body, scrolling) as HTMLElement;
    
    // Use only the allowed selectors to generate the cssSelector and avoid a crash
    const cssSelector = wnd._readium_cssSelectorGenerator.getCssSelector(element, { 
        selectors: ["tag", "id", "class", "nthchild", "nthoftype", "attribute"] 
    });

    return new Locator({
        href: "#",
        type: "application/xhtml+xml",
        locations: new LocatorLocations({
            otherLocations: new Map([
                ["cssSelector", cssSelector]
            ])
        }),
        text: new LocatorText({
            highlight: element.textContent || undefined
        }),
    });
}

function findElement(wnd: ReadiumWindow, rootElement: Element, scrolling: boolean): Element {
    for (var i = 0; i < rootElement.children.length; i++) {
        const child = rootElement.children[i];
        if (!shouldIgnoreElement(child) && isElementVisible(wnd, child, scrolling)) {
            // Once we get a fully visible element, return it
            if (isElementFullyVisible(wnd, child)) return child;
            // if the parent is not fully visible, search in the childs
            return findElement(wnd, child, scrolling);
        }
    }
    return rootElement;
}

function isElementVisible(wnd: ReadiumWindow, element: Element, scrolling: boolean) {
    // if (readium.isFixedLayout) return true;

    if (element === document.body || element === document.documentElement) {
        return true;
    }
    if (!document || !document.documentElement || !document.body) {
        return false;
    }

    const rect = element.getBoundingClientRect();
    if (scrolling) {
        return rect.bottom > 0 && rect.top < wnd.innerHeight;
    } else {
        return rect.right > 0 && rect.left < wnd.innerWidth;
    }
}

/** 
* Check if an element is fully visible in the current viewport.
* @param wnd Window instance to operate on
* @param element Element to check visibility of
* @returns True if the element is fully visible, false otherwise
*/
function isElementFullyVisible(wnd: ReadiumWindow, element: Element): boolean {
    const rect = element.getBoundingClientRect();
    const isFullyVisible =
        rect.top >= 0 &&
        rect.left >= 0 &&
        rect.bottom <= wnd.innerHeight &&
        rect.right <= wnd.innerWidth;
    return isFullyVisible;
}

function shouldIgnoreElement(element: Element) {
    const elStyle = getComputedStyle(element);
    if (elStyle) {
        const display = elStyle.getPropertyValue("display");
        // Added list-item as it is a common display property for list items
        // TODO: Check if there are other display properties that should be ignored/considered
        if (display != "block" && display != "list-item") {
            return true;
        }
        // Cannot be relied upon, because web browser engine reports invisible when out of view in
        // scrolled columns!
        // const visibility = elStyle.getPropertyValue("visibility");
        // if (visibility === "hidden") {
        //     return false;
        // }
        const opacity = elStyle.getPropertyValue("opacity");
        if (opacity === "0") {
            return true;
        }
    }

    return false;
}