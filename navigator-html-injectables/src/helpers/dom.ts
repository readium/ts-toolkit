// (From swift-toolkit @ https://github.com/hypothesis/client/blob/main/src/annotator/highlighter.ts)

import { Locator, LocatorLocations, LocatorText } from "@readium/shared/src";
import type { getCssSelector } from "css-selector-generator";

type BlockedEventData = [0, Function, any[], any[]] | [1, Event];

// This is what is injected into the HTML documents
export interface ReadiumWindow extends Window {
    _readium_blockEvents: boolean;
    _readium_blockedEvents: BlockedEventData[];
    _readium_eventBlocker: EventListenerOrEventListenerObject;
    _readium_cssSelectorGenerator: {
        getCssSelector: typeof getCssSelector;
    };
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
    const element = findElement(wnd.document.body, scrolling);
    return new Locator({
        href: "#",
        type: "application/xhtml+xml",
        locations: new LocatorLocations({
            otherLocations: new Map([
                ["cssSelector", wnd._readium_cssSelectorGenerator.getCssSelector(element)]
            ])
        }),
        text: new LocatorText({
            highlight: element.textContent || undefined
        }),
    });
}

function findElement(rootElement: Element, scrolling: boolean): Element {
    for (var i = 0; i < rootElement.children.length; i++) {
        const child = rootElement.children[i];
        if (!shouldIgnoreElement(child) && isElementVisible(child, scrolling)) {
            return findElement(child, scrolling);
        }
    }
    return rootElement;
}

function isElementVisible(element: Element, scrolling: boolean) {
    // if (readium.isFixedLayout) return true;

    if (element === document.body || element === document.documentElement) {
        return true;
    }
    if (!document || !document.documentElement || !document.body) {
        return false;
    }

    const rect = element.getBoundingClientRect();
    if (scrolling) {
        return rect.bottom > 0 && rect.top < window.innerHeight;
    } else {
        return rect.right > 0 && rect.left < window.innerWidth;
    }
}

function shouldIgnoreElement(element: Element) {
    const elStyle = getComputedStyle(element);
    if (elStyle) {
        const display = elStyle.getPropertyValue("display");
        if (display != "block") {
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