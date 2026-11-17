export type ReadFromPointerTarget = "container" | "exact";

/**
 * How `readFromPointer()` treats a press in an element with the guided navigation `role`, also matching `selector` if any:
 * from the element's start (`container`), or from the pressed utterance (`exact`),
 * when idle, ready or paused, when playing, and when playing in that element.
 */
export interface ReadFromPointerRule {
    role: string;
    selector?: string;
    /** The container starts at the nearest run of preceding siblings with this role, e.g. a definition's terms. */
    startAt?: string;
    idle: ReadFromPointerTarget;
    playing: ReadFromPointerTarget;
    /** While playing an utterance starting in the element, from `startAt` on. Defaults to `playing`. */
    active?: ReadFromPointerTarget;
}

export const defaultReadFromPointerRules: ReadFromPointerRule[] = [
    { role: "caption", selector: "figcaption", idle: "exact", playing: "exact" },
    { role: "figure", idle: "container", playing: "container" },
    { role: "math", idle: "container", playing: "container" },
    { role: "table", idle: "container", playing: "container", active: "exact" },
    { role: "epigraph", idle: "container", playing: "container", active: "exact" },
    { role: "pullquote", idle: "container", playing: "container", active: "exact" },
    { role: "blockquote", selector: ":has(> footer)", idle: "container", playing: "container", active: "exact" },
    { role: "definition", startAt: "term", idle: "container", playing: "container", active: "exact" }
];
