export type ReadFromPointerTarget = "container" | "exact";

/**
 * How `readFromPointer()` treats a press in an element matching `selector`: from the element's start (`container`),
 * or from the pressed utterance (`exact`), when idle, ready or paused, when playing, and when playing in that element.
 */
export interface ReadFromPointerRule {
    selector: string;
    /** The container starts at the nearest run of preceding siblings matching this, e.g. a definition's terms. */
    startAt?: string;
    idle: ReadFromPointerTarget;
    playing: ReadFromPointerTarget;
    /** While playing an utterance starting in the element, from `startAt` on. Defaults to `playing`. */
    active?: ReadFromPointerTarget;
}

export const defaultReadFromPointerRules: ReadFromPointerRule[] = [
    { selector: "figcaption", idle: "exact", playing: "exact" },
    { selector: "figure, [role=\"figure\"], math", idle: "container", playing: "container" },
    { selector: "table, [role=\"table\"], [role=\"grid\"]", idle: "container", playing: "container", active: "exact" },
    {
        selector: ["epigraph", "pullquote"].flatMap(type => [`[*|type~="${type}"]`, `[epub\\:type~="${type}"]`, `[role~="doc-${type}"]`]).join(", "),
        idle: "container",
        playing: "container",
        active: "exact"
    },
    { selector: "blockquote:has(> footer)", idle: "container", playing: "container", active: "exact" },
    { selector: "dd", startAt: "dt", idle: "container", playing: "container", active: "exact" }
];
