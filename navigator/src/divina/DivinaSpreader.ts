import { Link, Page, Publication, ReadingProgression } from "@readium/shared";
import { Orientation, Spread } from "../epub/fxl/FXLSpreader.ts";

/**
 * A single page of a Divina publication, with its resolved layout properties.
 * Unlike FXLSpreader, this model never mutates the publication's links.
 */
export class DivinaPage {
    readonly link: Link;
    readonly index: number; // Index in the reading order
    page: Page = Page.center; // Resolved position within a spread
    isLandscape: boolean;
    addBlank = false; // Orphaned single page that must occupy a full spread on its own

    constructor(link: Link, index: number) {
        this.link = link;
        this.index = index;
        const orientation = link.properties?.otherProperties["orientation"];
        this.isLandscape = orientation === Orientation.landscape ||
            (orientation !== Orientation.portrait && (link.width || 0) > (link.height || 0));
    }

    /** 1-based page number */
    get number(): number {
        return this.index + 1;
    }

    get authoredPage(): Page | undefined {
        return this.link.properties?.page;
    }

    /** Whether this page occupies both slots of a spread in double-page mode */
    get double(): boolean {
        return this.page === Page.center || this.isLandscape || this.addBlank;
    }
}

/**
 * Computes synthetic spreads for a Divina publication from the `page`
 * (left/right/center) link properties, falling back to computed alternation.
 *
 * Slot model (used by the paged presenter): in double-page mode every spread
 * occupies exactly two slots — a pair is 1+1, and a lone page (center,
 * landscape or orphaned/addBlank) takes a double-width slot. This keeps
 * slide indices (always even) aligned with spread boundaries.
 */
export class DivinaSpreader {
    readonly rtl: boolean;
    shift = true; // Whether the first page stands alone (cover)
    pages: DivinaPage[] = [];
    spreads: DivinaPage[][] = [];
    private itemToSlotArr: number[] = [];
    private slotToItemArr: number[] = [];
    private spreadOfItemArr: number[] = [];

    constructor(publication: Publication) {
        this.rtl = publication.metadata.effectiveReadingProgression === ReadingProgression.rtl;
        this.pages = publication.readingOrder.items.map((link, index) => new DivinaPage(link, index));
        this.index();
        this.testShift();
        this.buildSlots();
    }

    private index(redo = false) {
        let nDouble = 0;
        this.pages.forEach((page, index) => {
            if(!page.authoredPage || redo) {
                page.page = page.isLandscape ?
                    Page.center :
                    ((((this.shift ? 0 : 1) + index - nDouble) % 2) ?
                        (this.rtl ? Page.right : Page.left) :
                        (this.rtl ? Page.left : Page.right));
            } else {
                page.page = page.authoredPage;
            }
            if(page.double)
                nDouble++;
        });
        this.buildSpreads();
    }

    private testShift() {
        let wasLastSingle = false;
        this.spreads.forEach((spread, index) => {
            if(spread.length > 1) {
                wasLastSingle = false;
                return; // Only interested in single-page "spreads"
            }
            const single = spread[0];

            // First page is landscape/spread-both means no shift
            if(index === 0 && (single.isLandscape || single.link.properties?.otherProperties["spread"] === Spread.both))
                this.shift = false;

            // If the last spread was a true single, and this spread is a center page,
            // the single was an orphaned half of a double page spread: pad it.
            if(wasLastSingle && single.page === Page.center)
                this.spreads[index - 1][0].addBlank = true;

            // An orphaned component of a double page spread (that's not the first page)
            if(!single.isLandscape && single.page !== Page.center && single.index > 0)
                wasLastSingle = true;
            else
                wasLastSingle = false;
        });
        if(!this.shift) {
            this.spreads = [];
            this.index(true); // Re-index spreads
        }
    }

    private buildSpreads() {
        this.spreads = [];
        let currentSet: DivinaPage[] = [];
        this.pages.forEach((page, index) => {
            if(!index && this.shift) {
                this.spreads.push([page]);
            } else if(page.page === Page.center) {
                // A center (single) page spread: push immediately and reset current set
                if(currentSet.length > 0) this.spreads.push(currentSet);
                this.spreads.push([page]);
                currentSet = [];
            } else if(currentSet.length >= 2) { // Spread has max 2 pages
                this.spreads.push(currentSet);
                currentSet = [page];
            } else
                currentSet.push(page);
        });
        if(currentSet.length > 0) this.spreads.push(currentSet);
    }

    /**
     * Builds the item <-> slot mappings for double-page mode.
     * Slots are consumed in spread order; every spread takes exactly two slots.
     */
    private buildSlots() {
        this.itemToSlotArr = new Array(this.pages.length);
        this.slotToItemArr = [];
        this.spreadOfItemArr = new Array(this.pages.length);
        let slot = 0;
        this.spreads.forEach((spread, spreadIndex) => {
            spread.forEach((page) => {
                this.itemToSlotArr[page.index] = slot;
                this.spreadOfItemArr[page.index] = spreadIndex;
                const width = spread.length === 1 ? 2 : 1;
                for (let i = 0; i < width; i++)
                    this.slotToItemArr[slot + i] = page.index;
                slot += width;
            });
        });
    }

    /** Total number of slots (spread mode). Always even. */
    get slotCount(): number {
        return this.slotToItemArr.length;
    }

    /** Count of pages that take a double-width slot in spread mode */
    get nDouble(): number {
        return this.pages.reduce((n, p) => n + (p.double ? 1 : 0), 0);
    }

    slotOfItem(itemIndex: number): number {
        return this.itemToSlotArr[Math.max(0, Math.min(itemIndex, this.pages.length - 1))] ?? 0;
    }

    itemOfSlot(slot: number): number {
        return this.slotToItemArr[Math.max(0, Math.min(slot, this.slotToItemArr.length - 1))] ?? 0;
    }

    spreadIndexOfItem(itemIndex: number): number {
        return this.spreadOfItemArr[Math.max(0, Math.min(itemIndex, this.pages.length - 1))] ?? 0;
    }

    spreadOfItem(itemIndex: number): DivinaPage[] {
        return this.spreads[this.spreadIndexOfItem(itemIndex)];
    }

    /**
     * Whether the page occupies a full spread on its own in double-page mode
     * (and therefore takes a double-width slot). This mirrors buildSlots()
     * exactly: any page alone in its spread is double.
     */
    isDouble(itemIndex: number): boolean {
        return this.spreadOfItem(itemIndex)?.length === 1;
    }

    findByHref(href: string): DivinaPage | undefined {
        return this.pages.find(p => p.link.href === href);
    }

    /**
     * The position of a page within a spread, viewport-wise:
     * left/right of the gutter, or centered when displayed alone.
     */
    spreadPosition(spread: DivinaPage[], target: DivinaPage, perPage: number): Page {
        if(perPage < 2 || spread.length < 2) return Page.center;
        return target === spread[0] ?
            (this.rtl ? Page.right : Page.left) :
            (this.rtl ? Page.left : Page.right);
    }
}
