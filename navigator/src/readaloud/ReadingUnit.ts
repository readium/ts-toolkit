import { GuidedNavigationObject, Layout, Link, Profile } from "@readium/shared";
import { Navigator, VisualNavigatorViewport } from "../Navigator.ts";
import { GuidedNavigationSource } from "./GuidedNavigationSource.ts";

/** Reading order links whose Guided Navigation objects are read as one sequence. */
export interface ReadingUnit {
    links: Link[];
}

/**
 * Splits the publication into reading units: the displayed spread for fixed layouts, Divina excepted,
 * and a single resource otherwise. Spreads are only known to the navigator, so it's moved to find them.
 */
export class ReadingUnits {
    private readonly spreads: boolean;

    constructor(private readonly navigator: Navigator & { readonly viewport?: VisualNavigatorViewport }) {
        const metadata = navigator.publication.metadata;
        this.spreads = metadata.effectiveLayout === Layout.fixed && !metadata.conformsTo?.includes(Profile.DIVINA);
    }

    /** The unit containing `href`. */
    around(href: string): ReadingUnit | undefined {
        const link = this.navigator.publication.readingOrder.findWithHref(href);
        if (!link) return undefined;
        if (this.spreads && !this.displays(link.href)) this.navigator.go(link.locator, false, () => {});
        return this.displayedFrom(link, () => true);
    }

    /** The first link of the unit following `unit`, without moving the navigator. */
    linkAfter(unit: ReadingUnit): Link | undefined {
        const index = this.indexOf(unit.links[unit.links.length - 1]);
        return index < 0 ? undefined : this.navigator.publication.readingOrder.items[index + 1];
    }

    /** The last link of the unit preceding `unit`, without moving the navigator. */
    linkBefore(unit: ReadingUnit): Link | undefined {
        const index = this.indexOf(unit.links[0]);
        return index <= 0 ? undefined : this.navigator.publication.readingOrder.items[index - 1];
    }

    after(unit: ReadingUnit): ReadingUnit | undefined {
        const link = this.linkAfter(unit);
        if (!link) return undefined;
        const last = unit.links[unit.links.length - 1];
        if (this.spreads) this.move(last, link, (cb) => this.navigator.goForward(false, cb));
        return this.displayedFrom(link, displayed => this.indexOf(displayed) > this.indexOf(last));
    }

    before(unit: ReadingUnit): ReadingUnit | undefined {
        const link = this.linkBefore(unit);
        if (!link) return undefined;
        const first = unit.links[0];
        if (this.spreads) this.move(first, link, (cb) => this.navigator.goBackward(false, cb));
        return this.displayedFrom(link, displayed => this.indexOf(displayed) < this.indexOf(first));
    }

    /** Whether `href` is a page of the displayed spread. */
    displays(href: string): boolean {
        return this.spreads && (this.navigator.viewport?.readingOrder ?? []).includes(href);
    }

    // FXL navigators update their viewport synchronously, so it's read without waiting for the callback.
    private move(edge: Link, link: Link, step: (cb: (ok: boolean) => void) => void) {
        if (this.displays(edge.href)) step(() => {});
        else this.navigator.go(link.locator, false, () => {});
    }

    // The displayed pages kept by `keep`, if they include `link`, otherwise `link` alone.
    private displayedFrom(link: Link, keep: (displayed: Link) => boolean): ReadingUnit {
        if (!this.spreads) return { links: [link] };
        const links = (this.navigator.viewport?.readingOrder ?? [])
            .map(href => this.navigator.publication.readingOrder.findWithHref(href))
            .filter((displayed): displayed is Link => displayed !== undefined && keep(displayed))
            .sort((a, b) => this.indexOf(a) - this.indexOf(b));
        return links.some(displayed => displayed.href === link.href) ? { links } : { links: [link] };
    }

    private indexOf(link: Link): number {
        return this.navigator.publication.readingOrder.findIndexWithHref(link.href);
    }
}

export interface StitchedUnit {
    /** The unit's Guided Navigation objects, concatenated in reading order. */
    guided: GuidedNavigationObject[];
    /** Links whose objects couldn't be obtained, left out of `guided`. */
    failures: { link: Link; error: unknown }[];
}

/**
 * Concatenates the Guided Navigation objects of every link in the unit, in reading order,
 * fetching at most `concurrency` resources at once.
 */
export async function stitch(unit: ReadingUnit, source: GuidedNavigationSource, concurrency = 6): Promise<StitchedUnit> {
    const guides: (GuidedNavigationObject[] | undefined)[] = new Array(unit.links.length);
    const failures: { index: number; link: Link; error: unknown }[] = [];
    let next = 0;
    const worker = async () => {
        while (next < unit.links.length) {
            const index = next++;
            const link = unit.links[index];
            try {
                guides[index] = await source.guideFor(link);
            } catch (error) {
                failures.push({ index, link, error });
            }
        }
    };
    await Promise.all(Array.from({ length: Math.min(concurrency, unit.links.length) }, worker));
    return {
        guided: guides.flatMap(guide => guide ?? []),
        failures: failures.sort((a, b) => a.index - b.index).map(({ link, error }) => ({ link, error })),
    };
}
