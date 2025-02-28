import { ReadiumWindow } from "./dom";

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