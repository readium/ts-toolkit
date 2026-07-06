import { Comms } from "../../comms/index.ts";
import { ReadiumWindow } from "../../helpers/dom.ts";
import { Module } from "../Module.ts";
import { ModuleName } from "../ModuleLibrary.ts";

const SNAPPER_STYLE_ID = "readium-snapper-style";

export abstract class Snapper extends Module {
    static readonly moduleName: ModuleName = "snapper";

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

    protected setupTimelineObserver(): void {
        if (this.timelineObserver) this.timelineObserver.disconnect();
        this.timelineObserver = new IntersectionObserver(
            (entries) => {
                for (const entry of entries) {
                    if (entry.isIntersecting)
                        this.visibleFragmentIds.add((entry.target as HTMLElement).id);
                    else
                        this.visibleFragmentIds.delete((entry.target as HTMLElement).id);
                }
            },
            { threshold: [0.01] }
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
    protected nearestPrecedingFragmentId(node: Node): string | undefined {
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
