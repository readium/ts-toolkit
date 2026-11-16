export type ReadFromPointerTarget = "container" | "exact";

/**
 * How `readFromPointer()` treats a press in an element matching `selector`: from the element's start (`container`),
 * or from the pressed utterance (`exact`), when idle, ready or paused, and when playing.
 */
export interface ReadFromPointerRule {
    selector: string;
    /** The container starts at the nearest run of preceding siblings matching this, e.g. a definition's terms. */
    startAt?: string;
    idle: ReadFromPointerTarget;
    playing: ReadFromPointerTarget;
}

export const defaultReadFromPointerRules: ReadFromPointerRule[] = [
    { selector: "figcaption", idle: "exact", playing: "exact" },
    { selector: "figure, [role=\"figure\"], math", idle: "container", playing: "container" },
    { selector: "table, [role=\"table\"], [role=\"grid\"]", idle: "container", playing: "exact" },
    {
        selector: ["epigraph", "pullquote"].flatMap(type => [`[*|type~="${type}"]`, `[epub\\:type~="${type}"]`, `[role~="doc-${type}"]`]).join(", "),
        idle: "container",
        playing: "exact"
    },
    { selector: "blockquote:has(> footer)", idle: "container", playing: "exact" },
    { selector: "dd", startAt: "dt", idle: "container", playing: "exact" }
];
