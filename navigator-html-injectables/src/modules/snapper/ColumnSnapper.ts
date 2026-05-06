import { Comms } from "../../comms/index.ts";
import { Snapper } from "./Snapper.ts";
import { getColumnCountPerScreen, isRTL, appendVirtualColumnIfNeeded } from "../../helpers/document.ts";
import { easeInOutQuad } from "../../helpers/animation.ts";
import { ModuleName } from "../ModuleLibrary.ts";
import { Locator, LocatorLocations, LocatorText } from "@readium/shared";
import { rangeFromLocator } from "../../helpers/locator.ts";
import { ReadiumWindow, deselect, findFirstVisibleLocator } from "../../helpers/dom.ts";
import { PatternAnalyzer } from "../../protection/PatternAnalyzer.ts";
import { BaseSuspiciousActivityEvent } from "../Peripherals.ts";

const COLUMN_SNAPPER_STYLE_ID = "readium-column-snapper-style";

export interface SuspiciousSnappingEvent extends BaseSuspiciousActivityEvent {
    type: "suspicious_snapping";
    event: null;
}

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
    private isSnapProtectionEnabled = false;
    private resizeObserver!: ResizeObserver;
    private mutationObserver!: MutationObserver;
    private patternAnalyzer: PatternAnalyzer | null = null;
    private lastTurnTime: number = 0;
    private wnd!: ReadiumWindow;
    private comms!: Comms;
    private rtl = false;
    private doc() { return this.wnd.document.scrollingElement as HTMLElement; }
    private scrollOffset() {
        // The reason we do this is because when the document is transformed (translate3d),
        // the scrollLeft value is 0 because... reasons. So we have to use the cached value
        // from this.alreadyScrollLeft instead.
        // Note: for RTL, scrollLeft is negative, so we check !== 0, not > 0.
        const sl = this.doc().scrollLeft;
        return (sl !== 0) ? sl : this.alreadyScrollLeft;
    }

    snapOffset(offset: number) {
        const value = offset + (this.rtl ? -1 : 1);
        return value - (value % this.wnd.innerWidth);
    }

    /**
     * Snap a non-negative normalized offset (distance from document start) to
     * the nearest page boundary. Works identically regardless of reading direction.
     */
    private snapNormOffset(offset: number): number {
        const value = offset + 1;
        return value - (value % this.wnd.innerWidth);
    }

    /**
     * Normalized scroll position: distance from document start, always in
     * [0, scrollWidth - innerWidth] regardless of reading direction.
     * scrollLeft may be negative depending on the browser — Math.abs() normalizes it.
     */
    private normScroll(): number {
        const raw = this.doc().scrollLeft || this.alreadyScrollLeft;
        return this.rtl ? Math.abs(raw) : Math.max(0, this.wnd.scrollX > 0 ? this.wnd.scrollX : raw);
    }

    reportProgress() {
        const scrollWidth = this.cachedScrollWidth;
        const viewportWidth = this.wnd.innerWidth;
        const norm = this.normScroll();
        const scrollable = Math.max(1, scrollWidth - viewportWidth);

        // progress 0 = document start, 1 = document end — same regardless of direction.
        const progress = Math.max(0, Math.min(1, norm / scrollable));
        const viewportEnd = Math.max(0, Math.min(1, (norm + viewportWidth) / scrollWidth));
        this.comms.send("progress", {
            start: progress,
            end: viewportEnd
        });
    }

    private shakeTimeout = 0;
    shake() {
        // - If already overscrolling (touchscreen), then shaking on top of it looks ugly
        // - If already shaking, wait until it's finished before allowing another shake
        if(this.overscroll !== 0 || this.shakeTimeout !== 0) return;
        const doc = this.doc();

        // Bounce toward the boundary that was hit.
        // LTR: end is on the right → bounce-r. RTL: start is on the right (norm≈0),
        // end is on the left → bounce direction flips based on which boundary we're at.
        const atStart = this.normScroll() < 5;
        const bounceClass = this.rtl
            ? (atStart ? "readium-bounce-r" : "readium-bounce-l")
            : "readium-bounce-r";
        doc.classList.add(bounceClass);
        const curScrollLeft = this.scrollOffset();
        this.shakeTimeout = this.wnd.setTimeout(() => {
            doc.classList.remove(bounceClass);
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
        const doc = this.doc();
        const columnCount = getColumnCountPerScreen(this.wnd);
        const maxScroll = this.cachedScrollWidth - this.wnd.innerWidth;

        // Work in normalized (non-negative, distance-from-start) coordinates
        // so all arithmetic is direction-agnostic.
        const currentNorm = Math.min(Math.max(0, this.normScroll()), maxScroll);

        // Forward drag: LTR = drag left (cdo > 0), RTL = drag right (cdo < 0).
        // Normalize so that positive = moving forward in reading order.
        const cdo = this.dragOffset();
        const normalizedCdo = this.rtl ? -cdo : cdo;
        const hurdle = (this.wnd.innerWidth / 3) * (normalizedCdo > 0 ? 2 : 1);

        const snappedNorm = Math.min(maxScroll, Math.max(0, this.snapNormOffset(currentNorm + hurdle)));

        // Convert back to signed scrollLeft for the actual DOM write.
        const so = this.rtl ? -snappedNorm : snappedNorm;
        const currentScrollLeft = this.rtl ? -currentNorm : currentNorm;

        const direction = so > currentScrollLeft ? "right" : "left";
        this.checkSuspiciousSnap(direction, Math.abs(so - currentScrollLeft));

        if(smooth && so !== currentScrollLeft) { // Smooth snapping
            this.snappingCancelled = false;
            const position = (start: number, end: number, elapsed: number, period: number) => {
                if (elapsed > period) return end;
                return start + (end - start) * easeInOutQuad(elapsed / period);
            };
            const period = SNAP_DURATION * columnCount;
            let startTime: number;
            const step = (timestamp: number) => {
                if(this.snappingCancelled) return;

                if (!startTime) startTime = timestamp;
                const elapsed = timestamp - startTime;

                const lpos = position(this.overscroll, 0, elapsed, period);
                const spos = position(currentScrollLeft, so, elapsed, period);
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
            };
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

            // Normalize: distance from document start, forward drag is positive.
            const norm = this.normScroll();
            const maxScroll = this.cachedScrollWidth - this.wnd.innerWidth;
            const normalizedDrag = this.rtl ? -dragOffset : dragOffset;

            if(this.cachedScrollWidth <= this.wnd.innerWidth) {
                // Only a single page, meaning any swipe triggers next/prev
                this.reportProgress();
                if(normalizedDrag > 5) this.comms.send("no_more", undefined);
                if(normalizedDrag < -5) this.comms.send("no_less", undefined);
            } else if(norm < 5 && normalizedDrag < 5) {
                // At document start, tried to go backward
                this.alreadyScrollLeft = 0;
                this.comms.send("no_less", undefined);
            } else if((maxScroll - norm) < 5 && normalizedDrag > 5) {
                // At document end, tried to go forward
                this.alreadyScrollLeft = this.rtl ? -maxScroll : maxScroll;
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

        // For RTL, scrollLeft is in [-(scrollWidth - innerWidth), 0].
        // For LTR, scrollLeft is in [0, scrollWidth - innerWidth].
        const minScrollLeft = this.rtl ? -(this.cachedScrollWidth - this.wnd.innerWidth) : 0;
        const maxScrollLeft = this.rtl ? 0 : (this.cachedScrollWidth - this.wnd.innerWidth);

        if(newpos < minScrollLeft) {
            this.overscroll = newpos;
            this.doc().style.transform = `translate3d(${-this.overscroll}px, 0px, 0px)`;
        } else if(newpos > maxScrollLeft) {
            this.overscroll = newpos;
            this.doc().style.transform = `translate3d(${-newpos}px, 0px, 0px)`;
        } else {
            this.overscroll = 0;
            this.doc().style.removeProperty("transform");
            this.doc().scrollLeft = newpos;
        }
    }
    private readonly onTouchMover = this.onTouchMove.bind(this);

    private enableSnapProtection() {
        if (!this.patternAnalyzer) {
            this.patternAnalyzer = new PatternAnalyzer({
                maxVelocity: this.wnd.innerWidth,  // page width
                minVariance: 0.1,   // Allow for some variation in swipe speed
                historySize: 5,      // Fewer samples needed for swipe detection
                maxConsistentScrolls: 3,  // Lower threshold for consistent scrolling
                minDirectionChanges: 0.3  // Require more direction changes
            });
            this.isSnapProtectionEnabled = true;
            this.comms?.log("Snap protection enabled");
        }
    }

    private checkSuspiciousSnap(direction: "left" | "right", distance: number) {
        if (!this.isSnapProtectionEnabled || !this.patternAnalyzer) return;

        const now = Date.now();
        const timeDelta = now - (this.lastTurnTime || now);
        this.lastTurnTime = now;

        const isSuspicious = this.patternAnalyzer.analyze(direction, distance, timeDelta);
        if (isSuspicious) {
            this.comms?.send("content_protection", {
                type: "suspicious_snapping",
                timestamp: Date.now(),
                event: null
            } as SuspiciousSnappingEvent);
        }
    }

    mount(wnd: ReadiumWindow, comms: Comms): boolean {
        this.wnd = wnd;
        this.comms = comms;
        this.rtl = isRTL(wnd);
        if(!super.mount(wnd, comms)) return false;

        wnd.navigator.epubReadingSystem && (wnd.navigator.epubReadingSystem.layoutStyle = "paginated");

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

        this.resizeObserver = new ResizeObserver(() => {
            wnd.requestAnimationFrame(() => {
                wnd && appendVirtualColumnIfNeeded(wnd);
            });
            this.onWidthChange();
        });
        this.resizeObserver.observe(wnd.document.body);

        this.mutationObserver = new MutationObserver((mutations) => {
            for (const mutation of mutations) {
                // We have to check it’s not onTouchMove + snapOffset setting transforms
                if (mutation.target === this.wnd.document.documentElement) {
                    const oldValue = mutation.oldValue as string;
                    const newValue = (mutation.target as HTMLElement).getAttribute("style") as string;
                    const transformRegex = /transform\s*:\s*([^;]+)/;
                    const oldValueTransform = oldValue?.match(transformRegex);
                    const newValueTransform = newValue?.match(transformRegex);
                    if (
                        (!oldValueTransform && !newValueTransform) ||
                        (oldValueTransform && !newValueTransform) ||
                        (oldValueTransform && newValueTransform && oldValueTransform[1] !== newValueTransform[1])
                    ) {
                        wnd.requestAnimationFrame(() => {
                            wnd && appendVirtualColumnIfNeeded(wnd);
                        });
                        this.onWidthChange();
                    }
                } else {
                    wnd.requestAnimationFrame(() => this.cachedScrollWidth = this.doc().scrollWidth!);
                }
            }
        });
        wnd.frameElement && this.mutationObserver.observe(wnd.frameElement, {attributes: true, attributeFilter: ["style"]});
        this.mutationObserver.observe(wnd.document, {attributes: true, attributeFilter: ["style"]});
        // For cases the resizeObserver is not able to detect cos body is not resizing despite colCount,
        // we need to check the syle attribute on the documentElement (ReadiumCSS props)
        this.mutationObserver.observe(wnd.document.documentElement, {attributes: true, attributeFilter: ["style"]});

        comms.register("scroll_protection", ColumnSnapper.moduleName, (_, ack) => {
            this.enableSnapProtection();
            ack(true);
        });

        // LTR only — snapOffset only works with non-negative values.
        const scrollToOffset = (offset: number): boolean => {
            const oldScrollLeft = this.doc().scrollLeft;
            this.doc().scrollLeft = this.snapOffset(offset);
            return oldScrollLeft !== this.doc().scrollLeft;
        }

        // RTL: offset is normalized (non-negative, 0 = start, scrollable = end).
        // Snaps to page boundary and sets scrollLeft = -snappedNorm.
        const rtlScrollToNorm = (norm: number): boolean => {
            const oldScrollLeft = this.doc().scrollLeft;
            const snapped = this.snapNormOffset(Math.max(0, Math.min(this.cachedScrollWidth - wnd.innerWidth, norm)));
            this.doc().scrollLeft = -snapped;
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
                const scrollable = this.cachedScrollWidth - wnd.innerWidth;
                const norm = scrollable * position;
                if (this.rtl) {
                    this.doc().scrollLeft = -this.snapNormOffset(norm);
                } else {
                    this.doc().scrollLeft = this.snapOffset(norm);
                }
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
                if (this.rtl) {
                    this.doc().scrollLeft = -this.snapNormOffset(element.getBoundingClientRect().left + wnd.scrollX);
                } else {
                    this.doc().scrollLeft = this.snapOffset(element.getBoundingClientRect().left + wnd.scrollX);
                }
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
                if (this.rtl) {
                    this.doc().scrollLeft = -this.snapNormOffset(r.getBoundingClientRect().left + wnd.scrollX);
                } else {
                    this.doc().scrollLeft = this.snapOffset(r.getBoundingClientRect().left + wnd.scrollX);
                }
                this.reportProgress();
                deselect(this.wnd);
                ack(true);
            });
        });

        comms.register("go_end", ColumnSnapper.moduleName, (_, ack) => {
            this.wnd.requestAnimationFrame(() => {
                this.cachedScrollWidth = this.doc().scrollWidth!;
                let snappedFinal: number;
                if (this.rtl) {
                    // RTL: end is the leftmost position, using normalized snapping first
                    snappedFinal = -this.snapNormOffset(this.cachedScrollWidth - wnd.innerWidth);
                } else {
                    // LTR: end is scrollWidth (browser clamps to scrollWidth - innerWidth)
                    snappedFinal = this.snapOffset(this.cachedScrollWidth);
                }
                if(this.doc().scrollLeft === snappedFinal) return ack(false);
                this.doc().scrollLeft = snappedFinal;
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
                this.cachedScrollWidth = this.doc().scrollWidth!;
                let change: boolean;
                if (this.rtl) {
                    // RTL: go_prev = toward document start = decreasing norm = scrollLeft toward 0
                    change = rtlScrollToNorm(this.normScroll() - wnd.innerWidth);
                } else {
                    change = scrollToOffset(wnd.scrollX - wnd.innerWidth);
                }
                this.reportProgress();
                if(change) {
                    deselect(this.wnd);
                    this.checkSuspiciousSnap("left", this.wnd.innerWidth);
                }
                ack(change);
            });
        });

        comms.register("go_next", ColumnSnapper.moduleName, (_, ack) => {
            this.wnd.requestAnimationFrame(() => {
                this.cachedScrollWidth = this.doc().scrollWidth!;
                let change: boolean;
                if (this.rtl) {
                    // RTL: go_next = toward document end = increasing norm = scrollLeft more negative
                    change = rtlScrollToNorm(this.normScroll() + wnd.innerWidth);
                } else {
                    change = scrollToOffset(wnd.scrollX + wnd.innerWidth);
                }
                this.reportProgress();
                if(change) {
                    deselect(this.wnd);
                    this.checkSuspiciousSnap("right", this.wnd.innerWidth);
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
        wnd.document.addEventListener("touchstart", () => {});

        comms.log("ColumnSnapper Mounted");
        return true;
    }

    unmount(wnd: ReadiumWindow, comms: Comms): boolean {
        this.snappingCancelled = true;
        comms.unregisterAll(ColumnSnapper.moduleName);
        this.resizeObserver.disconnect();
        this.mutationObserver.disconnect();

        if (this.patternAnalyzer) {
            this.patternAnalyzer.clear();
            this.patternAnalyzer = null;
            this.isSnapProtectionEnabled = false;
        }

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
