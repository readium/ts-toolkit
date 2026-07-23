import { Locator, LocatorLocations, LocatorText } from "@readium/shared";
import { Comms } from "../../comms/index.ts";
import { ReadiumWindow, deselect, findFirstVisibleLocator } from "../../helpers/dom.ts";
import { ModuleName } from "../ModuleLibrary.ts";
import { Snapper } from "./Snapper.ts";
import { rangeFromLocator } from "../../helpers/locator.ts";
import { forceWebkitRecalc } from "../../helpers/document.ts";
import { PatternAnalyzer } from "../../protection/PatternAnalyzer.ts";
import { SCROLL_PROTECTION_CONFIG } from "../../protection/config.ts";
import { BaseSuspiciousActivityEvent } from "../Peripherals.ts";

const SCROLL_SNAPPER_STYLE_ID = "readium-scroll-snapper-style";

export interface SuspiciousScrollingEvent extends BaseSuspiciousActivityEvent {
    type: "suspicious_scrolling";
    scrollDelta: number;
    scrollDirection: "up" | "down";
    targetElement: { tagName: string } | null;
}

export class ScrollSnapper extends Snapper {
    static readonly moduleName: ModuleName = "scroll_snapper";
    private wnd!: ReadiumWindow;
    private comms!: Comms;
    private resizeObserver!: ResizeObserver;
    private patternAnalyzer: PatternAnalyzer | null = null;
    private lastScrollTime: number = 0;
    private isScrollProtectionEnabled = false;

    private initialScrollHandled = false;
    private isScrolling = false;
    private lastScrollTop = 0;
    private isResizing = false;
    private resizeDebounce: number | null = null;

    private doc() {
        return this.wnd.document.scrollingElement as HTMLElement;
    }

    protected hasScrolledPast(el: Element): boolean {
        // go_id/go_text center the target in the viewport, not scroll it to the top —
        // so "reached" has to mean "crossed the viewport's vertical center", the same
        // line navigation scrolls to, not the top/bottom edge.
        const center = this.wnd.innerHeight / 2;
        return el.getBoundingClientRect().top <= center + this.wnd.innerHeight * Snapper.CENTER_TOLERANCE;
    }

    /**
     * Overlap as a fraction of the element's own height, matching IntersectionObserver's
     * intersectionRatio — a plain overlap test would keep a large wrapping element "in
     * band" for its entire on-screen span, masking smaller fragments nested inside it.
     */
    protected inCenterBand(el: Element): boolean {
        const rect = el.getBoundingClientRect();
        const center = this.wnd.innerHeight / 2;
        const tolerance = this.wnd.innerHeight * Snapper.CENTER_TOLERANCE;
        const bandTop = center - tolerance;
        const bandBottom = center + tolerance;
        if (rect.height === 0) {
            // Zero-area landmark: ratio is undefined (0/0) by spec — fall back to a point check.
            return rect.top <= bandBottom && rect.top >= bandTop;
        }
        const overlap = Math.max(0, Math.min(rect.bottom, bandBottom) - Math.max(rect.top, bandTop));
        return overlap / rect.height >= Snapper.CENTER_TOLERANCE;
    }

    /** Document-absolute (scrollTop-independent) leading-edge position. */
    protected fragmentStart(el: Element): number {
        return el.getBoundingClientRect().top + this.doc().scrollTop;
    }

    protected currentScrollExtent(): { pos: number; size: number } {
        return { pos: this.doc().scrollTop, size: this.wnd.innerHeight };
    }

    private reportProgress(forcedFragmentId?: string) {
        if (!this.comms.ready) return;
        // We have to round up the scroll position because
        // Android may never reach 100% of the scroll height
        // due to the way it rounds scrollTop…
        const scrollTop = Math.ceil(this.doc().scrollTop);
        const scrollHeight = this.doc().scrollHeight;
        const viewportHeight = this.wnd.innerHeight;
        const progress = Math.max(0, Math.min(1, scrollTop / scrollHeight));
        const viewportEnd = Math.max(0, Math.min(1, (scrollTop + viewportHeight) / scrollHeight));

        this.comms.send("progress", {
            start: progress,
            end: viewportEnd,
            fragmentId: forcedFragmentId !== undefined ? forcedFragmentId : this.currentTimelineFragment(),
            visibleFragmentIds: this.sortedVisibleFragmentIds()
        });
    }

    private handleScroll = (_e: Event) => {
        if (!this.comms.ready) return;

        // We have to filter scroll from resize events
        if (this.isResizing) {
            return;
        }

        // We have to filter the first scroll event because
        // it is triggered by the progression sync’ing
        // on load, and is not triggered by the user
        if (!this.initialScrollHandled) {
            this.lastScrollTop = this.doc().scrollTop;
            this.initialScrollHandled = true;
            this.reportProgress();
            return;
        }

        if (!this.isScrolling) {
            this.isScrolling = true;
            this.wnd.requestAnimationFrame(() => {
                this.reportProgress();

                const currentScrollTop = this.doc().scrollTop;
                const deltaY = currentScrollTop - this.lastScrollTop;
                this.lastScrollTop = currentScrollTop;

                if (this.isScrollProtectionEnabled && Math.abs(deltaY) > 5) { // Ignore tiny scrolls
                    const now = Date.now();
                    const timeDelta = now - (this.lastScrollTime || now);
                    if (this.patternAnalyzer) {
                        const isSuspicious = this.patternAnalyzer.analyze(
                            deltaY > 0 ? "down" : "up",
                            Math.abs(deltaY),
                            timeDelta
                        );
                        if (isSuspicious) {
                            const target = _e.target && "tagName" in _e.target ?
                                { tagName: (_e.target as Element).tagName } : null;

                            this.comms?.send("content_protection", {
                                type: "suspicious_scrolling",
                                timestamp: Date.now(),
                                scrollDelta: deltaY,
                                scrollDirection: deltaY > 0 ? "down" : "up",
                                targetElement: target
                            } as SuspiciousScrollingEvent);
                        }
                    }
                    this.lastScrollTime = now;
                }

                this.comms.send("scroll", deltaY);

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
        this.lastScrollTop = 0;
        this.isResizing = false;
        if (this.resizeDebounce) {
            this.wnd.clearTimeout(this.resizeDebounce);
            this.resizeDebounce = null;
        }

        wnd.navigator.epubReadingSystem && (wnd.navigator.epubReadingSystem.layoutStyle = "scrolling");

        // Add styling to hide the scrollbar
        const style = wnd.document.createElement("style");
        style.dataset.readium = "true";
        style.id = SCROLL_SNAPPER_STYLE_ID;
        style.textContent = `
        * {
            scrollbar-width: none; /* for Firefox */
        }

        body::-webkit-scrollbar {
            display: none; /* for Chrome, Safari, and Opera */
        }
        `;
        wnd.document.head.appendChild(style);

        // We have to debounce resize events so that
        // we don’t send scroll events when the user
        // resizes the window
        this.resizeObserver = new ResizeObserver(() => {
            if (this.resizeDebounce) {
                this.wnd.clearTimeout(this.resizeDebounce);
            }

            this.isResizing = true;
            this.resizeDebounce = this.wnd.setTimeout(() => {
                this.isResizing = false;
                this.resizeDebounce = null;
                this.refreshFragmentStarts();
                this.reportProgress();
            }, 50);
        });
        this.resizeObserver.observe(wnd.document.body);

        wnd.addEventListener("scroll", this.handleScroll, { passive: true });

        comms.register("force_webkit_recalc", ScrollSnapper.moduleName, () => {
            forceWebkitRecalc(this.wnd);

            // We absolutely must do this because overflown content
            // won’t be rendered if we do not trigger scroll…
            // Only the content at the start of the document,
            // whose height is the viewport height, will be rendered.
            const currentScroll = this.doc().scrollTop;
            if (currentScroll > 1) {
                this.doc().scrollTop = currentScroll - 1;
            } else {
                this.doc().scrollTop = currentScroll + 1;
            }
            this.doc().scrollTop = currentScroll;
        });

        comms.register("go_progression", ScrollSnapper.moduleName, (data, ack) => {
            const position = data as number;

            if (position < 0 || position > 1) {
                comms.send("error", {
                    message: "go_progression must be given a position from 0.0 to 1.0"
                });
                ack(false);
                return;
            }

            this.wnd.requestAnimationFrame(() => {
              this.doc().scrollTop = this.doc().offsetHeight * position;
              // No known target fragment for an arbitrary position — force a fresh
              // geometry scan instead of trusting a possibly-stale visibility cache.
              this.reportProgress(this.fragmentFromGeometry());
              deselect(this.wnd);
              ack(true);
          });
        });

        comms.register("go_id", ScrollSnapper.moduleName, (data, ack) => {
            const element = wnd.document.getElementById(data as string);
            if(!element) {
                ack(false);
                return;
            }
            this.wnd.requestAnimationFrame(() => {
                this.doc().scrollTop = element.getBoundingClientRect().top + wnd.scrollY - wnd.innerHeight / 2;
                const targetId = data as string;
                this.reportProgress(
                    this.timelineEntries.has(targetId) ? targetId : this.nearestPrecedingTimelineEntry(element)
                );
                deselect(this.wnd);
                ack(true);
            });
        });

        comms.register("go_text", ScrollSnapper.moduleName, (data, ack) => {
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
                this.doc().scrollTop = r.getBoundingClientRect().top + wnd.scrollY - wnd.innerHeight / 2;
                this.reportProgress(this.nearestPrecedingTimelineEntry(r.startContainer));
                deselect(this.wnd);
                ack(true);
            });
        });

        comms.register("go_start", ScrollSnapper.moduleName, (_, ack) => {
            if (this.doc().scrollTop === 0) return ack(false);
            this.doc().scrollTop = 0;
            // The first fragment isn't necessarily reached at document start
            // (there may be content before it) — check only that one element
            // instead of assuming sortedFragmentIds[0] is already visible.
            this.reportProgress(this.firstFragmentIfReached());
            ack(true);
        });

        comms.register("go_end", ScrollSnapper.moduleName, (_, ack) => {
            if (this.doc().scrollTop === this.doc().scrollHeight - this.doc().offsetHeight) return ack(false);
            this.doc().scrollTop = this.doc().scrollHeight - this.doc().offsetHeight;
            this.reportProgress(this.sortedFragmentIds[this.sortedFragmentIds.length - 1]);
            ack(true);
        })

        comms.register("unfocus", ScrollSnapper.moduleName, (_, ack) => {
            deselect(this.wnd);
            ack(true);
        });

        comms.register("scroll_protection", ScrollSnapper.moduleName, (_, ack) => {
            this.enableScrollProtection();
            ack(true);
        });

        comms.register([
            "go_next",
            "go_prev",
        ], ScrollSnapper.moduleName, (_, ack) => ack(false));

        comms.register("focus", ScrollSnapper.moduleName, (_, ack) => {
            this.reportProgress();
            ack(true);
        });

        comms.register("first_visible_locator", ScrollSnapper.moduleName, (_, ack) => {
            const locator = findFirstVisibleLocator(wnd as ReadiumWindow, true);
            this.comms.send("first_visible_locator", locator.serialize());
            ack(true);
        });

        comms.register("timeline_entries", ScrollSnapper.moduleName, (data, ack) => {
            this.updateTimelineEntries(Array.isArray(data) ? data as string[] : [], wnd);
            ack(true);
        });

        comms.log("ScrollSnapper Mounted");
        return true;
    }

    unmount(wnd: ReadiumWindow, comms: Comms): boolean {
        comms.unregisterAll(ScrollSnapper.moduleName);
        this.resizeObserver.disconnect();
        if (this.handleScroll) wnd.removeEventListener("scroll", this.handleScroll);
        wnd.document.getElementById(SCROLL_SNAPPER_STYLE_ID)?.remove();
        this.timelineEntries.clear();
        this.cachedFragmentIds = [];
        this.sortedFragmentIds = [];
        this.cachedFragmentStarts.clear();

        if (this.patternAnalyzer) {
            this.patternAnalyzer.clear();
            this.patternAnalyzer = null;
            this.isScrollProtectionEnabled = false;
        }

        comms.log("ScrollSnapper Unmounted");
        return true;
    }
}
