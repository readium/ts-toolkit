import { Comms } from "../../comms";
import { Snapper } from "./Snapper";
import { getColumnCountPerScreen, isRTL, appendVirtualColumnIfNeeded } from "../../helpers/document";
import { easeInOutQuad } from "../../helpers/animation";

const SNAPPER_STYLE_ID = "readium-column-snapper-style";
const SNAP_DURATION = 200; // Milliseconds

enum ScrollTouchState {
    END = 0,
    START = 1,
    MOVE = 2
}

/**
 * A {Snapper} for reflowable resources using a column-based layout
 */
export class ColumnSnapper extends Snapper {
    static readonly moduleName = "column_snapper";
    private observer!: ResizeObserver;
    private wnd!: Window;
    private comms!: Comms;
    private doc() { return this.wnd.document.scrollingElement as HTMLElement; }

    snapOffset(offset: number) {
        const value = offset + (isRTL(this.wnd) ? -1 : 1);
        return value - (value % this.wnd.innerWidth);
    }

    reportProgress() {
        this.comms.send("progress", this.wnd.scrollX / this.doc().scrollWidth);
    }

    private snappingCancelled = false;
    private alreadyScrollLeft = 0;
    private overscroll = 0;
    private cachedScrollWidth = 0; // We have to cache this because during overscroll (transform, or left) the width is incorrect due to browser
    private takeOverSnap() {
        this.snappingCancelled = true;
        this.clearTouches();
        const doc = this.doc();

        // translate3d(XXXpx, 0px, 0px) -> slice 12 -> XXXpx, 0px, 0px) -> split "px" [0] -> XXX
        this.overscroll = doc.style.transform?.length > 12 ? parseFloat(doc.style.transform.slice(12).split("px")[0]) : 0;
    }

    // Snaps the current offset to the page width.
    snapCurrentOffset(smooth=false) {
        const startX = this.wnd.scrollX > 0 ? this.wnd.scrollX : this.alreadyScrollLeft;
        const doc = this.doc();
        const cdo = this.dragOffset();
        const columnCount = getColumnCountPerScreen(this.wnd);
        const currentOffset = Math.min(Math.max(0, startX), doc.scrollWidth);
        // Adds half a page to make sure we don't snap to the previous page. (from orig readium)
        const factor = isRTL(this.wnd) ? -1 : 1;
        const delta = factor * (this.wnd.innerWidth / 2) * Math.sign(cdo) * ((factor* cdo) > 0 ? 1.25 : 0.75); // TODO fix this
        if(smooth) { // Smooth snapping
            this.snappingCancelled = false;
            const so = this.snapOffset(currentOffset + delta);
            const position = (start: number, end: number, elapsed: number, period: number) => {
                if (elapsed > period) {
                    return end;
                }
                return start + (end - start) * easeInOutQuad(elapsed / period);
            }
            const period = /*Math.abs(startX - (this.useTransform ? currentOffset : 0)) < 10 ? 1 : */SNAP_DURATION * columnCount; // TODO revamp
            let startTime: number;
            const step = (timestamp: number) => {
                if(this.snappingCancelled) return;

                if (!startTime) startTime = timestamp;
                const elapsed = timestamp - startTime;

                const lpos = position(this.overscroll, 0, elapsed, period);
                const spos = position(startX, so, elapsed, period);
                doc.scrollLeft = spos;
                if(this.overscroll !== 0)
                    doc.style.transform = `translate3d(${-lpos}px, 0px, 0px)`;

                if (elapsed < period)
                    this.wnd.requestAnimationFrame(step);
                else {
                    this.clearTouches();
                    doc.style.removeProperty("transform");
                    doc.scrollLeft = so;
                    this.reportProgress();
                }
            }
            this.wnd.requestAnimationFrame(step);
        } else { // Instant snapping
            doc.style.removeProperty("transform");
            this.wnd.requestAnimationFrame(() => {
                doc.scrollLeft = this.snapOffset(currentOffset + delta);
                this.reportProgress();
            });
            this.clearTouches();
        }
    }

    // Current touch state cycler, to assist with swipe detection etc.
    private touchState: ScrollTouchState = ScrollTouchState.END;
    private startingX: number | undefined = undefined;
    private endingX: number | undefined = undefined;
    private dragOffset() { return (this.startingX ?? 0) - (this.endingX ?? 0); }
    private clearTouches() {
        this.startingX = undefined; this.endingX = undefined;
        this.overscroll = 0;
        // this.doc().style.removeProperty("will-change");
    }

    onTouchStart(e: TouchEvent) {
        e.stopPropagation();
        this.takeOverSnap();
        switch (e.touches.length) {
            case 1: // Single finger - handle it
                break;
            case 2: // Pinch - abort
                this.onTouchEnd(e);
                return;
            default: { // More fingers - abort, notify
                this.onTouchEnd(e);
                this.comms.send("tap_more", e.touches.length);
                return;
            }
        }

        // this.doc().style.willChange = "transform, scroll-position";
        this.startingX = e.touches[0].clientX;
        this.alreadyScrollLeft = this.doc().scrollLeft;
        this.touchState = ScrollTouchState.START;
    }
    private readonly onTouchStarter = this.onTouchStart.bind(this);

    onTouchEnd(e: TouchEvent) {
        if(this.touchState === ScrollTouchState.MOVE) {
            // Get the horizontal drag distance
            const dragOffset = this.dragOffset();

            const scrollOffset = (this.doc().scrollLeft > 0) ? this.doc().scrollLeft : this.alreadyScrollLeft;
            if(this.cachedScrollWidth <= this.wnd.innerWidth) {
                // Only a single page, meaning any swipe triggers next/prev
                this.reportProgress();
                if(dragOffset > 5) this.comms.send("no_more", undefined);
                if(dragOffset < -5) this.comms.send("no_less", undefined);
            } else if(scrollOffset < 5 && dragOffset < 5) {
                this.reportProgress();
                this.comms.send("no_less", undefined);
            } else if((this.cachedScrollWidth - scrollOffset - this.wnd.innerWidth) < 5 && dragOffset > 5) {
                this.reportProgress();
                this.comms.send("no_more", undefined);
            }

            this.snapCurrentOffset(true);
            // this.startingTouch = undefined;
            this.comms.send("swipe", dragOffset);
        }
        this.touchState = ScrollTouchState.END;
    }
    private readonly onTouchEnder = this.onTouchEnd.bind(this);

    onTouchMove(e: TouchEvent) {
        if(this.touchState === ScrollTouchState.END) return;
        if(this.touchState === ScrollTouchState.START)
            this.touchState = ScrollTouchState.MOVE;
        this.endingX = e.touches[0].clientX;

        const dro = this.dragOffset();
        const newpos = this.alreadyScrollLeft + dro;
        if(newpos < 0) {
            this.overscroll = newpos;
            this.doc().style.transform = `translate3d(${-this.overscroll}px, 0px, 0px)`;
        } else if((newpos + this.wnd.innerWidth) > this.cachedScrollWidth) {
            this.overscroll = newpos;
            this.doc().style.transform = `translate3d(${-newpos}px, 0px, 0px)`;
        } else {
            this.overscroll = 0;
            this.doc().style.removeProperty("transform");
            this.doc().scrollLeft = this.alreadyScrollLeft + dro;
        }
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
        html {
            overflow: hidden;
        }

        body {
            -ms-overflow-style: none; /* for Internet Explorer, Edge */
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
            const oldScrollLeft = this.doc().scrollLeft;
            this.doc().scrollLeft = this.snapOffset(offset); // TODO assert if never undefined (same for rest of !)

            return oldScrollLeft !== this.doc().scrollLeft;
        }

        window.addEventListener("orientationchange", () => { // TODO implement unregister!!!
            this.cachedScrollWidth = this.doc().scrollWidth!;
            this.snapCurrentOffset();
        });
        window.addEventListener("resize", () => { // TODO implement unregister!!!
            this.cachedScrollWidth = this.doc().scrollWidth!;
            this.snapCurrentOffset();
        });
        this.wnd.requestAnimationFrame(() => this.cachedScrollWidth = this.doc().scrollWidth!);

        comms.register("go_progression", ColumnSnapper.moduleName, (data, ack) => {
            const position = data as number;
            if (position < 0 || position > 1) {
                comms.send("error", {
                    message: "go_progression must be given a position from 0.0 to 1.0"
                });
                ack(false);
                return;
            }
            const documentWidth = this.doc().scrollWidth;
            const factor = isRTL(wnd) ? -1 : 1;
            const offset = documentWidth * position * factor;
            this.doc().scrollLeft = this.snapOffset(offset);
            this.reportProgress();
            ack(true);
        })

        comms.register("go_end", ColumnSnapper.moduleName, (_, ack) => {
            const factor = isRTL(wnd) ? -1 : 1;
            const final = this.doc().scrollWidth * factor;
            if(this.doc().scrollLeft === final) return ack(false);
            this.doc().scrollLeft = this.snapOffset(final);
            this.reportProgress();
            ack(true);
        })

        comms.register("go_start", ColumnSnapper.moduleName, (_, ack) => {
            if(this.doc().scrollLeft === 0) return ack(false);
            this.doc().scrollLeft = 0;
            this.reportProgress();
            ack(true);
        })

        comms.register("go_prev", ColumnSnapper.moduleName, (_, ack) => {
            const documentWidth = this.doc().scrollWidth!;
            const offset = wnd.scrollX - wnd.innerWidth;
            const minOffset = isRTL(wnd) ? - (documentWidth - wnd.innerWidth) : 0;
            const change = scrollToOffset(Math.max(offset, minOffset));
            if(change) this.reportProgress();
            ack(change);
        });

        comms.register("go_next", ColumnSnapper.moduleName, (_, ack) => {
            const documentWidth = this.doc().scrollWidth!;
            const offset = wnd.scrollX + wnd.innerWidth;
            const maxOffset = isRTL(wnd) ? 0 : documentWidth - wnd.innerWidth;
            const change = scrollToOffset(Math.min(offset, maxOffset));
            if(change) this.reportProgress();
            ack(change);
        });

        // Add interaction listeners
        wnd.addEventListener("touchstart", this.onTouchStarter);
        wnd.addEventListener("touchend", this.onTouchEnder);
        wnd.addEventListener("touchmove", this.onTouchMover);

        // Safari hack, otherwise other evens won't register
        document.addEventListener('touchstart', () => {});

        comms.log("ColumnSnapper Mounted");
        return true;
    }

    unmount(wnd: Window, comms: Comms): boolean {
        this.snappingCancelled = true;
        comms.unregisterAll(ColumnSnapper.moduleName);
        this.observer.disconnect();

        wnd.removeEventListener("touchstart", this.onTouchStarter);
        wnd.removeEventListener("touchend", this.onTouchEnder);
        wnd.removeEventListener("touchmove", this.onTouchMover);

        wnd.document.getElementById(SNAPPER_STYLE_ID)?.remove();

        comms.log("ColumnSnapper Unmounted");
        return super.unmount(wnd, comms);
    }
}