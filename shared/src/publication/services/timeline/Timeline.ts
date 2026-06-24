import { Link, Links } from "../../Link.ts";
import { Locator } from "../../Locator.ts";
import { TimelineItem } from "./TimelineItem.ts";
import { formatNptTime, isNptStartOfResource, parseNptTime } from "../../../util/npt.ts";

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

    static build(
        publication: PublicationLike,
        options: { depth?: number } = {},
        positions?: Locator[],
    ): Timeline {
        const tocLinks = publication.toc?.items ?? [];
        const roLinks = publication.readingOrder.items;
        const { depth } = options;
        const linkMap = new Map<TimelineItem, Link>();
        const items: TimelineItem[] = [];
        // Audio time labels are publication-relative. We only compute them when:
        //   - At least one reading order link has a duration (i.e. it is an audio publication), AND
        //   - All durations are known (multi-track), or there is only one track (offset is trivially 0).
        // Any missing duration in a multi-track publication makes offsets uncomputable — skip all labels.
        const isAudio = roLinks.some(ro => ro.duration !== undefined);
        const canComputeTimeLabels = isAudio && (roLinks.length <= 1 || roLinks.every(ro => ro.duration !== undefined));
        let timeOffset = 0;

        for (let i = 0; i < roLinks.length; i++) {
            const ro = roLinks[i];
            const bare = Timeline.bareHref(ro.href);

            const title =
                ro.title ??
                Timeline.findTitleInToc(tocLinks, bare, depth) ??
                `Resource ${i + 1}`;

            const offset = canComputeTimeLabels ? timeOffset : undefined;
            const tocChildren = Timeline.collectChildrenFromToc(tocLinks, bare, depth, 1, linkMap, positions, offset);

            const item: TimelineItem = {
                title,
                references: [ro.href],
                children: tocChildren.length > 0 ? tocChildren : undefined,
                position: Timeline.positionLabelForHref(ro.href, positions, offset),
            };

            linkMap.set(item, ro);
            items.push(item);
            timeOffset += ro.duration ?? 0;
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
        const href = locator.href;
        const time = locator.locations.time();
        const htmlId = locator.locations.htmlId();
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
        }

        // Fallback: bare href match.
        return this.flat.find(item => this.itemMatchesHref(item, href));
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
        const item = this.items.find(i => this.itemMatchesHref(i, bare));
        if (!item) return [];
        return item.children?.length ? item.children : [item];
    }

    itemAtProgression(href: string, progression: number, duration?: number): TimelineItem | undefined {
        const bare = href.split("#")[0];
        const item = this.items.find(i => this.itemMatchesHref(i, bare));
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

        if (item.children.some(c => c.scroll !== undefined)) {
            let match: TimelineItem = item;
            let bestScroll = -Infinity;
            for (const child of item.children) {
                const s = this.itemScrollPosition(child);
                if (s !== undefined && s <= progression && s > bestScroll) {
                    bestScroll = s;
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
        positions?: Locator[],
        timeOffset?: number,
    ): TimelineItem[] {
        if (maxDepth !== undefined && currentDepth > maxDepth) return [];

        const result: TimelineItem[] = [];

        for (const link of tocLinks) {
            const linkBare = Timeline.bareHref(link.href);
            // Fragment-only hrefs (e.g. "#t=60" in single-track audio) have no bare href,
            // so they are associated with the current resource.
            const matchesBare = linkBare === bare || linkBare === '';
            if (matchesBare && link.title && !Timeline.isStartOfResource(link.href)) {
                // Prepend the resource href when the link uses a fragment-only reference.
                const ref = linkBare === '' ? bare + link.href : link.href;
                const child: TimelineItem = {
                    title: link.title,
                    references: [ref],
                    position: Timeline.positionLabelForHref(link.href, positions, timeOffset),
                    scroll: Timeline.scrollForHref(link.href, positions),
                };
                linkMap.set(child, link);
                result.push(child);
            }

            if (link.children?.items?.length) {
                result.push(...Timeline.collectChildrenFromToc(
                    link.children.items, bare, maxDepth, currentDepth + 1, linkMap, positions, timeOffset,
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
            if ((linkBare === bare || linkBare === '') && link.title) {
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

    private timeFromItem(item: TimelineItem): number | undefined {
        for (const ref of item.references) {
            const fragment = ref.split("#")[1];
            if (!fragment) continue;
            const match = fragment.match(/(?:^|&)t=([^&]+)/);
            if (match) return parseNptTime(match[1]);
        }
        return undefined;
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

    /**
     * Returns a display-ready position label for `href` from the positions list:
     * - For audio: formatted start time (e.g. "27:27") from the t= fragment.
     * - For EPUB/WebPub: position number at the specific fragment if available,
     *   otherwise the lowest position number for the resource.
     */
    private static positionLabelForHref(href: string, positions?: Locator[], timeOffset?: number): string | undefined {
        const hashIndex = href.indexOf("#");
        const bare = hashIndex >= 0 ? href.slice(0, hashIndex) : href;
        const fragment = hashIndex >= 0 ? href.slice(hashIndex + 1) : undefined;

        if (fragment) {
            const match = fragment.match(/(?:^|&)t=([^&]+)/);
            if (match) {
                const t = parseNptTime(match[1]);
                if (t !== undefined) return timeOffset !== undefined ? formatNptTime(timeOffset + t) : undefined;
            }
        }

        // Audio parent item: no t= fragment — label is the publication-relative start time.
        if (timeOffset !== undefined) return formatNptTime(timeOffset);

        if (!positions?.length) return undefined;
        const entries = positions.filter(p => p.href === bare);
        if (!entries.length) return undefined;

        // Prefer the position at the specific fragment (e.g. a TOC anchor), fall back to lowest.
        const atFragment = fragment ? entries.find(p => p.locations.fragments[0] === fragment) : undefined;
        const candidate = atFragment ?? entries.reduce((min, p) =>
            (p.locations.position ?? Infinity) < (min.locations.position ?? Infinity) ? p : min
        );
        const pos = candidate.locations.position;
        return pos !== undefined ? String(pos) : undefined;
    }

    /**
     * Returns the scroll progression (0–1) for a TOC child href from the
     * positions list, matching on both bare href and fragment identifier.
     */
    private static scrollForHref(href: string, positions?: Locator[]): number | undefined {
        if (!positions?.length) return undefined;
        const hashIndex = href.indexOf("#");
        if (hashIndex < 0) return undefined;
        const bare = href.slice(0, hashIndex);
        const fragment = href.slice(hashIndex + 1);
        const entry = positions.find(p => {
            if (p.href !== bare) return false;
            const pFragment = p.locations.fragments[0];
            if (!pFragment) return false;
            return pFragment === fragment;
        });
        return entry?.locations.progression;
    }

    private static bareHref(href: string): string {
        return href.split("#")[0];
    }
}
