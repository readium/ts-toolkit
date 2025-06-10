import { ReadiumWindow } from "./dom";

export function isRTL(wnd: ReadiumWindow): boolean {
    return wnd.document.body.dir.toLowerCase() === "rtl";
}

export function getColumnCountPerScreen(wnd: ReadiumWindow): number {
    return parseInt(
        wnd.getComputedStyle(
            wnd.document.documentElement
        ).getPropertyValue("column-count")
    );
}

/** 
* Returns the "content height" of an element, which is its clientHeight
* minus any vertical padding.
*
* @param el - The element to measure.
*/
export function getContentHeight(el: Element): number {
 const cStyle = getComputedStyle(el);
 const paddingTop = parseFloat(cStyle.paddingTop || "0");
 const paddingBottom = parseFloat(cStyle.paddingBottom || "0");
 return el.clientHeight - paddingTop - paddingBottom;
}

/**
 * We have to make sure that the total number of columns is a multiple 
 * of the number of columns per screen. 
 * Otherwise it causes snapping and page turning issues. 
 * To fix this, we insert and remove blank virtual columns at the end of the resource.
 */
export function appendVirtualColumnIfNeeded(wnd: ReadiumWindow): boolean {
    const colCountPerScreen = getColumnCountPerScreen(wnd);

    if (!colCountPerScreen) {
        // This has been triggered while in scroll mode
        return false;
    }

    const virtualCols = wnd.document.querySelectorAll("div[id^='readium-virtual-page']");
    // Remove first so that we don’t end up with an incorrect scrollWidth
    // Even when removing their width we risk having an incorrect scrollWidth
    // so removing them entirely is the most robust solution
    for (const virtualCol of virtualCols) {
        virtualCol.remove();
    }
    const virtualColsCount = virtualCols.length

    const documentWidth = wnd.document.scrollingElement!.scrollWidth;
    const windowWidth = wnd.visualViewport!.width

    const totalColCount = Math.round((documentWidth / windowWidth) * colCountPerScreen);

    const lonelyColCount = totalColCount % colCountPerScreen;

    const needed = colCountPerScreen === 1 || lonelyColCount === 0
        ? 0 
        : colCountPerScreen - lonelyColCount;

    if (needed > 0) {
        for (let i = 0; i < needed; i++) {
            const virtualCol = wnd.document.createElement("div");
            virtualCol.setAttribute("id", `readium-virtual-page-${ i }`);
            virtualCol.dataset.readium = "true";
            if (CSS.supports("break-before", "column")) {
                virtualCol.style.breakBefore = "column";
            } else if (CSS.supports("break-inside", "avoid-column")) {
                virtualCol.style.breakInside = "avoid-column";
                virtualCol.style.height = getContentHeight(wnd.document.documentElement) + "px";
            } else {
                virtualCol.style.height = getContentHeight(wnd.document.documentElement) + "px";
            }
            virtualCol.innerHTML = "&#8203;"; // zero-width space
            wnd.document.body.appendChild(virtualCol);
        }
    }

    return virtualColsCount !== needed;
}