import { Comms } from "../../comms/index.ts";
import { ReadiumWindow } from "../../helpers/dom.ts";
import { Module } from "../Module.ts";
import { ModuleName } from "../ModuleLibrary.ts";

const SNAPPER_STYLE_ID = "readium-snapper-style";

export abstract class Snapper extends Module {
    static readonly moduleName: ModuleName = "snapper";

    // Shared by every hasScrolledPast/inCenterBand implementation so they stay pinned to the
    // exact same boundary. Sized to comfortably exceed realistic scrollTop-rounding error
    // (~1px) while still reading as "the center", not a wide band.
    protected static readonly CENTER_TOLERANCE = 0.01;

    private protected = false;

    // Timeline fragment tracking
    protected timelineEntries: Map<string, Element> = new Map();
    protected cachedFragmentIds: string[] = [];
    // DOM-order-sorted fragment ids, recomputed only when entries are (re)populated —
    // sorting on every progress report (i.e. every scroll frame) is wasted work.
    protected sortedFragmentIds: string[] = [];
    // Document-absolute leading-edge position per fragment, refreshed on (re)population and
    // resize only, never per scroll frame. A single point, not a start/end range: some TOC
    // ids sit on wrapping elements that contain everything after them (a whole chapter's
    // <section>), so an element's own height isn't a trustworthy measure of where it ends.
    protected cachedFragmentStarts: Map<string, number> = new Map();

    private static inDomOrder(entries: Map<string, Element>, a: string, b: string): number {
        const ea = entries.get(a);
        const eb = entries.get(b);
        if (!ea || !eb) return 0;
        const cmp = ea.compareDocumentPosition(eb);
        return cmp & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1;
    }

    /**
     * Populates `timelineEntries`/`sortedFragmentIds` from a fresh id list, and refreshes
     * `cachedFragmentStarts` for the new elements. Shared by all snappers' `timeline_entries`
     * comms handler so DOM-order sorting and position caching only happen once per
     * (re)population, not per report.
     */
    protected updateTimelineEntries(ids: string[], wnd: ReadiumWindow): void {
        this.cachedFragmentIds = ids;
        this.timelineEntries.clear();
        this.cachedFragmentStarts.clear();
        for (const id of ids) {
            const el = wnd.document.getElementById(id);
            if (el) this.timelineEntries.set(id, el);
        }
        this.sortedFragmentIds = Array.from(this.timelineEntries.keys())
            .sort((a, b) => Snapper.inDomOrder(this.timelineEntries, a, b));
        this.refreshFragmentStarts();
    }

    /**
     * Recomputes `cachedFragmentStarts` for every tracked fragment. Call whenever layout may
     * have changed — on (re)population here, and from each snapper's own resize handler.
     */
    protected refreshFragmentStarts(): void {
        for (const [id, el] of this.timelineEntries) {
            this.cachedFragmentStarts.set(id, this.fragmentStart(el));
        }
    }

    /**
     * Axis-appropriate, document-absolute leading-edge position of `el`. Subclasses with a
     * scroll axis override this; `ColumnSnapper` doesn't use the cache (it has its own
     * rect-based visibility test) so keeps this no-op default.
     */
    protected fragmentStart(_el: Element): number {
        return 0;
    }

    /**
     * The current viewport's position and size along the scroll axis, in the same
     * document-absolute coordinate space as `fragmentStart`. Paired with it to test
     * on-screen-ness without any per-frame geometry read.
     */
    protected currentScrollExtent(): { pos: number; size: number } {
        return { pos: 0, size: 0 };
    }

    /**
     * Returns the nearest fragment at or before `node` in DOM (reading) order, with no
     * dependency on rendered geometry — safe to call for programmatic navigation where the
     * target is already known, regardless of whether layout has settled.
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
     * Rect-based scan for an accurate one-off read right after a programmatic jump
     * (go_id/go_text), before the next scroll event would otherwise refresh things: first
     * checks for a fragment currently in the center band, and only if none is currently in
     * the band falls back to the last fragment whose leading edge has been scrolled past.
     */
    protected fragmentFromGeometry(): string | undefined {
        for (const id of this.sortedFragmentIds) {
            const el = this.timelineEntries.get(id)!;
            if (this.inCenterBand(el)) return id;
        }

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
     * Returns the ID of the currently active timeline fragment: the last fragment in DOM
     * order whose cached leading edge is at or before the viewport's center point — the same
     * center line `hasScrolledPast`/`go_id`/`go_text` navigate to.
     */
    protected currentTimelineFragment(): string | undefined {
        const { pos, size } = this.currentScrollExtent();
        const center = pos + size / 2;
        let nearestId: string | undefined;
        for (const id of this.sortedFragmentIds) {
            const start = this.cachedFragmentStarts.get(id);
            if (start === undefined) continue;
            if (start <= center) nearestId = id;
            else break;
        }
        return nearestId;
    }

    /**
     * Every timeline fragment currently on screen, in DOM order — not just the single one
     * `currentTimelineFragment` picks. Since fragments are ordered points, not ranges, "on
     * screen" means the run of fragments whose leading edges fall between whichever one
     * governs the viewport's top edge and whichever falls before its bottom edge.
     */
    protected sortedVisibleFragmentIds(): string[] {
        const { pos, size } = this.currentScrollExtent();
        const bottom = pos + size;
        let from = -1;
        let to = -1;
        for (let i = 0; i < this.sortedFragmentIds.length; i++) {
            const start = this.cachedFragmentStarts.get(this.sortedFragmentIds[i]);
            if (start === undefined) continue;
            if (start <= pos) from = i;
            if (start < bottom) to = i;
        }
        if (from < 0) from = 0;
        if (to < from) return [];
        return this.sortedFragmentIds.slice(from, to + 1);
    }

    /**
     * Returns true if the element's leading edge (in reading direction) has been scrolled past
     * — i.e. the element is before the current viewport position.
     * Subclasses implement this for their specific scroll axis and reading direction.
     */
    protected abstract hasScrolledPast(el: Element): boolean;

    /**
     * Whether the element currently overlaps the viewport's center band, not merely
     * "already scrolled past" it. Defaults to `false` for subclasses with no center-line
     * concept (e.g. paginated `ColumnSnapper`).
     */
    protected inCenterBand(_el: Element): boolean {
        return false;
    }

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

        this.timelineEntries.clear();
        this.cachedFragmentIds = [];
        this.sortedFragmentIds = [];
        this.cachedFragmentStarts.clear();

        comms.log("Snapper Unmounted");
        return true;
    }
}
