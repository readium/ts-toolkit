import { ReadiumWindow } from "./dom";

export function isRTL(wnd: ReadiumWindow): boolean {
    return wnd.document.body.dir.toLowerCase() === "rtl";
}

export function getColumnCountPerScreen(wnd: ReadiumWindow) {
    return parseInt(
        wnd.getComputedStyle(
            wnd.document.documentElement
        ).getPropertyValue("column-count")
    );
}

/**
 * We have to make sure that the total number of columns is a multiple 
 * of the number of columns per screen. 
 * Otherwise it causes snapping and page turning issues. 
 * To fix this, we insert and remove blank virtual columns at the end of the resource.
 */
export function appendVirtualColumnIfNeeded(wnd: ReadiumWindow) {
    const virtualCols = wnd.document.querySelectorAll("div[id^='readium-virtual-page']");
    // Remove first so that we don’t end up with an incorrect scrollWidth
    // Even when removing their width we risk having an incorrect scrollWidth
    // so removing them entirely is the most robust solution
    for (const virtualCol of virtualCols) {
        virtualCol.remove();
    }
    const colCount = getColumnCountPerScreen(wnd);
    const documentWidth = wnd.document.scrollingElement!.scrollWidth;
    const neededColCount = Math.ceil(documentWidth / wnd.innerWidth) * colCount;
    const totalColCount = Math.round((documentWidth / wnd.innerWidth) * colCount);
    const needed = colCount === 1 ? 0 : neededColCount - totalColCount;
    if (needed > 0) {
        for (let i = 0; i < needed; i++) {
            const virtualCol = wnd.document.createElement("div");
            virtualCol.setAttribute("id", `readium-virtual-page-${ i }`);
            virtualCol.dataset.readium = "true";
            virtualCol.style.breakBefore = "column";
            virtualCol.innerHTML = "&#8203;"; // zero-width space
            wnd.document.body.appendChild(virtualCol);
        }
    }
}