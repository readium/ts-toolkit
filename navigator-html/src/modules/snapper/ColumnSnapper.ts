import { Comms } from "../../comms";
import { Snapper } from "./Snapper";
import { getColumnCountPerScreen, isRTL } from "../../helpers/document";

/**
 * Having an odd number of columns when displaying two columns per screen causes snapping and page
 * turning issues. To fix this, we insert a blank virtual column at the end of the resource.
 */
 function appendVirtualColumnIfNeeded(wnd: Window) {
    const id = "readium-virtual-page";
    let virtualCol = wnd.document.getElementById(id);
    if (getColumnCountPerScreen(wnd) !== 2) {
        if (virtualCol) {
            virtualCol.remove();
        }
    } else {
        const documentWidth = wnd.document.scrollingElement!.scrollWidth;
        const colCount = documentWidth / wnd.innerWidth;
        const hasOddColCount = (Math.round(colCount * 2) / 2) % 1 > 0.1;
        if (hasOddColCount) {
            if (virtualCol)
                virtualCol.remove();
            else {
                virtualCol = wnd.document.createElement("div");
                virtualCol.setAttribute("id", id);
                virtualCol.style.breakBefore = "column";
                virtualCol.innerHTML = "&#8203;"; // zero-width space
                wnd.document.body.appendChild(virtualCol);
            }
        }
    }
}

enum ScrollTouchState {
    END = 0,
    START = 1,
    MOVE = 2
}

const SNAPPER_STYLE_ID = "readium-column-snapper-style";

/**
 * A {Snapper} for reflowable resources using a column-based layout
 */
export class ColumnSnapper extends Snapper {
    static readonly moduleName = "column_snapper";
    private observer!: ResizeObserver;
    private wnd!: Window;
    private comms!: Comms;

    snapOffset(offset: number) {
        const value = offset + (isRTL(this.wnd) ? -1 : 1);
        return value - (value % this.wnd.innerWidth);
    }

    // Snaps the current offset to the page width.
    snapCurrentOffset(usingScrollTo=false) {
        const currentOffset = this.wnd.scrollX;
        // Adds half a page to make sure we don't snap to the previous page.
        const factor = isRTL(this.wnd) ? -1 : 1;
        var delta = factor * (this.wnd.innerWidth / 2);
        if(usingScrollTo)
            this.wnd.document.scrollingElement?.scrollTo({
                left: this.snapOffset(currentOffset + delta),
                behavior: "smooth"
            });
        else
            this.wnd.document.scrollingElement!.scrollLeft = this.snapOffset(currentOffset + delta);
    }

    // Current touch state cycler, to assist with swipe detection etc.
    private touchState: ScrollTouchState = ScrollTouchState.END;
    private startingTouch: Touch | undefined = undefined;
    private endingTouch: Touch | undefined = undefined;

    onTouchStart(e: TouchEvent) {
        e.stopPropagation();
        switch (e.touches.length) {
            case 1:
                break; // Single finger
            case 2:
                return; // TODO pinch?
            default:
                this.comms.send("tap_more", e.touches.length);
        }

        this.startingTouch = e.touches[0];
        this.touchState = ScrollTouchState.START;
        this.wnd.document.body.style.removeProperty("overflow-x");
    }
    private readonly onTouchStarter = this.onTouchStart.bind(this);

    onTouchEnd(e: TouchEvent) {
        if(this.touchState === ScrollTouchState.MOVE) {
            // Get the horizontal drag distance
            const dragOffset = (this.startingTouch?.pageX ?? 0) - (this.endingTouch?.pageX ?? 0);

            const scrollWidth = this.wnd.document.scrollingElement?.scrollWidth!;
            const scrollOffset = this.wnd.document.scrollingElement?.scrollLeft!;
            if(scrollWidth <= this.wnd.innerWidth) {
                // Only a single page, meaning any swipe triggers next/prev
                if(dragOffset > 5) this.comms.send("no_more", undefined);
                if(dragOffset < -5) this.comms.send("no_less", undefined);
                return;
            } else if(scrollOffset < 5 && dragOffset < 5) {
                this.comms.send("no_less", undefined);
                return;
            } else if((scrollWidth - scrollOffset - this.wnd.innerWidth) < 5 && dragOffset > 5) {
                this.comms.send("no_more", undefined);
                return;
            }

            this.wnd.setTimeout(() => {
                if(this.touchState !== ScrollTouchState.END)
                    return;
                this.wnd.document.body.style.overflowX = "hidden";
                this.snapCurrentOffset(true);
                this.wnd.setTimeout(() => {
                    this.wnd.document.body.style.removeProperty("overflow-x");
                    if(this.touchState === ScrollTouchState.END)
                        this.snapCurrentOffset(true); // Do it again
                }, 50);
            }, 50);
            this.startingTouch = undefined;
            this.comms.send("swipe", dragOffset);
        }
        this.touchState = ScrollTouchState.END;
    }
    private readonly onTouchEnder = this.onTouchEnd.bind(this);

    onTouchMove(e: TouchEvent) {
        if(this.touchState === ScrollTouchState.START)
            this.touchState = ScrollTouchState.MOVE;
        this.endingTouch = e.touches[0];
    }
    private readonly onTouchMover = this.onTouchMove.bind(this);

    mount(wnd: Window, comms: Comms): boolean {
        this.wnd = wnd;
        this.comms = comms;
        if(!super.mount(wnd, comms)) return false;

        // Add styling to hide the scrollbar
        const d = wnd.document.createElement("style");
        d.id = SNAPPER_STYLE_ID;
        d.textContent = `
        body {
            -ms-overflow-style: none; /* for Internet Explorer, Edge */
            overflow-x: scroll;
        }

        * {
            scrollbar-width: none; /* for Firefox */
        }
        
        body::-webkit-scrollbar {
            display: none; /* for Chrome, Safari, and Opera */
        }
        `;
        wnd.document.head.appendChild(d);

        this.observer = new ResizeObserver(() => {
            appendVirtualColumnIfNeeded(wnd);
        });
        this.observer.observe(wnd.document.body);

        const scrollToOffset = (offset: number): boolean => {
            wnd.document.scrollingElement!.scrollLeft = this.snapOffset(offset); // TODO assert if never undefined (same for rest of !)

            // In some case the scrollX cannot reach the position respecting to innerWidth
            const diff = Math.abs(wnd.scrollX - offset) / wnd.innerWidth;
            return diff > 0.01; // TODO I don't like this 0.01
        }

        window.addEventListener("orientationchange", () => { // TODO implement unregister!!!
            this.snapCurrentOffset();
        });
        window.addEventListener("resize", () => { // TODO implement unregister!!!
            this.snapCurrentOffset();
        });

        comms.register("go_position", ColumnSnapper.moduleName, (data: unknown) => {
            const position = data as number;
            if (position < 0 || position > 1) {
                comms.send("error", {
                    message: "go_position must be given a position from 0.0 to 1.0"
                });
                return;
            }
            const documentWidth = wnd.document.scrollingElement!.scrollWidth;
            const factor = isRTL(wnd) ? -1 : 1;
            const offset = documentWidth * position * factor;
            wnd.document.scrollingElement!.scrollLeft = this.snapOffset(offset);
        })

        comms.register("go_end", ColumnSnapper.moduleName, () => {
            const factor = isRTL(wnd) ? -1 : 1;
            wnd.document.scrollingElement!.scrollLeft = this.snapOffset(
                wnd.document.scrollingElement!.scrollWidth * factor
            );
        })

        comms.register("go_start", ColumnSnapper.moduleName, () => {
            wnd.document.scrollingElement!.scrollLeft = 0;
        })

        comms.register("go_prev", ColumnSnapper.moduleName, () => {
            const documentWidth = wnd.document.scrollingElement?.scrollWidth!;
            var offset = wnd.scrollX - wnd.innerWidth;
            var minOffset = isRTL(wnd) ? - (documentWidth - wnd.innerWidth) : 0;
            return scrollToOffset(Math.max(offset, minOffset));
        });

        comms.register("go_next", ColumnSnapper.moduleName, () => {
            const documentWidth = wnd.document.scrollingElement?.scrollWidth!;
            var offset = wnd.scrollX + wnd.innerWidth;
            var maxOffset = isRTL(wnd) ? 0 : documentWidth - wnd.innerWidth;
            return scrollToOffset(Math.min(offset, maxOffset));
        });

        // Add interaction listeners
        wnd.addEventListener("touchstart", this.onTouchStarter);
        wnd.addEventListener("touchend", this.onTouchEnder);
        wnd.addEventListener("touchmove", this.onTouchMover);

        console.log("ColumnSnapper Mounted");
        return true;
    }

    unmount(wnd: Window, comms: Comms): boolean {
        comms.unregister("go_next", ColumnSnapper.moduleName);
        comms.unregister("go_prev", ColumnSnapper.moduleName);
        comms.unregister("go_start", ColumnSnapper.moduleName);
        comms.unregister("go_end", ColumnSnapper.moduleName);
        comms.unregister("go_position", ColumnSnapper.moduleName);
        this.observer.disconnect();

        wnd.removeEventListener("touchstart", this.onTouchStarter);
        wnd.removeEventListener("touchend", this.onTouchEnder);
        wnd.removeEventListener("touchmove", this.onTouchMover);

        wnd.document.getElementById(SNAPPER_STYLE_ID)?.remove();

        console.log("ColumnSnapper Unmounted");
        return super.unmount(wnd, comms);
    }
}