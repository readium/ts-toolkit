import { Link, Links } from "../../Link.ts";
import { Locator } from "../../Locator.ts";
import { getHtmlId, getTime } from "../../html/Locations.ts";
import { Profile } from "../../Profiles.ts";
import { formatNptTime, isNptStartOfResource, parseNptTime } from "../../../util/npt.ts";
import { TimelineItem } from "./TimelineItem.ts";

export interface PublicationLike {
    toc?: Links;
    readingOrder: Links;
    metadata?: { conformsTo?: Profile[] };
}

/**
 * A TOC entry, mirroring `publication.toc`'s authored hierarchy and
 * contextualized with display-ready progression.  When a publication has no
 * `toc` at all, falls back to one flat entry per reading-order item.
 *
 * Exactly one of `position`/`timestamp` is populated, depending on the
 * publication's profile.
 */
export interface ContextualizedTocEntry {
    link: Link;
    /** Display-ready label for non-audio profiles: a Positions List position for EPUB, a page number for PDF (e.g. "42"). */
    position?: string;
    /** Display-ready formatted time for audiobooks (e.g. "27:27"). */
    timestamp?: string;
    children?: ContextualizedTocEntry[];
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
 * `contextualizedToc` returns the authored TOC hierarchy (see
 * `ContextualizedTocEntry`), each entry contextualized with progression.
 * `tocEntryFor(item)` maps a `TimelineItem` (e.g. from
 * `locate()`) back to its entry in that hierarchy.  TOC entries whose href
 * does not match any reading order item are ignored.
 *
 * The `depth` build option limits how many levels deep into the TOC tree
 * title resolution, child collection, and `contextualizedToc` traversal may
 * look.  Level 1 = top-level TOC entries; level 2 = their children; etc.
 * `undefined` means no limit.
 */
export class Timeline {
    private readonly _allItems: TimelineItem[];
    private readonly linkMap: Map<TimelineItem, Link>;
    private readonly _conformsTo: readonly Profile[];
    private readonly tocLinks: Link[];
    private _depth: number | undefined;
    /**
     * Depth used for `contextualizedToc` traversal.  Tracks `_depth`, but is
     * seeded independently from `Timeline.build()`'s `depth` option: unlike
     * `_depth`, which only ever triggers `items`/`flat` re-trimming via the
     * runtime `depth` setter, the TOC tree is walked fresh from `tocLinks`
     * every time, so there's no equivalent "already baked in, don't reapply"
     * hazard to avoid.
     */
    private _tocDepth: number | undefined;
    private _items: TimelineItem[] | undefined;
    private _flat: TimelineItem[] | undefined;
    private _toc: ContextualizedTocEntry[] | undefined;
    private _linkToItem: Map<Link, TimelineItem> | undefined;
    /** Populated when depth is set; maps cloned items from trimToDepth back to their Links. */
    private _trimmedLinkMap: Map<TimelineItem, Link> = new Map();

    constructor(
        items: TimelineItem[],
        linkMap: Map<TimelineItem, Link>,
        conformsTo: readonly Profile[] = [],
        tocLinks: Link[] = [],
        tocDepth: number | undefined = undefined,
    ) {
        this._allItems = items;
        this.linkMap = linkMap;
        this._conformsTo = conformsTo;
        this.tocLinks = tocLinks;
        this._tocDepth = tocDepth;
    }

    static build(
        publication: PublicationLike,
        options: { depth?: number } = {},
    ): Timeline {
        const tocLinks = publication.toc?.items ?? [];
        const roLinks = publication.readingOrder.items;
        const { depth } = options;
        const conformsTo = publication.metadata?.conformsTo ?? [];
        const linkMap = new Map<TimelineItem, Link>();
        const items: TimelineItem[] = [];

        for (let i = 0; i < roLinks.length; i++) {
            const ro = roLinks[i];
            const bare = Timeline.bareHref(ro.href);

            const title =
                ro.title ??
                Timeline.findTitleInToc(tocLinks, bare, depth);

            const tocChildren = Timeline.collectChildrenFromToc(tocLinks, bare, depth, 1, linkMap);

            const item: TimelineItem = {
                title,
                references: [ro.href],
                children: tocChildren.length > 0 ? tocChildren : undefined,
            };

            linkMap.set(item, ro);
            items.push(item);
        }

        return new Timeline(items, linkMap, conformsTo, tocLinks, depth);
    }

    /**
     * Augments all items in the timeline by applying the mapper's returned patch.
     * The mapper receives the item and its original manifest Link, and returns
     * a partial TimelineItem — any fields it sets will overwrite the item's
     * current value.  Use this to populate `position`, `scroll`, `role`, or any
     * future TimelineItem fields from format-specific data.
     */
    augment(mapper: (item: TimelineItem, link: Link) => Partial<TimelineItem>): void {
        for (const item of this.flatAll) {
            const link = this.linkFor(item);
            if (!link) continue;
            const patch = mapper(item, link);
            if (patch.position !== undefined) item.position = patch.position;
            if (patch.scroll   !== undefined) item.scroll   = patch.scroll;
            if (patch.role     !== undefined) item.role     = patch.role;
        }
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
        this._tocDepth = value;
        this._items = undefined;
        this._flat = undefined;
        this._toc = undefined;
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
        const time = getTime(locator.locations);
        const htmlId = getHtmlId(locator.locations);
        const progression = locator.locations.progression;

        // Audio: best-match on t= start time.
        if (time !== undefined) {
            let bestTime = -Infinity;
            let match: TimelineItem | undefined;
            for (const item of this.flat) {
                if (!this.itemMatchesHref(item, href)) continue;
                const t = this.itemStartTime(item, href);
                if (t !== undefined && t <= time && t > bestTime) {
                    bestTime = t;
                    match = item;
                }
            }
            if (match) return match;
        }

        // EPUB: match on HTML ID fragment.
        if (htmlId) {
            const match = this.flat.find(item => {
                if (!this.itemMatchesHref(item, href)) return false;
                return item.references.some(ref => ref.split("#")[1] === htmlId);
            });
            if (match) return match;
        }

        // EPUB: best-match on scroll progression.
        if (progression !== undefined) {
            let bestScroll = -Infinity;
            let match: TimelineItem | undefined;
            for (const item of this.flat) {
                if (!this.itemMatchesHref(item, href)) continue;
                const s = this.itemScrollPosition(item);
                if (s !== undefined && s <= progression && s > bestScroll) {
                    bestScroll = s;
                    match = item;
                }
            }
            if (match) return match;

            // No scroll data resolved anywhere in this resource yet: guess a
            // child by evenly dividing the fraction across its children,
            // rather than naming the whole resource.
            const container = this.items.find(i => this.itemMatchesHref(i, href));
            if (container?.children?.length && !container.children.some(c => c.scroll !== undefined)) {
                const index = Math.min(
                    Math.floor(progression * container.children.length),
                    container.children.length - 1,
                );
                return container.children[index];
            }
        }

        // Fallback: bare href match.
        return this.flat.find(item => this.itemMatchesHref(item, href));
    }

    /** The items navigable to/from `item`: its previous/next neighbors in the flattened timeline. */
    navigableFrom(item: TimelineItem): { previous: TimelineItem | undefined; next: TimelineItem | undefined } {
        const index = this.flat.indexOf(item);
        return {
            previous: index > 0 ? this.flat[index - 1] : undefined,
            next: index >= 0 && index < this.flat.length - 1 ? this.flat[index + 1] : undefined,
        };
    }

    segmentsForHref(href: string): TimelineItem[] {
        const bare = href.split("#")[0];
        const item = this.items.find(i => this.itemMatchesHref(i, bare));
        if (!item) return [];
        return item.children?.length ? item.children : [item];
    }

    ancestors(item: TimelineItem): TimelineItem[] {
        return this.ancestorPath(this.items, item) ?? [];
    }

    linkFor(item: TimelineItem): Link | undefined {
        return this.linkMap.get(item) ?? this._trimmedLinkMap.get(item);
    }

    /**
     * The authored TOC, contextualized with display-ready progression.  Mirrors
     * `publication.toc`'s authored hierarchy (respecting `depth`), falling
     * back to one flat entry per reading-order item when there's no toc at
     * all.  Cached; invalidated when `depth` changes.
     */
    get contextualizedToc(): ContextualizedTocEntry[] {
        if (!this._toc) {
            this._toc = this.tocLinks.length > 0
                ? this.buildTocEntries(this.tocLinks, this._tocDepth, 1)
                : this._allItems.map(item => this.entryFor(this.linkFor(item)!, item));
        }
        return this._toc;
    }

    /**
     * Maps a `TimelineItem` (typically from `locate()`) to its `ContextualizedTocEntry`,
     * trying three fallbacks in order:
     *   1. A direct match on `current`'s own link.
     *   2. The nearest preceding toc entry within the same resource.
     *   3. When no toc entry references the resource at all, the nearest
     *      preceding resource's toc entry.
     */
    tocEntryFor(current: TimelineItem): ContextualizedTocEntry | undefined {
        const link = this.linkFor(current);
        if (!link) return undefined;

        const direct = this.findTocEntryByLink(this.contextualizedToc, link);
        if (direct) return direct;

        const nearest = this.nearestTocEntryForResource(link.href, current);
        if (nearest) return nearest;

        return this.previousResolvedTocEntry(link);
    }

    private get flat(): TimelineItem[] {
        if (!this._flat) this._flat = this.flattenItems(this.items);
        return this._flat;
    }

    /** All items flattened from _allItems, depth-independent — used by augment(). */
    private get flatAll(): TimelineItem[] {
        return this.flattenItems(this._allItems);
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
            const linkBare = Timeline.bareHref(link.href);
            // Fragment-only hrefs (e.g. "#t=60" in single-track audio) have no bare href,
            // so they are associated with the current resource. A hrefless link (e.g. a
            // <span> grouping heading) also bareHrefs to '', but names no resource at all
            // and must not match every resource.
            const isFragmentOnly = link.href.startsWith('#');
            const matchesBare = linkBare === bare || (isFragmentOnly && linkBare === '');
            if (matchesBare && link.title && !Timeline.isStartOfResource(link.href)) {
                // Prepend the resource href when the link uses a fragment-only reference.
                const ref = linkBare === '' ? bare + link.href : link.href;
                const child: TimelineItem = {
                    title: link.title,
                    references: [ref],
                };
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
            const linkBare = Timeline.bareHref(link.href);
            const isFragmentOnly = link.href.startsWith('#');
            if ((linkBare === bare || (isFragmentOnly && linkBare === '')) && link.title) {
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
    // Contextualized TOC
    // -------------------------------------------------------------------------

    private get linkToItem(): Map<Link, TimelineItem> {
        if (!this._linkToItem) {
            this._linkToItem = new Map();
            for (const [item, link] of this.linkMap) this._linkToItem.set(link, item);
        }
        return this._linkToItem;
    }

    private buildTocEntries(links: Link[], maxDepth: number | undefined, currentDepth: number): ContextualizedTocEntry[] {
        if (maxDepth !== undefined && currentDepth > maxDepth) return [];
        return links.map(link => {
            const item = this.linkToItem.get(link) ?? this.resourceStartItem(link.href);
            const kids = link.children?.items?.length
                ? this.buildTocEntries(link.children.items, maxDepth, currentDepth + 1)
                : [];
            return { ...this.entryFor(link, item), children: kids.length > 0 ? kids : undefined };
        });
    }

    /** All toc Links flattened, respecting the same depth limit as `buildTocEntries`. */
    private tocLinksFlat(links: Link[], maxDepth: number | undefined, currentDepth: number): Link[] {
        if (maxDepth !== undefined && currentDepth > maxDepth) return [];
        const result: Link[] = [];
        for (const link of links) {
            result.push(link);
            if (link.children?.items?.length) {
                result.push(...this.tocLinksFlat(link.children.items, maxDepth, currentDepth + 1));
            }
        }
        return result;
    }

    private entryFor(link: Link, item: TimelineItem | undefined): ContextualizedTocEntry {
        const isAudio = this._conformsTo.includes(Profile.AUDIOBOOK);
        return {
            link,
            position: !isAudio && item?.position !== undefined ? String(item.position) : undefined,
            timestamp: isAudio && item?.position !== undefined ? formatNptTime(item.position) : undefined,
        };
    }

    private resourceStartItem(href: string): TimelineItem | undefined {
        const bare = Timeline.bareHref(href);
        return this._allItems.find(i => this.itemMatchesHref(i, bare));
    }

    private findTocEntryByLink(entries: ContextualizedTocEntry[], link: Link): ContextualizedTocEntry | undefined {
        for (const entry of entries) {
            if (entry.link === link) return entry;
            if (entry.children) {
                const found = this.findTocEntryByLink(entry.children, link);
                if (found) return found;
            }
        }
        return undefined;
    }

    /**
     * Tier-2 fallback for `tocEntryFor`: among the toc entries that reference
     * `href`'s own resource (e.g. chapter markers within one audio file),
     * return the nearest one at or before `current`'s position/scroll.
     */
    private nearestTocEntryForResource(href: string, current: TimelineItem): ContextualizedTocEntry | undefined {
        const bare = Timeline.bareHref(href);
        // Re-walk with raw items (not the display-formatted TocEntry tree) so we can compare
        // current.position/current.scroll directly against each candidate's source TimelineItem.
        const candidates = this.tocLinksFlat(this.tocLinks, this._tocDepth, 1)
            .filter(link => Timeline.bareHref(link.href) === bare)
            .map(link => ({ link, item: this.linkToItem.get(link) ?? this.resourceStartItem(link.href) }));
        if (candidates.length === 0) return undefined;

        const isAudio = this._conformsTo.includes(Profile.AUDIOBOOK);
        const currentValue = isAudio ? (current.position ?? 0) : (current.scroll ?? 0);
        let best: { link: Link; item: TimelineItem | undefined } | undefined;
        let bestValue = -Infinity;
        for (const c of candidates) {
            const v = isAudio ? (c.item?.position ?? 0) : (c.item?.scroll ?? 0);
            if (v <= currentValue && v > bestValue) { bestValue = v; best = c; }
        }
        const chosen = best ?? candidates[0];
        return this.findTocEntryByLink(this.contextualizedToc, chosen.link);
    }

    /**
     * Tier-3 fallback for `tocEntryFor`: when no toc entry references
     * `href`'s resource at all, walk backward through the reading order and
     * return the nearest preceding resource's toc entry.
     */
    private previousResolvedTocEntry(link: Link): ContextualizedTocEntry | undefined {
        const index = this._allItems.findIndex(item => this.linkFor(item) === link);
        if (index === -1) return undefined;

        for (let i = index - 1; i >= 0; i--) {
            const precedingLink = this.linkFor(this._allItems[i]);
            if (!precedingLink) continue;
            const precedingBare = Timeline.bareHref(precedingLink.href);
            const { atStart, fragments } = Timeline.collectTocCandidates(this.tocLinks, precedingBare, this._tocDepth, 1);
            // Exclude fragment-only entries (bareHref "") — collectTocCandidates
            // treats them as matching any bare href for single-track audio, but
            // here they must belong to this specific preceding resource.
            const ownAtStart = atStart.filter(l => Timeline.bareHref(l.href) === precedingBare);
            const ownFragments = fragments.filter(l => Timeline.bareHref(l.href) === precedingBare);
            const chosen = ownAtStart[0] ?? (ownFragments.length > 0 ? ownFragments[ownFragments.length - 1] : undefined);
            if (!chosen) continue;
            const entry = this.findTocEntryByLink(this.contextualizedToc, chosen);
            if (entry) return entry;
        }
        return undefined;
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
            // Fragment-only reference (e.g. "#t=60") has no resource of its own — use the queried href.
            const effectiveHref = refHref || href;
            if (effectiveHref !== href) continue;
            if (!refFragment) return undefined;
            const match = refFragment.match(/(?:^|&)t=([^&]+)/);
            return match ? parseNptTime(match[1]) : undefined;
        }
        return undefined;
    }

    private itemMatchesHref(item: TimelineItem, href: string): boolean {
        return item.references.some(ref => {
            const bare = ref.split("#")[0];
            // Fragment-only reference (single-track audio) matches the current resource.
            return bare === href || bare === '';
        });
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

    private itemScrollPosition(item: TimelineItem): number | undefined {
        return item.scroll;
    }

    private static bareHref(href: string): string {
        return href.split("#")[0];
    }
}
