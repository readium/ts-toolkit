import { Link, Links } from "../../Link.ts";
import { Locator } from "../../Locator.ts";
import { TimelineItem } from "./TimelineItem.ts";
import { isNptStartOfResource, parseNptTime } from "../../../util/npt.ts";

interface PublicationLike {
    toc?: Links;
    readingOrder: Links;
}

/**
 * A publication's timeline, built once from its reading order and table of contents.
 *
 * **Source of truth**: the reading order.  Every reading order item becomes
 * exactly one top-level `TimelineItem`.  The TOC is consulted to:
 *   1. Derive a display title when the reading order item has none.
 *   2. Populate flat children — all TOC fragment entries that reference the
 *      resource, collected depth-first in TOC declaration order.
 *
 * No TOC hierarchy is reconstructed; that requires role context and is not yet
 * implemented.  TOC entries whose href does not match any reading order item
 * are ignored.
 *
 * The `depth` build option limits how many levels deep into the TOC tree both
 * title resolution and child collection may look.  Level 1 = top-level TOC
 * entries; level 2 = their children; etc.  `undefined` means no limit.
 */
export class Timeline {
    private readonly _allItems: TimelineItem[];
    private readonly linkMap: Map<TimelineItem, Link>;
    private _depth: number | undefined;
    private _items: TimelineItem[] | undefined;
    private _flat: TimelineItem[] | undefined;
    /** Populated when depth is set; maps cloned items from trimToDepth back to their Links. */
    private _trimmedLinkMap: Map<TimelineItem, Link> = new Map();

    constructor(items: TimelineItem[], linkMap: Map<TimelineItem, Link>) {
        this._allItems = items;
        this.linkMap = linkMap;
    }

    static build(publication: PublicationLike, options: { depth?: number } = {}): Timeline {
        const tocLinks = publication.toc?.items ?? [];
        const roLinks = publication.readingOrder.items;
        const { depth } = options;
        const linkMap = new Map<TimelineItem, Link>();
        const items: TimelineItem[] = [];

        for (let i = 0; i < roLinks.length; i++) {
            const ro = roLinks[i];
            const bare = Timeline.bareHref(ro.href);

            const title =
                ro.title ??
                Timeline.findTitleInToc(tocLinks, bare, depth) ??
                `Resource ${i + 1}`;

            const tocChildren = Timeline.collectChildrenFromToc(tocLinks, bare, depth, 1, linkMap);

            const item: TimelineItem = {
                title,
                references: [ro.href],
                children: tocChildren.length > 0 ? tocChildren : undefined,
            };

            linkMap.set(item, ro);
            items.push(item);
        }

        return new Timeline(items, linkMap);
    }

    /**
     * The active depth limit for TOC traversal (title resolution and child
     * collection).  `undefined` means unlimited.  Setting the same value again
     * is a no-op; a new value invalidates the cached items and flat list.
     */
    get depth(): number | undefined {
        return this._depth;
    }

    set depth(value: number | undefined) {
        if (this._depth === value) return;
        this._depth = value;
        this._items = undefined;
        this._flat = undefined;
    }

    /** Top-level timeline items.  Cached; invalidated when `depth` changes. */
    get items(): TimelineItem[] {
        if (!this._items) {
            if (this._depth !== undefined) {
                this._trimmedLinkMap = new Map();
                this._items = Timeline.trimToDepth(this._allItems, this._depth, this.linkMap, this._trimmedLinkMap);
            } else {
                this._items = this._allItems;
            }
        }
        return this._items;
    }

    locate(locator: Locator): TimelineItem | undefined {
        const href = locator.href.split("#")[0];
        const time = locator.locations?.time();

        let match: TimelineItem | undefined;

        if (time !== undefined) {
            let bestTime = -Infinity;
            for (const item of this.flat) {
                const t = this.itemStartTime(item, href);
                if (t !== undefined && t <= time && t > bestTime) {
                    bestTime = t;
                    match = item;
                }
            }
        }

        if (!match) {
            match = this.flat.find(item => this.bareHrefFromItem(item) === href);
        }

        return match;
    }

    adjacentTo(item: TimelineItem): { previous: TimelineItem | undefined; next: TimelineItem | undefined } {
        const index = this.flat.indexOf(item);
        return {
            previous: index > 0 ? this.flat[index - 1] : undefined,
            next: index >= 0 && index < this.flat.length - 1 ? this.flat[index + 1] : undefined,
        };
    }

    segmentsForHref(href: string): TimelineItem[] {
        const bare = href.split("#")[0];
        const item = this.items.find(i => this.bareHrefFromItem(i) === bare);
        if (!item) return [];
        return item.children?.length ? item.children : [item];
    }

    itemAtProgression(href: string, progression: number, duration?: number): TimelineItem | undefined {
        const bare = href.split("#")[0];
        const item = this.items.find(i => this.bareHrefFromItem(i) === bare);
        if (!item) return undefined;
        if (!item.children?.length) return item;

        if (duration !== undefined) {
            const time = progression * duration;
            let match: TimelineItem = item;
            let bestTime = -Infinity;
            for (const child of item.children) {
                const t = this.timeFromItem(child);
                if (t !== undefined && t <= time && t > bestTime) {
                    bestTime = t;
                    match = child;
                }
            }
            return match;
        }

        const index = Math.min(Math.floor(progression * item.children.length), item.children.length - 1);
        return item.children[index];
    }

    ancestors(item: TimelineItem): TimelineItem[] {
        return this.ancestorPath(this.items, item) ?? [];
    }

    linkFor(item: TimelineItem): Link | undefined {
        return this.linkMap.get(item) ?? this._trimmedLinkMap.get(item);
    }

    private get flat(): TimelineItem[] {
        if (!this._flat) this._flat = this.flattenItems(this.items);
        return this._flat;
    }

    // -------------------------------------------------------------------------
    // TOC title resolution
    // -------------------------------------------------------------------------

    /**
     * Resolve a display title for `bare` from the TOC, looking no deeper than
     * `maxDepth` levels (1 = top-level entries only).  Priority:
     *   1. A start-of-resource entry: bare href or `#t=0` (audio).
     *   2. Exactly one fragment entry referencing this resource — unambiguous.
     *   3. Multiple fragment entries — ambiguous, returns `undefined`.
     */
    private static findTitleInToc(
        tocLinks: Link[],
        bare: string,
        maxDepth: number | undefined,
    ): string | undefined {
        const { atStart, fragments } = Timeline.collectTocCandidates(tocLinks, bare, maxDepth, 1);
        if (atStart.length > 0) return atStart[0].title!;
        if (fragments.length === 1) return fragments[0].title!;
        return undefined;
    }

    /**
     * Collect all TOC entries that reference `bare` as flat children, walking
     * up to `maxDepth` levels deep.  Start-of-resource entries (#t=0 or no
     * fragment) are excluded — they contribute to title resolution, not children.
     * Order follows TOC declaration (depth-first).
     */
    private static collectChildrenFromToc(
        tocLinks: Link[],
        bare: string,
        maxDepth: number | undefined,
        currentDepth: number,
        linkMap: Map<TimelineItem, Link>,
    ): TimelineItem[] {
        if (maxDepth !== undefined && currentDepth > maxDepth) return [];

        const result: TimelineItem[] = [];

        for (const link of tocLinks) {
            if (Timeline.bareHref(link.href) === bare && link.title && !Timeline.isStartOfResource(link.href)) {
                const child: TimelineItem = { title: link.title, references: [link.href] };
                linkMap.set(child, link);
                result.push(child);
            }

            if (link.children?.items?.length) {
                result.push(...Timeline.collectChildrenFromToc(
                    link.children.items, bare, maxDepth, currentDepth + 1, linkMap,
                ));
            }
        }

        return result;
    }

    /**
     * Walk the TOC tree up to `maxDepth` levels and collect all entries whose
     * bare href matches `bare`, split into start-of-resource entries and
     * fragment entries.
     */
    private static collectTocCandidates(
        tocLinks: Link[],
        bare: string,
        maxDepth: number | undefined,
        currentDepth: number,
    ): { atStart: Link[]; fragments: Link[] } {
        if (maxDepth !== undefined && currentDepth > maxDepth) {
            return { atStart: [], fragments: [] };
        }

        const atStart: Link[] = [];
        const fragments: Link[] = [];

        for (const link of tocLinks) {
            if (Timeline.bareHref(link.href) === bare && link.title) {
                if (Timeline.isStartOfResource(link.href)) {
                    atStart.push(link);
                } else {
                    fragments.push(link);
                }
            }

            if (link.children?.items?.length) {
                const child = Timeline.collectTocCandidates(
                    link.children.items, bare, maxDepth, currentDepth + 1,
                );
                atStart.push(...child.atStart);
                fragments.push(...child.fragments);
            }
        }

        return { atStart, fragments };
    }

    /**
     * A TOC href points to the start of its resource when it has no fragment,
     * or when the fragment contains a parsable NPT `t=` value of 0 (audio:
     * explicit beginning of the file).
     */
    private static isStartOfResource(href: string): boolean {
        const fragment = href.split("#")[1];
        if (!fragment) return true;
        const match = fragment.match(/(?:^|&)t=([^&]+)/);
        return match !== null && isNptStartOfResource(match[1]);
    }

    // -------------------------------------------------------------------------
    // Shared utilities
    // -------------------------------------------------------------------------

    private static trimToDepth(
        items: TimelineItem[],
        remaining: number,
        sourceMap: Map<TimelineItem, Link>,
        targetMap: Map<TimelineItem, Link>,
    ): TimelineItem[] {
        return items.map(item => {
            const clone: TimelineItem = {
                ...item,
                children: remaining > 1 && item.children?.length
                    ? Timeline.trimToDepth(item.children, remaining - 1, sourceMap, targetMap)
                    : undefined,
            };
            const link = sourceMap.get(item);
            if (link) targetMap.set(clone, link);
            return clone;
        });
    }

    private flattenItems(items: TimelineItem[]): TimelineItem[] {
        const result: TimelineItem[] = [];
        for (const item of items) {
            result.push(item);
            if (item.children) result.push(...this.flattenItems(item.children));
        }
        return result;
    }

    private itemStartTime(item: TimelineItem, href: string): number | undefined {
        for (const ref of item.references) {
            const hashIndex = ref.indexOf("#");
            const refHref = hashIndex >= 0 ? ref.slice(0, hashIndex) : ref;
            const refFragment = hashIndex >= 0 ? ref.slice(hashIndex + 1) : undefined;
            const effectiveHref = refHref || this.bareHrefFromItem(item);
            if (effectiveHref !== href) continue;
            if (!refFragment) return undefined;
            const match = refFragment.match(/(?:^|&)t=([^&]+)/);
            return match ? parseNptTime(match[1]) : undefined;
        }
        return undefined;
    }

    private bareHrefFromItem(item: TimelineItem): string {
        return (item.references[0] ?? "").split("#")[0];
    }

    private timeFromItem(item: TimelineItem): number | undefined {
        const ref = item.references[0];
        if (!ref) return undefined;
        const fragment = ref.split("#")[1];
        if (!fragment) return undefined;
        const match = fragment.match(/(?:^|&)t=([^&]+)/);
        return match ? parseNptTime(match[1]) : undefined;
    }

    private ancestorPath(items: TimelineItem[], target: TimelineItem): TimelineItem[] | null {
        for (const item of items) {
            if (item === target) return [];
            if (item.children) {
                const path = this.ancestorPath(item.children, target);
                if (path !== null) return [item, ...path];
            }
        }
        return null;
    }

    private static bareHref(href: string): string {
        return href.split("#")[0];
    }
}
