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

    protected observeTimelineElements(wnd: ReadiumWindow): void {
        if (!this.timelineObserver) return;
        this.timelineObserver.disconnect();
        this.visibleFragmentIds.clear();
        this.timelineEntries.clear();
        for (const id of this.cachedFragmentIds) {
            const el = wnd.document.getElementById(id);
            if (el) {
                this.timelineEntries.set(id, el);
                this.timelineObserver.observe(el);
            }
        }
    }

    /**
     * Returns the ID of the currently active timeline fragment:
     * 1. Primary — IntersectionObserver: returns the first visible element in DOM (reading) order.
     *    This is direction-agnostic; works for LTR, RTL, and vertical writing modes.
     * 2. Fallback — rect scan: used when IntersectionObserver hasn't fired yet (e.g. programmatic
     *    navigation). Iterates elements in DOM order, returns the last one whose leading edge has
     *    already been scrolled past. Subclasses implement `hasScrolledPast` for their layout.
     */
    protected currentTimelineFragment(): string | undefined {
        const inDomOrder = (a: string, b: string): number => {
            const ea = this.timelineEntries.get(a);
            const eb = this.timelineEntries.get(b);
            if (!ea || !eb) return 0;
            const cmp = ea.compareDocumentPosition(eb);
            return cmp & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1;
        };

        if (this.visibleFragmentIds.size > 0) {
            return Array.from(this.visibleFragmentIds).sort(inDomOrder)[0];
        }

        // Fallback: last element in DOM order whose leading edge has been scrolled past
        const sorted = Array.from(this.timelineEntries.keys()).sort(inDomOrder);
        let nearestId: string | undefined;
        for (const id of sorted) {
            const el = this.timelineEntries.get(id)!;
            if (this.hasScrolledPast(el)) nearestId = id;
            else break;
        }
        return nearestId;
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
