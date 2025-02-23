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
    const colCount = getColumnCountPerScreen(wnd);
    const documentWidth = wnd.document.scrollingElement!.scrollWidth;
    const neededColCount = Math.ceil(documentWidth / wnd.innerWidth) * colCount;
    const totalColCount = Math.round((documentWidth / wnd.innerWidth) * colCount);
    const needed = colCount !== 1 ? neededColCount - totalColCount : 0;
    const virtualCols = wnd.document.querySelectorAll("div[id^='readium-virtual-page']");
    const currentCols = virtualCols.length;
    if (needed > currentCols) {
        for (let i = currentCols; i < needed; i++) {
            const virtualCol = wnd.document.createElement("div");
            virtualCol.setAttribute("id", `readium-virtual-page-${ i }`);
            virtualCol.dataset.readium = "true";
            virtualCol.style.breakBefore = "column";
            virtualCol.innerHTML = "&#8203;"; // zero-width space
            wnd.document.body.appendChild(virtualCol);
        }
    } else if (needed < currentCols) {
        for (let i = currentCols - 1; i >= needed; i--) {
            virtualCols[i].remove();
        }
    }
}
