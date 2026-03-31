/**
 * Represents a single entry in a publication's timeline.
 *
 * The timeline contextualizes the reading order and table of contents so that
 * consuming apps can display the current chapter title, build a progress bar,
 * show previous/next as chapter titles, group search results by chapter, etc.
 */
export interface TimelineItem {
    /** Display title of this entry. */
    title: string;
    /**
     * References as hrefs with optional fragments.
     * e.g. ["track1.mp3#t=60"] for audio, ["chapter1.html"] for EPUB, ["#page=6"] for PDF.
     */
    references: string[];
    /** Structural roles of this entry, e.g. ["chapter"], ["part"]. */
    role?: string[];
    /** Position number in the reading order context. */
    position?: number;
    /** Scroll progression within the resource (0 to 1), for entries that start mid-way in a resource. */
    scroll?: number;
    /** Nested entries. */
    children?: TimelineItem[];
}
