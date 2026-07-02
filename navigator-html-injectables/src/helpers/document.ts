import { ReadiumWindow } from "./dom.ts";

export function isRTL(wnd: ReadiumWindow): boolean {
    // Check documentElement first, then fall back to body.
    const dir = wnd.document.documentElement.dir || wnd.document.body.dir;
    return dir.toLowerCase() === "rtl";
}

export function isVerticalLR(wnd: ReadiumWindow): boolean {
    // Check documentElement first, then fall back to body.
    const writingMode = wnd.getComputedStyle(wnd.document.documentElement).writingMode
        || wnd.getComputedStyle(wnd.document.body).writingMode;
    return writingMode === 'vertical-lr';
}

export function isVerticalWriting(wnd: ReadiumWindow): boolean {
    const writingMode = wnd.getComputedStyle(wnd.document.documentElement).writingMode
        || wnd.getComputedStyle(wnd.document.body).writingMode;
    return writingMode === 'vertical-rl' || writingMode === 'vertical-lr';
}

/**
 * Axis-normalizing context for decoration layout.
 *
 * Translates CSS physical properties into logical inline/block terms so that
 * callers can position elements identically regardless of writing mode:
 *
 *   horizontal writing  →  inline = horizontal, block = vertical
 *   vertical writing    →  inline = vertical,   block = horizontal
 */
export interface WritingContext {
    isVertical: boolean;
    isVertLR: boolean;
    /** Viewport size along the inline axis (innerWidth / innerHeight). */
    viewportInlineSize: number;
    /** Viewport size along the block axis (innerHeight / innerWidth). */
    viewportBlockSize: number;
    /**
     * Size of a single page along the inline axis.
     * Horizontal: viewportWidth / columnCount.
     * Vertical: viewportHeight (no columns).
     */
    pageInlineSize: number;
    /**
     * Physical x offset to add to a client-space x coordinate to get document space.
     * Horizontal: scrollLeft (non-negative).
     * Vertical-rl: scrollWidth − viewportWidth + scrollLeft (scrollLeft is negative,
     *   so this normalises it to the viewport's left edge in document coordinates).
     * Vertical-lr: scrollLeft (non-negative, same as horizontal).
     */
    xDocOffset: number;
    /** Physical y offset to add to a client-space y coordinate to get document space (scrollTop). */
    yDocOffset: number;
    /** Scroll offset along the inline axis, derived from xDocOffset / yDocOffset. */
    inlineScrollOffset: number;
    /** Scroll offset along the block axis, derived from xDocOffset / yDocOffset. */
    blockScrollOffset: number;

    /** Logical inline start of a rect (left / top). */
    inlineStart(r: DOMRect | { top: number; left: number }): number;
    /** Logical block start of a rect (top / left). */
    blockStart(r: DOMRect | { top: number; left: number }): number;
    /** Logical inline size of a rect (width / height). */
    inlineSize(r: DOMRect | { width: number; height: number }): number;
    /** Logical block size of a rect (height / width). */
    blockSize(r: DOMRect | { width: number; height: number }): number;

    /**
     * Set absolute position on an element using logical coordinates.
     * `iz` is the inverse zoom factor (1 in non-Blink, 1/zoom in Blink).
     */
    applyPosition(el: HTMLElement, inlineStart: number, blockStart: number, inlineSize: number, blockSize: number, iz: number): void;

    /** Convert logical coordinates back to a physical DOMRect. */
    toRect(inlineStart: number, blockStart: number, inlineSize: number, blockSize: number): DOMRect;
}

export function makeWritingContext(wnd: ReadiumWindow): WritingContext {
    const isVert = isVerticalWriting(wnd);
    const isVLR  = isVert && isVerticalLR(wnd);
    const vw     = wnd.innerWidth;
    const vh     = wnd.innerHeight;
    const se     = wnd.document.scrollingElement!;
    const xOff   = se.scrollLeft;   // negative for vertical-rl, non-negative otherwise
    const yOff   = se.scrollTop;
    const cols   = parseInt(wnd.getComputedStyle(wnd.document.documentElement).getPropertyValue("column-count"));

    // In vertical-rl, scrollLeft starts at 0 (document start = right side) and goes
    // negative as the reader scrolls left. The viewport's left edge in document space
    // is therefore (scrollWidth − viewportWidth + scrollLeft). For vertical-lr and
    // horizontal modes, scrollLeft is non-negative and is the offset directly.
    const xDocOffset = (isVert && !isVLR)
        ? se.scrollWidth - vw + xOff
        : xOff;
    const yDocOffset = yOff;

    return {
        isVertical:          isVert,
        isVertLR:            isVLR,
        viewportInlineSize:  isVert ? vh : vw,
        viewportBlockSize:   isVert ? vw : vh,
        pageInlineSize:      isVert ? vh : vw / (cols || 1),
        xDocOffset,
        yDocOffset,
        inlineScrollOffset:  isVert ? yDocOffset : xDocOffset,
        blockScrollOffset:   isVert ? xDocOffset : yDocOffset,

        inlineStart: (r) => isVert ? r.top  : r.left,
        blockStart:  (r) => isVert ? r.left : r.top,
        inlineSize:  (r) => isVert ? r.height : r.width,
        blockSize:   (r) => isVert ? r.width  : r.height,

        applyPosition(el, inlineStart, blockStart, inlineSize, blockSize, iz) {
            el.style.position = "absolute";
            if (isVert) {
                el.style.top    = `${inlineStart * iz}px`;
                el.style.left   = `${blockStart  * iz}px`;
                el.style.height = `${inlineSize  * iz}px`;
                el.style.width  = `${blockSize   * iz}px`;
            } else {
                el.style.left   = `${inlineStart * iz}px`;
                el.style.top    = `${blockStart  * iz}px`;
                el.style.width  = `${inlineSize  * iz}px`;
                el.style.height = `${blockSize   * iz}px`;
            }
        },

        toRect(inlineStart, blockStart, inlineSize, blockSize) {
            return isVert
                ? new DOMRect(blockStart, inlineStart, blockSize, inlineSize)
                : new DOMRect(inlineStart, blockStart, inlineSize, blockSize);
        },
    };
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

/**
 * This forces a recalculation in WebKit browsers.
 * It is needed in scroll mode to ensure that the content is scrollable.
 * Webkit seems to find itself in some kind of limbo if we do not do that.
 * It has everything correct but the scroll listener is non-functional,
 * unless you force a recalc or reflow.
 * It is not needed in paginated mode.
 */
export function forceWebkitRecalc(wnd: ReadiumWindow) {
    // Borrowed from APB themselves…
    const styleElement = wnd.document.createElement("style");
    styleElement.appendChild(wnd.document.createTextNode("*{}"));
    wnd.document.body.appendChild(styleElement);
    wnd.document.body.removeChild(styleElement);
}
