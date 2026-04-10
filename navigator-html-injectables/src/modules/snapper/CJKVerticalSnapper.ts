import { Locator, LocatorLocations, LocatorText } from "@readium/shared";
import { Comms } from "../../comms";
import { ReadiumWindow, deselect, findFirstVisibleLocator } from "../../helpers/dom";
import { ModuleName } from "../ModuleLibrary";
import { Snapper } from "./Snapper";
import { rangeFromLocator } from "../../helpers/locator";
import { forceWebkitRecalc } from "../../helpers/document";
import { PatternAnalyzer } from "../../protection/PatternAnalyzer";
import { SCROLL_PROTECTION_CONFIG } from "../../protection/config";
import { BaseSuspiciousActivityEvent } from "../Peripherals";

const CJK_VERTICAL_SNAPPER_STYLE_ID = "readium-cjk-vertical-snapper-style";

export interface SuspiciousCJKScrollingEvent extends BaseSuspiciousActivityEvent {
    type: "suspicious_scrolling";
    scrollDelta: number;
    scrollDirection: "left" | "right";
    targetElement: { tagName: string } | null;
}

/**
 * Snapper for CJK vertical writing (writing-mode: vertical-rl).
 *
 * In vertical-rl, content overflows on the X axis, flowing from right (start)
 * to left (end). This snapper is the horizontal counterpart of ScrollSnapper:
 * it tracks scrollLeft / scrollWidth / innerWidth and reports progress
 * accordingly.
 *
 * Progress convention:
 *   scrollLeft = 0 (right edge, document start)  →  progress 0
 *   scrollLeft = ±(scrollWidth − clientWidth)    →  progress 1 (document end, left edge)
 *
 * scrollLeft sign varies by browser — always use Math.abs() when reading it.
 *
 * go_next / go_prev always return false so that the navigator advances to the
 * next or previous spine item — this snapper intentionally provides free
 * horizontal scroll without intra-resource page fragmentation.
 */
export class CJKVerticalSnapper extends Snapper {
    static readonly moduleName: ModuleName = "cjk_vertical_snapper";
    private wnd!: ReadiumWindow;
    private comms!: Comms;
    private resizeObserver!: ResizeObserver;
    private patternAnalyzer: PatternAnalyzer | null = null;
    private lastScrollTime: number = 0;
    private isScrollProtectionEnabled = false;

    private initialScrollHandled = false;
    private isScrolling = false;
    private lastScrollLeft = 0;
    private isResizing = false;
    private resizeDebounce: number | null = null;

    private doc() {
        return this.wnd.document.scrollingElement as HTMLElement;
    }

    /** Total horizontally scrollable distance (magnitude). */
    private scrollable() {
        return Math.max(0, this.doc().scrollWidth - this.wnd.innerWidth);
    }

    private reportProgress() {
        if (!this.comms.ready) return;
        const scrollWidth = this.doc().scrollWidth;
        const viewportWidth = this.wnd.innerWidth;
        const scrollable = Math.max(1, scrollWidth - viewportWidth);

        // scrollLeft may be negative depending on the browser — normalize to a
        // non-negative distance from the document start.
        const norm = Math.abs(this.doc().scrollLeft);
        const progress    = Math.max(0, Math.min(1, norm / scrollable));
        const viewportEnd = Math.max(0, Math.min(1, (norm + viewportWidth) / scrollWidth));

        this.comms.send("progress", {
            start: progress,
            end: viewportEnd
        });
    }

    private handleScroll = (_e: Event) => {
        if (!this.comms.ready) return;
        if (this.isResizing) return;

        if (!this.initialScrollHandled) {
            this.lastScrollLeft = Math.abs(this.doc().scrollLeft);
            this.initialScrollHandled = true;
            this.reportProgress();
            return;
        }

        if (!this.isScrolling) {
            this.isScrolling = true;
            this.wnd.requestAnimationFrame(() => {
                this.reportProgress();

                const currentScrollLeft = Math.abs(this.doc().scrollLeft);
                const deltaX = currentScrollLeft - this.lastScrollLeft;
                this.lastScrollLeft = currentScrollLeft;

                if (this.isScrollProtectionEnabled && Math.abs(deltaX) > 5) {
                    const now = Date.now();
                    const timeDelta = now - (this.lastScrollTime || now);
                    if (this.patternAnalyzer) {
                        const isSuspicious = this.patternAnalyzer.analyze(
                            // In vertical-rl, scrolling left (negative delta) = going forward
                            deltaX < 0 ? "down" : "up",
                            Math.abs(deltaX),
                            timeDelta
                        );
                        if (isSuspicious) {
                            const target = _e.target && "tagName" in _e.target
                                ? { tagName: (_e.target as Element).tagName }
                                : null;
                            this.comms?.send("content_protection", {
                                type: "suspicious_scrolling",
                                timestamp: Date.now(),
                                scrollDelta: deltaX,
                                scrollDirection: deltaX < 0 ? "left" : "right",
                                targetElement: target
                            } as SuspiciousCJKScrollingEvent);
                        }
                    }
                    this.lastScrollTime = now;
                }

                this.comms.send("scroll", deltaX);
                this.isScrolling = false;
            });
        }
    };

    private enableScrollProtection() {
        if (!this.patternAnalyzer) {
            this.patternAnalyzer = new PatternAnalyzer(SCROLL_PROTECTION_CONFIG);
            this.isScrollProtectionEnabled = true;
            this.comms?.log("Scroll protection enabled");
        }
    }

    mount(wnd: ReadiumWindow, comms: Comms): boolean {
        this.wnd = wnd;
        this.comms = comms;

        this.initialScrollHandled = false;
        this.lastScrollLeft = 0;
        this.isResizing = false;
        if (this.resizeDebounce) {
            this.wnd.clearTimeout(this.resizeDebounce);
            this.resizeDebounce = null;
        }

        wnd.navigator.epubReadingSystem && (wnd.navigator.epubReadingSystem.layoutStyle = "scrolling");

        // Hide scrollbar
        const style = wnd.document.createElement("style");
        style.dataset.readium = "true";
        style.id = CJK_VERTICAL_SNAPPER_STYLE_ID;
        style.textContent = `
        * {
            scrollbar-width: none;
        }
        body::-webkit-scrollbar {
            display: none;
        }
        html {
            overflow-x: auto !important;
            overflow-y: hidden !important;
        }
        `;
        wnd.document.head.appendChild(style);

        this.resizeObserver = new ResizeObserver(() => {
            if (this.resizeDebounce) {
                this.wnd.clearTimeout(this.resizeDebounce);
            }
            this.isResizing = true;
            this.resizeDebounce = this.wnd.setTimeout(() => {
                this.isResizing = false;
                this.resizeDebounce = null;
                this.reportProgress();
            }, 50);
        });
        this.resizeObserver.observe(wnd.document.body);

        wnd.addEventListener("scroll", this.handleScroll, { passive: true });
        wnd.document.addEventListener("scroll", this.handleScroll, { passive: true });

        comms.register("force_webkit_recalc", CJKVerticalSnapper.moduleName, () => {
            forceWebkitRecalc(this.wnd);
            const current = this.doc().scrollLeft;
            if (Math.abs(current) > 1) {
                this.doc().scrollLeft = current < 0 ? current + 1 : current - 1;
            } else {
                this.doc().scrollLeft = current < 0 ? current - 1 : current + 1;
            }
            this.doc().scrollLeft = current;
        });

        comms.register("go_progression", CJKVerticalSnapper.moduleName, (data, ack) => {
            const position = data as number;
            if (position < 0 || position > 1) {
                comms.send("error", {
                    message: "go_progression must be given a position from 0.0 to 1.0"
                });
                ack(false);
                return;
            }
            this.wnd.requestAnimationFrame(() => {
                // position 0 = start (scrollLeft=0), position 1 = end (scrollLeft=-scrollable)
                this.doc().scrollLeft = -(this.scrollable() * position);
                this.reportProgress();
                deselect(this.wnd);
                ack(true);
            });
        });

        comms.register("go_id", CJKVerticalSnapper.moduleName, (data, ack) => {
            const element = wnd.document.getElementById(data as string);
            if (!element) { ack(false); return; }
            this.wnd.requestAnimationFrame(() => {
                // getBoundingClientRect().left is in viewport coords; translate to scroll coords
                this.doc().scrollLeft = element.getBoundingClientRect().left + wnd.scrollX - wnd.innerWidth / 2;
                this.reportProgress();
                deselect(this.wnd);
                ack(true);
            });
        });

        comms.register("go_text", CJKVerticalSnapper.moduleName, (data: unknown | unknown[], ack) => {
            let cssSelector = undefined;
            if (Array.isArray(data)) {
                if (data.length > 1) cssSelector = (data as unknown[])[1] as string;
                data = data[0];
            }
            const text = LocatorText.deserialize(data);
            const r = rangeFromLocator(this.wnd.document, new Locator({
                href: wnd.location.href,
                type: "text/html",
                text,
                locations: cssSelector ? new LocatorLocations({
                    otherLocations: new Map([["cssSelector", cssSelector]])
                }) : undefined
            }));
            if (!r) { ack(false); return; }
            this.wnd.requestAnimationFrame(() => {
                this.doc().scrollLeft = r.getBoundingClientRect().left + wnd.scrollX - wnd.innerWidth / 2;
                this.reportProgress();
                deselect(this.wnd);
                ack(true);
            });
        });

        // go_start = document start = right edge (scrollLeft = 0)
        comms.register("go_start", CJKVerticalSnapper.moduleName, (_, ack) => {
            if (this.doc().scrollLeft === 0) return ack(false);
            this.doc().scrollLeft = 0;
            this.reportProgress();
            ack(true);
        });

        // go_end = document end = left edge. Write -scrollable; browsers normalize
        // the sign internally so this works regardless of their scrollLeft convention.
        comms.register("go_end", CJKVerticalSnapper.moduleName, (_, ack) => {
            if (Math.abs(this.doc().scrollLeft) === this.scrollable()) return ack(false);
            this.doc().scrollLeft = -this.scrollable();
            this.reportProgress();
            ack(true);
        });

        // Free-scroll: no intra-resource page stepping.
        // The navigator will move to the next/previous spine item.
        comms.register([
            "go_next",
            "go_prev",
        ], CJKVerticalSnapper.moduleName, (_, ack) => ack(false));

        comms.register("unfocus", CJKVerticalSnapper.moduleName, (_, ack) => {
            deselect(this.wnd);
            ack(true);
        });

        comms.register("scroll_protection", CJKVerticalSnapper.moduleName, (_, ack) => {
            this.enableScrollProtection();
            ack(true);
        });

        comms.register("focus", CJKVerticalSnapper.moduleName, (_, ack) => {
            this.reportProgress();
            ack(true);
        });

        comms.register("first_visible_locator", CJKVerticalSnapper.moduleName, (_, ack) => {
            const locator = findFirstVisibleLocator(wnd as ReadiumWindow, true);
            this.comms.send("first_visible_locator", locator.serialize());
            ack(true);
        });

        comms.log("CJKVerticalSnapper Mounted");
        return true;
    }

    unmount(wnd: ReadiumWindow, comms: Comms): boolean {
        comms.unregisterAll(CJKVerticalSnapper.moduleName);
        this.resizeObserver.disconnect();
        if (this.handleScroll) {
            wnd.removeEventListener("scroll", this.handleScroll);
            wnd.document.removeEventListener("scroll", this.handleScroll);
        }
        wnd.document.getElementById(CJK_VERTICAL_SNAPPER_STYLE_ID)?.remove();

        if (this.patternAnalyzer) {
            this.patternAnalyzer.clear();
            this.patternAnalyzer = null;
            this.isScrollProtectionEnabled = false;
        }

        comms.log("CJKVerticalSnapper Unmounted");
        return true;
    }
}
