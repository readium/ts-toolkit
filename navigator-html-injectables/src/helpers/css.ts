import { ReadiumWindow } from "./dom";

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