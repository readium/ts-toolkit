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

/**
 * A {Snapper} for reflowable resources using a column-based layout
 */
export class ColumnSnapper extends Snapper {
    static readonly moduleName = "column_snapper";
    private observer!: ResizeObserver;

    mount(wnd: Window, comms: Comms): boolean {
        if(!super.mount(wnd, comms)) return false;

        this.observer = new ResizeObserver(() => {
            appendVirtualColumnIfNeeded(wnd);
        });
        this.observer.observe(wnd.document.body);

        const snapOffset = (offset: number) => {
            const value = offset + (isRTL(wnd) ? -1 : 1);
            return value - (value % wnd.innerWidth);
        }

        const scrollToOffset = (offset: number): boolean => {
            wnd.document.scrollingElement!.scrollLeft = snapOffset(offset); // TODO assert if never undefined (same for rest of !)

            // In some case the scrollX cannot reach the position respecting to innerWidth
            const diff = Math.abs(wnd.scrollX - offset) / wnd.innerWidth;
            return diff > 0.01; // TODO I don't like this 0.01
        }

        // Snaps the current offset to the page width.
        const snapCurrentOffset = () => {
            const currentOffset = wnd.scrollX;
            // Adds half a page to make sure we don't snap to the previous page.
            const factor = isRTL(wnd) ? -1 : 1;
            var delta = factor * (wnd.innerWidth / 2);
            wnd.document.scrollingElement!.scrollLeft = snapOffset(currentOffset + delta);
        }

        window.addEventListener("orientationchange", () => { // TODO implement unregister!!!
            snapCurrentOffset();
        });
        window.addEventListener("resize", () => { // TODO implement unregister!!!
            snapCurrentOffset();
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
            wnd.document.scrollingElement!.scrollLeft = snapOffset(offset);
        })

        comms.register("go_end", ColumnSnapper.moduleName, () => {
            const factor = isRTL(wnd) ? -1 : 1;
            wnd.document.scrollingElement!.scrollLeft = snapOffset(
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

        console.log("ColumnSnapper Unmounted");
        return super.unmount(wnd, comms);
    }
}