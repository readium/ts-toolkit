import { GuidedNavigationObject, Link, Publication } from "@readium/shared";
import { GuidedNavigationSource } from "./GuidedNavigationSource.ts";

/**
 * What gets stitched and read as one sequence:
 * - "publication": the whole reading order, for fixed layouts where sentences continue across pages.
 * - "resource": each resource on its own.
 */
export type ReadingUnitScope = "publication" | "resource";

/** Reading order links whose Guided Navigation objects are read as one sequence. */
export interface ReadingUnit {
    links: Link[];
}

export function readingUnits(publication: Publication, scope: ReadingUnitScope): ReadingUnit[] {
    const links = publication.readingOrder.items;
    if (scope === "publication") return links.length > 0 ? [{ links }] : [];
    return links.map(link => ({ links: [link] }));
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
