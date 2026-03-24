/**
 * Represents a single entry in the publication's timeline.
 * The timeline contextualizes the reading order, table of contents,
 * positions list, and guided navigation document (GND) so that
 * consuming apps can, for instance, display position numbers
 * for TOC items, select the current TOC entry when
 * it has a fragment, or display previous/next as chapter titles while
 * pointing to the actual resources.
 *
 * Properties vary by format — not all will be populated for every format.
 */
export interface TimelineItem {
    /** Title of this timeline entry (e.g. chapter or section name). */
    title: string;
    /** References as hrefs with optional fragments, e.g. ["chapter1.html"], ["track1.mp3#t=60"], ["#page=6"]. */
    references: string[];
    /** Roles of this entry, e.g. ["chapter"], ["section"], ["part"]. */
    role?: string[];
    /** Position number in the reading order context. */
    position?: number;
    /** Scroll progression within the resource (0 to 1), for entries that start mid-way in a resource. */
    scroll?: number;
    /** Nested timeline entries. */
    children?: TimelineItem[];
}

export type TimelineChangeCallback = (current: TimelineItem | undefined, previous: TimelineItem | undefined, next: TimelineItem | undefined) => void;

/**
 * A timeline built from a publication's structure.
 * Format-specific subclasses are responsible for building the items
 * from the publication's reading order, table of contents, positions list and GND.
 */
export abstract class Timeline {
    abstract readonly items: TimelineItem[];

    /** The current timeline item matching the navigator's position. */
    abstract get current(): TimelineItem | undefined;

    /** The previous entry relative to current, based on resource boundaries in the TOC tree. */
    abstract get previous(): TimelineItem | undefined;

    /** The next entry relative to current, based on resource boundaries in the TOC tree. */
    abstract get next(): TimelineItem | undefined;

    /** Returns the previous and next entries relative to current. */
    get adjacent(): { previous: TimelineItem | undefined; next: TimelineItem | undefined } {
        return { previous: this.previous, next: this.next };
    }

    protected changeCallback: TimelineChangeCallback | null = null;

    /** Register a callback invoked when the current timeline item changes. */
    onChange(callback: TimelineChangeCallback): void {
        this.changeCallback = callback;
    }

}
