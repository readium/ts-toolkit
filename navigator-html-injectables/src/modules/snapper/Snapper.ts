import { Comms } from "../../comms/index.ts";
import { ReadiumWindow } from "../../helpers/dom.ts";
import { Module } from "../Module.ts";
import { ModuleName } from "../ModuleLibrary.ts";

const SNAPPER_STYLE_ID = "readium-snapper-style";

export abstract class Snapper extends Module {
    static readonly moduleName: ModuleName = "snapper";

    // Shared by the observer's rootMargin and every hasScrolledPast implementation so both
    // stay pinned to the exact same boundary. Sized to comfortably exceed realistic
    // scrollTop-rounding error (~1px) while still reading as "the center", not a wide band.
    protected static readonly CENTER_TOLERANCE = 0.01;

    private protected = false;

    // Timeline fragment tracking
    protected timelineObserver: IntersectionObserver | null = null;
    protected timelineEntries: Map<string, Element> = new Map();
    protected visibleFragmentIds: Set<string> = new Set();
    protected cachedFragmentIds: string[] = [];
    // DOM-order-sorted fragment ids, recomputed only when entries are (re)populated —
    // sorting on every progress report (i.e. every scroll frame) is wasted work.
    protected sortedFragmentIds: string[] = [];

    private static inDomOrder(entries: Map<string, Element>, a: string, b: string): number {
        const ea = entries.get(a);
        const eb = entries.get(b);
        if (!ea || !eb) return 0;
        const cmp = ea.compareDocumentPosition(eb);
        return cmp & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1;
    }

    /**
     * A zero-area target (e.g. an empty `<a id="…">` landmark) always has
     * intersectionRatio 0 by spec, so `isIntersecting` can never become true for it —
     * no threshold value changes that. For those entries, fall back to a geometric
     * containment check against `rootBounds` instead of trusting `isIntersecting`.
     */
    private static isVisibleEntry(entry: IntersectionObserverEntry): boolean {
        const rect = entry.boundingClientRect;
        // Element has real width and height: isIntersecting is spec-correct, trust it as-is.
        if (rect.width > 0 && rect.height > 0) return entry.isIntersecting;
        // Zero-width or zero-height element: isIntersecting is stuck at false (ratio is
        // area / 0, defined as 0), so it can't be trusted. Do our own overlap check instead.
        const root = entry.rootBounds;
        if (!root) return entry.isIntersecting;
        return rect.left <= root.right && rect.right >= root.left &&
            rect.top <= root.bottom && rect.bottom >= root.top;
    }

    /**
     * Collapses the observer's root to a thin band around the same center line
     * `hasScrolledPast` tests against (go_id/go_text navigate by centering the target, not by
     * aligning it to an edge), so "intersecting" and "scrolled past" can't disagree about
     * where "current" is. A literal zero-height root would make every intersection area zero
     * — isIntersecting would never fire — so CENTER_TOLERANCE leaves it a real, if thin, band.
     * Percentage-based margins track viewport resizes automatically, no re-setup needed.
     */
    protected setupTimelineObserver(axis: "vertical" | "horizontal" = "vertical"): void {
        if (this.timelineObserver) this.timelineObserver.disconnect();
        const inset = `-${50 - Snapper.CENTER_TOLERANCE * 100}%`;
        this.timelineObserver = new IntersectionObserver(
            (entries) => {
                for (const entry of entries) {
                    if (Snapper.isVisibleEntry(entry))
                        this.visibleFragmentIds.add((entry.target as HTMLElement).id);
                    else
                        this.visibleFragmentIds.delete((entry.target as HTMLElement).id);
                }
            },
            {
                threshold: [0.01],
                rootMargin: axis === "vertical" ? `${inset} 0px ${inset} 0px` : `0px ${inset} 0px ${inset}`
            }
        );
    }

    /**
     * Populates `timelineEntries`/`sortedFragmentIds` from a fresh id list, and
     * (re)starts IntersectionObserver-based visibility tracking for subclasses that use it.
     * Shared by all snappers' `timeline_entries` comms handler so DOM-order sorting and
     * observer bookkeeping only happen once per (re)population, not per report.
     */
    protected updateTimelineEntries(ids: string[], wnd: ReadiumWindow): void {
        this.cachedFragmentIds = ids;
        this.timelineObserver?.disconnect();
        this.visibleFragmentIds.clear();
        this.timelineEntries.clear();
        for (const id of ids) {
            const el = wnd.document.getElementById(id);
            if (el) {
                this.timelineEntries.set(id, el);
                this.timelineObserver?.observe(el);
            }
        }
        this.sortedFragmentIds = Array.from(this.timelineEntries.keys())
            .sort((a, b) => Snapper.inDomOrder(this.timelineEntries, a, b));
    }

    /**
     * Returns the nearest fragment at or before `node` in DOM (reading) order, with no
     * dependency on rendered geometry — safe to call for programmatic navigation where the
     * target is already known, regardless of whether layout/IntersectionObserver has settled.
     */
    protected nearestPrecedingTimelineEntry(node: Node): string | undefined {
        let nearestId: string | undefined;
        for (const id of this.sortedFragmentIds) {
            const el = this.timelineEntries.get(id)!;
            const cmp = el.compareDocumentPosition(node);
            const nodeFollowsEl = el === node || el.contains(node) ||
                (cmp & Node.DOCUMENT_POSITION_FOLLOWING) !== 0;
            if (nodeFollowsEl) nearestId = id;
            else break;
        }
        return nearestId;
    }

    /**
     * Rect-based scan: last element in DOM order whose leading edge has already been
     * scrolled past. Subclasses implement `hasScrolledPast` for their layout/axis.
     * Exposed so callers can force an accurate one-off geometry check (e.g. right after
     * a `go_progression` jump) instead of trusting a possibly-stale visibility cache.
     */
    protected fragmentFromGeometry(): string | undefined {
        let nearestId: string | undefined;
        for (const id of this.sortedFragmentIds) {
            const el = this.timelineEntries.get(id)!;
            if (this.hasScrolledPast(el)) nearestId = id;
            else break;
        }
        return nearestId;
    }

    /**
     * go_start-specific check: whether the first known fragment's leading edge has
     * already been scrolled past, checking only that one element rather than scanning
     * the whole timeline. At document start there is nothing before the first fragment
     * to confuse the result, so a single rect check is sufficient (and cheaper than
     * `fragmentFromGeometry`).
     */
    protected firstFragmentIfReached(): string | undefined {
        const id = this.sortedFragmentIds[0];
        if (id === undefined) return undefined;
        const el = this.timelineEntries.get(id)!;
        return this.hasScrolledPast(el) ? id : undefined;
    }

    /**
     * Returns the ID of the currently active timeline fragment:
     * 1. Primary — IntersectionObserver: returns the first visible element in DOM (reading) order.
     *    This is direction-agnostic; works for LTR, RTL, and vertical writing modes. Reliable for
     *    continuous, gradual scrolling.
     * 2. Fallback — rect scan (`fragmentFromGeometry`): used when IntersectionObserver hasn't
     *    fired yet. Not reliable right after an instantaneous programmatic jump — callers that
     *    know the target (goTo-style navigation) should bypass this method entirely.
     */
    protected currentTimelineFragment(): string | undefined {
        if (this.visibleFragmentIds.size > 0) {
            return Array.from(this.visibleFragmentIds)
                .sort((a, b) => Snapper.inDomOrder(this.timelineEntries, a, b))[0];
        }
        return this.fragmentFromGeometry();
    }

    /**
     * Returns true if the element's leading edge (in reading direction) has been scrolled past
     * — i.e. the element is before the current viewport position.
     * Subclasses implement this for their specific scroll axis and reading direction.
     */
    protected abstract hasScrolledPast(el: Element): boolean;

    buildStyles() {
        return `
        html, body {
            touch-action: manipulation;
            user-select: ${this.protected ? "none" : "auto"};
        }`;
    }

    mount(wnd: ReadiumWindow, comms: Comms): boolean {
        const d = wnd.document.createElement("style");
        d.dataset.readium = "true";
        d.id = SNAPPER_STYLE_ID;
        d.textContent = this.buildStyles();
        wnd.document.head.appendChild(d);

        comms.register("protect", Snapper.moduleName, (_, ack) => {
            this.protected = true;
            d.textContent = this.buildStyles();
            ack(true);
        });
        comms.register("unprotect", Snapper.moduleName, (_, ack) => {
            this.protected = false;
            d.textContent = this.buildStyles();
            ack(true);
        });

        comms.log("Snapper Mounted");
        return true;
    }

    unmount(wnd: ReadiumWindow, comms: Comms): boolean {
        wnd.document.getElementById(SNAPPER_STYLE_ID)?.remove();

        comms.log("Snapper Unmounted");
        return true;
    }
}
