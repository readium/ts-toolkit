import { ResizeObserver as Polyfill } from '@juggle/resize-observer';
import { Comms } from "../../comms";
import { Snapper } from "./Snapper";
import { getColumnCountPerScreen, isRTL, appendVirtualColumnIfNeeded } from "../../helpers/document";
import { easeInOutQuad } from "../../helpers/animation";
import { ModuleName } from "../ModuleLibrary";
import { Locator, LocatorLocations, LocatorText } from "@readium/shared/src/publication";
import { rangeFromLocator } from "../../helpers/locator";
import { ReadiumWindow, deselect, findFirstVisibleLocator } from "../../helpers/dom";

const COLUMN_SNAPPER_STYLE_ID = "readium-column-snapper-style";
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
    static readonly moduleName: ModuleName = "column_snapper";
    private resizeObserver!: ResizeObserver;
    private mutationObserver!: MutationObserver;
    private wnd!: Window;
    private comms!: Comms;
    private doc() { return this.wnd.document.scrollingElement as HTMLElement; }
    private scrollOffset() {
        // The reason we do this is because when the document is transformed (translate3d),
        // the scrollLeft value is 0 because... reasons. So we have to use the cached value
        // from this.alreadyScrollLeft instead.
        return (this.doc().scrollLeft > 0) ? this.doc().scrollLeft : this.alreadyScrollLeft;
    }

    snapOffset(offset: number) {
        const value = offset + (isRTL(this.wnd) ? -1 : 1);
        return value - (value % this.wnd.innerWidth);
    }

    reportProgress() {
        this.comms.send("progress", this.wnd.scrollX / this.cachedScrollWidth);
    }

    private shakeTimeout = 0;
    shake() {
        // - If already overscrolling (touchscreen), then shaking on top of it looks ugly
        // - If already shaking, wait until it's finished before allowing another shake
        if(this.overscroll !== 0 || this.shakeTimeout !== 0) return;
        const doc = this.doc();

        doc.classList.add((isRTL(this.wnd) ? "readium-bounce-l" : "readium-bounce-r"));
        const curScrollLeft = this.scrollOffset();
        this.shakeTimeout = this.wnd.setTimeout(() => {
            doc.classList.remove("readium-bounce-l");
            doc.classList.remove("readium-bounce-r");
            this.shakeTimeout = 0;
            this.doc().scrollLeft = curScrollLeft;
        }, 150);
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
    snapCurrentOffset(smooth=false, noprogress=false) {
        const startX = this.wnd.scrollX > 0 ? this.wnd.scrollX : this.alreadyScrollLeft;
        const doc = this.doc();
        const cdo = this.dragOffset();
        const columnCount = getColumnCountPerScreen(this.wnd);
        const currentOffset = Math.min(Math.max(0, startX), this.cachedScrollWidth);
        const factor = isRTL(this.wnd) ? -1 : 1;
        const hurdle =
            // The hurdle to overcome in order to change pages
            factor *
            (this.wnd.innerWidth / 3) *
            ((factor * cdo) > 0 ? 2 : 1);

        const so = this.snapOffset(currentOffset + hurdle);
        if(smooth && so !== this.scrollOffset()) { // Smooth snapping
            this.snappingCancelled = false;
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
                    if(!noprogress) this.reportProgress();
                }
            }
            this.wnd.requestAnimationFrame(step);
        } else { // Instant snapping
            doc.style.removeProperty("transform");
            this.wnd.requestAnimationFrame(() => {
                doc.scrollLeft = so;
                this.clearTouches();
                if(!noprogress) this.reportProgress();
            });
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

    onTouchEnd(_: TouchEvent) {
        if(this.touchState === ScrollTouchState.MOVE) {
            // Get the horizontal drag distance
            const dragOffset = this.dragOffset();
            const scrollOffset = this.scrollOffset();
            // this.cachedScrollWidth = this.doc().scrollWidth!;
            if(this.cachedScrollWidth <= this.wnd.innerWidth) {
                // Only a single page, meaning any swipe triggers next/prev
                this.reportProgress();
                if(dragOffset > 5) this.comms.send("no_more", undefined);
                if(dragOffset < -5) this.comms.send("no_less", undefined);
            } else if(scrollOffset < 5 && dragOffset < 5) {
                this.alreadyScrollLeft = 0;
                this.comms.send("no_less", undefined);
            } else if((this.cachedScrollWidth - scrollOffset - this.wnd.innerWidth) < 5 && dragOffset > 5) {
                this.alreadyScrollLeft = this.cachedScrollWidth;
                this.comms.send("no_more", undefined);
            }

            this.snapCurrentOffset(true);
            this.comms.send("swipe", dragOffset);
        }
        this.touchState = ScrollTouchState.END;
    }
    private readonly onTouchEnder = this.onTouchEnd.bind(this);

    private onWidthChange() {
        this.cachedScrollWidth = this.doc().scrollWidth!;
        if(this.comms.ready)
            // This function can be called while the frame is still hidden
            // so it should only be snapped if it's actually active because
            // it sends a comms message to update progress.
            this.snapCurrentOffset();
    }
    private readonly onWidthChanger = this.onWidthChange.bind(this);

    onTouchMove(e: TouchEvent) {
        if(this.touchState === ScrollTouchState.END) return;
        if(this.touchState === ScrollTouchState.START) {
            this.touchState = ScrollTouchState.MOVE;
            deselect(this.wnd);
        }
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
        d.dataset.readium = "true";
        d.id = COLUMN_SNAPPER_STYLE_ID;
        d.textContent = `
        @keyframes readium-bounce-l-animation {
            0%, 100% {transform: translate3d(0, 0, 0);}
            50% {transform: translate3d(-50px, 0, 0);}
        }

        @keyframes readium-bounce-r-animation {
            0%, 100% {transform: translate3d(0, 0, 0);}
            50% {transform: translate3d(50px, 0, 0);}
        }

        .readium-bounce-l {
            animation: readium-bounce-l-animation 150ms ease-out 1;
        }

        .readium-bounce-r {
            animation: readium-bounce-r-animation 150ms ease-out 1;
        }

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

        // Necessary for iOS 13 and below
        const ResizeObserver = (wnd as Window & typeof globalThis).ResizeObserver || Polyfill;

        this.resizeObserver = new ResizeObserver(() => wnd.requestAnimationFrame(() => {
            wnd && appendVirtualColumnIfNeeded(wnd);
        }));
        this.resizeObserver.observe(wnd.document.body);
        this.mutationObserver = new MutationObserver(() => {
            this.wnd.requestAnimationFrame(() => this.cachedScrollWidth = this.doc().scrollWidth!);
        });
        wnd.frameElement && this.mutationObserver.observe(wnd.frameElement, {attributes: true, attributeFilter: ["style"]});
        this.mutationObserver.observe(wnd.document, {attributes: true, attributeFilter: ["style"]});

        const scrollToOffset = (offset: number): boolean => {
            const oldScrollLeft = this.doc().scrollLeft;
            this.doc().scrollLeft = this.snapOffset(offset); // TODO assert if never undefined (same for rest of !)

            return oldScrollLeft !== this.doc().scrollLeft;
        }

        wnd.addEventListener("orientationchange", this.onWidthChanger);
        wnd.addEventListener("resize", this.onWidthChanger);
        wnd.requestAnimationFrame(() => this.cachedScrollWidth = this.doc().scrollWidth!);

        comms.register("go_progression", ColumnSnapper.moduleName, (data, ack) => {
            const position = data as number;
            if (position < 0 || position > 1) {
                comms.send("error", {
                    message: "go_progression must be given a position from 0.0 to 1.0"
                });
                ack(false);
                return;
            }
            this.wnd.requestAnimationFrame(() => {
                this.cachedScrollWidth = this.doc().scrollWidth!;
                const documentWidth = this.cachedScrollWidth;
                const factor = isRTL(wnd) ? -1 : 1;
                const offset = documentWidth * position * factor;
                this.doc().scrollLeft = this.snapOffset(offset);
                this.reportProgress();
                deselect(this.wnd);
                ack(true);
            });
        })

        comms.register("go_id", ColumnSnapper.moduleName, (data, ack) => {
            const element = wnd.document.getElementById(data as string);
            if(!element) {
                ack(false);
                return;
            }
            this.wnd.requestAnimationFrame(() => {
                this.doc().scrollLeft = this.snapOffset(element.getBoundingClientRect().left + wnd.scrollX);
                this.reportProgress();
                deselect(this.wnd);
                ack(true);
            });
        });

        comms.register("go_text", ColumnSnapper.moduleName, (data: unknown | unknown[], ack) => {
            let cssSelector = undefined;
            if(Array.isArray(data)) {
                if(data.length > 1)
                    // Second element is presumed to be the CSS selector
                    cssSelector = (data as unknown[])[1] as string;
                data = data[0]; // First element will always be the locator text object
            }
            const text = LocatorText.deserialize(data);
            const r = rangeFromLocator(this.wnd.document, new Locator({
                href: wnd.location.href,
                type: "text/html",
                text,
                locations: cssSelector ? new LocatorLocations({
                    otherLocations: new Map([
                        ["cssSelector", cssSelector]
                    ])
                }) : undefined
            }));
            if(!r) {
                ack(false);
                return;
            }
            this.wnd.requestAnimationFrame(() => {
                this.doc().scrollLeft = this.snapOffset(r.getBoundingClientRect().left + wnd.scrollX);
                this.reportProgress();
                deselect(this.wnd);
                ack(true);
            });
        });

        comms.register("go_end", ColumnSnapper.moduleName, (_, ack) => {
            const factor = isRTL(wnd) ? -1 : 1;
            this.wnd.requestAnimationFrame(() => {
                this.cachedScrollWidth = this.doc().scrollWidth!;
                const final = this.cachedScrollWidth * factor;
                if(this.doc().scrollLeft === final) return ack(false);
                this.doc().scrollLeft = this.snapOffset(final);
                this.reportProgress();
                deselect(this.wnd);
                ack(true);
            });
        })

        comms.register("go_start", ColumnSnapper.moduleName, (_, ack) => {
            this.wnd.requestAnimationFrame(() => {
                if(this.doc().scrollLeft === 0) return ack(false);
                this.doc().scrollLeft = 0;
                this.reportProgress();
                deselect(this.wnd);
                ack(true);
            });
        })

        comms.register("go_prev", ColumnSnapper.moduleName, (_, ack) => {
            this.wnd.requestAnimationFrame(() => {
                const offset = wnd.scrollX - wnd.innerWidth;
                const minOffset = isRTL(wnd) ? - (this.cachedScrollWidth - wnd.innerWidth) : 0;
                const change = scrollToOffset(Math.max(offset, minOffset));
                if(change) {
                    this.reportProgress();
                    deselect(this.wnd);
                }
                ack(change);
            });
        });

        comms.register("go_next", ColumnSnapper.moduleName, (_, ack) => {
            this.wnd.requestAnimationFrame(() => {
                const offset = wnd.scrollX + wnd.innerWidth;
                const maxOffset = isRTL(wnd) ? 0 : this.cachedScrollWidth - wnd.innerWidth;
                const change = scrollToOffset(Math.min(offset, maxOffset));
                if(change) {
                    this.reportProgress();
                    deselect(this.wnd);
                }
                ack(change);
            });
        });

        comms.register("unfocus", ColumnSnapper.moduleName, (_, ack) => {
            this.snappingCancelled = true;
            deselect(this.wnd);
            ack(true);
        });

        comms.register("shake", ColumnSnapper.moduleName, (_, ack) => {
            this.shake();
            ack(true);
        });

        comms.register("focus", ColumnSnapper.moduleName, (_, ack) => {
            this.wnd.requestAnimationFrame(() => {
                this.cachedScrollWidth = this.doc().scrollWidth!;
                this.snapCurrentOffset(false, true);
                this.reportProgress();
                ack(true);
            });
        });

        comms.register("first_visible_locator", ColumnSnapper.moduleName, (_, ack) => {
            const locator = findFirstVisibleLocator(wnd as ReadiumWindow, false);
            this.comms.send("first_visible_locator", locator.serialize());
            ack(true);
        });

        // Add interaction listeners
        wnd.addEventListener("touchstart", this.onTouchStarter, { passive: true });
        wnd.addEventListener("touchend", this.onTouchEnder, { passive: true });
        wnd.addEventListener("touchmove", this.onTouchMover, { passive: true });

        // Safari hack, otherwise other events won't register
        wnd.document.addEventListener('touchstart', () => {});

        comms.log("ColumnSnapper Mounted");
        return true;
    }

    unmount(wnd: Window, comms: Comms): boolean {
        this.snappingCancelled = true;
        comms.unregisterAll(ColumnSnapper.moduleName);
        this.resizeObserver.disconnect();
        this.mutationObserver.disconnect();

        wnd.removeEventListener("touchstart", this.onTouchStarter);
        wnd.removeEventListener("touchend", this.onTouchEnder);
        wnd.removeEventListener("touchmove", this.onTouchMover);

        wnd.removeEventListener("orientationchange", this.onWidthChanger);
        wnd.removeEventListener("resize", this.onWidthChanger);

        wnd.document.getElementById(COLUMN_SNAPPER_STYLE_ID)?.remove();

        comms.log("ColumnSnapper Unmounted");
        return super.unmount(wnd, comms);
    }
}