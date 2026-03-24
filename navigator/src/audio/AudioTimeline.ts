import { Link, Locator, Publication } from "@readium/shared";
import { Timeline, TimelineItem } from "../Timeline";

/**
 * Audio-specific timeline built from the publication's table of contents,
 * falling back to the reading order when no TOC is available.
 */
export class AudioTimeline extends Timeline {
    readonly items: TimelineItem[];

    private _current: TimelineItem | undefined;
    private _previous: TimelineItem | undefined;
    private _next: TimelineItem | undefined;
    private readonly flat: TimelineItem[];

    constructor(publication: Publication) {
        super();
        const toc = publication.toc;
        this.items = toc && toc.items.length > 0
            ? AudioTimeline.itemsFromToc(toc.items)
            : AudioTimeline.itemsFromReadingOrder(publication.readingOrder.items);
        this.flat = this.flatten(this.items);
    }

    get current(): TimelineItem | undefined {
        return this._current;
    }

    get previous(): TimelineItem | undefined {
        return this._previous;
    }

    get next(): TimelineItem | undefined {
        return this._next;
    }

    update(locator: Locator): void {
        const href = locator.href.split("#")[0];
        const time = locator.locations?.time() ?? 0;

        const matched = this.findCurrent(this.items, href, time);
        if (matched === this._current) return;

        this._current = matched;
        this._previous = matched ? this.findPrevious(matched) : undefined;
        this._next = matched ? this.findNext(matched) : undefined;
        this.changeCallback?.(this._current, this._previous, this._next);
    }

    /**
     * Finds the deepest timeline item whose reference matches the given
     * href and whose time offset is at or before the current time.
     */
    private findCurrent(items: TimelineItem[], href: string, time: number): TimelineItem | undefined {
        let match: TimelineItem | undefined;

        for (const item of items) {
            if (!this.itemMatchesPosition(item, href, time)) continue;
            match = item;
            if (item.children) {
                const childMatch = this.findCurrent(item.children, href, time);
                if (childMatch) match = childMatch;
            }
        }

        return match;
    }

    /** First preceding entry in the flat list whose bare href differs from current. */
    private findPrevious(target: TimelineItem): TimelineItem | undefined {
        const targetHref = this.bareHref(target);
        const index = this.flat.indexOf(target);

        for (let i = index - 1; i >= 0; i--) {
            if (this.bareHref(this.flat[i]) !== targetHref) return this.flat[i];
        }

        return undefined;
    }

    /** First following entry in the flat list whose bare href differs from current. */
    private findNext(target: TimelineItem): TimelineItem | undefined {
        const targetHref = this.bareHref(target);
        const index = this.flat.indexOf(target);

        for (let i = index + 1; i < this.flat.length; i++) {
            if (this.bareHref(this.flat[i]) !== targetHref) return this.flat[i];
        }

        return undefined;
    }

    private bareHref(item: TimelineItem): string {
        const ref = item.references[0];
        if (!ref) return "";
        return ref.split("#")[0];
    }

    private flatten(items: TimelineItem[]): TimelineItem[] {
        const result: TimelineItem[] = [];
        for (const item of items) {
            result.push(item);
            if (item.children) {
                result.push(...this.flatten(item.children));
            }
        }
        return result;
    }

    private itemMatchesPosition(item: TimelineItem, href: string, time: number): boolean {
        for (const ref of item.references) {
            const [refHref, refFragment] = ref.split("#");
            const refBare = refHref || href; // empty refHref means same resource (e.g. "#t=60")
            if (refBare !== href) continue;
            const refTime = this.parseTimeFragment(refFragment);
            if (time >= refTime) return true;
        }
        return false;
    }

    private parseTimeFragment(fragment: string | undefined): number {
        if (!fragment) return 0;
        const match = fragment.match(/(?:^|&)t=(\d+(?:\.\d+)?)/);
        return match ? parseFloat(match[1]) : 0;
    }

    private static itemsFromToc(links: Link[]): TimelineItem[] {
        return links
            .map(link => AudioTimeline.linkToItem(link))
            .filter(Boolean) as TimelineItem[];
    }

    private static itemsFromReadingOrder(links: Link[]): TimelineItem[] {
        return links
            .map(link => AudioTimeline.linkToItem(link))
            .filter(Boolean) as TimelineItem[];
    }

    private static linkToItem(link: Link): TimelineItem | undefined {
        if (!link.title) return undefined;

        const children = link.children?.items
            .map(child => AudioTimeline.linkToItem(child))
            .filter(Boolean) as TimelineItem[] | undefined;

        return {
            title: link.title,
            references: [link.href],
            children: children && children.length > 0 ? children : undefined,
        };
    }
}
