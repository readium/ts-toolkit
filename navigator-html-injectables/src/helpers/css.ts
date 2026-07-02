import { ReadiumWindow } from "./dom.ts";

const COSMETIC_PROPERTIES = new Set([
    "backgroundColor", "textColor",
    "linkColor", "visitedColor",
    "primaryColor", "secondaryColor",
    "selectionBackgroundColor", "selectionTextColor",
    "blendFilter", "darkenFilter", "invertFilter", "invertGaiji",
]);

const CSS_PROP_RE = /--(?:USER|RS)__([\w-]+)/g;

/**
 * Returns true if the style attribute change between oldValue and newValue
 * includes at least one ReadiumCSS property that affects document layout/geometry.
 * Pure appearance changes (colors, filters) return false.
 */
export function styleChangeAffectsLayout(oldValue: string | null, newValue: string | null): boolean {
    const old_ = oldValue ?? "";
    const new_ = newValue ?? "";
    const seen = new Set<string>();

    for (const match of old_.matchAll(CSS_PROP_RE)) seen.add(match[1]);
    for (const match of new_.matchAll(CSS_PROP_RE)) seen.add(match[1]);

    for (const suffix of seen) {
        if (!COSMETIC_PROPERTIES.has(suffix)) return true;
    }
    return false;
}

export function getProperties(wnd: ReadiumWindow) {
    const cssProperties: { [key: string]: string } = {};

    const rootStyle = wnd.document.documentElement.style;

    for (const prop in wnd.document.documentElement.style) {
        // We check if the property belongs to the CSSStyleDeclaration instance
        // We also ensure that the property is a numeric index (indicating an inline style)
        if (
            Object.hasOwn(rootStyle, prop) &&
            !Number.isNaN(Number.parseInt(prop))
        ) {
            cssProperties[rootStyle[prop]] = rootStyle.getPropertyValue(rootStyle[prop]);
        }
    }

    return cssProperties;
}

export function updateProperties(wnd: ReadiumWindow, properties: { [key: string]: string }) {
    const currentProperties = getProperties(wnd);

    // Remove properties
    Object.keys(currentProperties).forEach((key) => {
        if (!properties.hasOwnProperty(key)) {
            removeProperty(wnd, key);
        }
    });

    // Update properties
    Object.entries(properties).forEach(([key, value]) => {
        if (currentProperties[key] !== value) {
            setProperty(wnd, key, value);
        }
    });
}

// Easy way to get a CSS property
export function getProperty(wnd: ReadiumWindow, key: string) {
    return wnd.document.documentElement.style.getPropertyValue(key);
}

// Easy way to set a CSS property
export function setProperty(wnd: ReadiumWindow, key: string, value: string) {
    wnd.document.documentElement.style.setProperty(key, value);
}

// Easy way to remove a CSS property
export function removeProperty(wnd: ReadiumWindow, key: string) {
    wnd.document.documentElement.style.removeProperty(key);
}
