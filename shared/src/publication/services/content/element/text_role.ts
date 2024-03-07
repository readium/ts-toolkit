
// Different role types.
export type Role =
    "heading-1" | "heading-2" | "heading-3" | "heading-4" | "heading-5" | "heading-6" |
    "body" | "footnote" | "quote";

/**
 * Represents a purpose of an element in the broader context of the document.
 */
export interface TextRole {
    get role(): Role;
}

/**
 * Title of a section.
 */
export class Heading implements TextRole {
    constructor(
        /**
         * Heading importance, 1 being the highest.
         */
        public readonly level: number
    ) { }

    get role(): Role {
        return `heading-${this.level}` as Role;
    }
}

/**
 * Normal body of content.
 */
export const Body: TextRole = {
    role: "body"
}

/**
 * A footnote at the bottom of a document.
 */
export const Footnote: TextRole = {
    role: "footnote"
}

/**
 * A quotation.
 */
export class TextQuote implements TextRole {
    public readonly role: Role = "quote";

    constructor(
        /**
         * URL to the source for this quote.
         */
        public readonly referenceUrl: URL | undefined,
        /**
         * Name of the source for this quote.
         */
        public readonly referenceTitle: string | undefined
    ) { }
}