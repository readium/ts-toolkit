import { Link } from "../../../Link";
import { Locator } from "../../../Locator";
import { AttributesHolder, Attribute } from "./attributes";
import { TextRole } from "./text_role";

/**
 * Represents a single semantic content element part of a publication.
 * NOTE: This is named "Element" in other toolkits. This conflicts with the JavaScript `Element` type so it's been renamed.
 */
export abstract class ContentElement extends AttributesHolder {
    constructor(public readonly locator: Locator, attributes: Attribute<any>[] = []) {
        super(attributes);
    }
}

/**
 * An element which can be represented as human-readable text.
 * The default implementation returns the first accessibility label associated to the element.
 */
export class TextualElement extends ContentElement {
    /**
     * Human-readable text representation for this element.
     */
    get text(): string | undefined {
        return this.accessibilityLabel;
    }
}

/**
 *  An element referencing an embedded external resource.
 */
export interface EmbeddedElement extends ContentElement {
    /**
     * Referenced resource in the publication.
     */
    readonly embeddedLink: Link;
}

/**
 * An audio clip.
 */
export class AudioElement extends TextualElement implements EmbeddedElement {
    constructor(
        locator: Locator,
        readonly embeddedLink: Link,
        attributes: Attribute<any>[] = [],
    ) { super(locator, attributes); }
}

/**
 * A video clip.
 */
export class VideoElement extends TextualElement implements EmbeddedElement {
    constructor(
        locator: Locator,
        readonly embeddedLink: Link,
        attributes: Attribute<any>[] = [],
    ) { super(locator, attributes); }
}

/**
 * A bitmap image.
 */
export class ImageElement extends TextualElement implements EmbeddedElement {
    constructor(
        locator: Locator,
        readonly embeddedLink: Link,
        /**
         * Short piece of text associated with the image.
         */
        readonly caption?: string,
        attributes: Attribute<any>[] = [],
    ) { super(locator, attributes); }

    get text(): string | undefined {
        // The caption might be a better text description than the accessibility label, when available.
        return (this.caption?.length || 0) > 0 ? this.caption : super.text;
    }
}

export class TextSegment extends AttributesHolder {
    constructor(
        /**
         * Locator to the segment of text.
         */
        readonly locator: Locator,
        /**
         * Text in the segment.
         */
        readonly text: string,
        /**
         * Attributes associated with this segment, e.g. language.
         */
        attributes: Attribute<any>[] = [],
    ) { super(attributes); }
}

/**
 * A text element.
 */
export class TextElement extends TextualElement {
    constructor(
        locator: Locator,
        /**
         * Purpose of this element in the broader context of the document.
         */
        readonly role: TextRole,
        /**
         * Ranged portions of text with associated attributes.
         */
        readonly segments: TextSegment[],
        attributes: Attribute<any>[] = [],
    ) { super(locator, attributes); }

    get text(): string | undefined {
        return this.segments.map(segment => segment.text).join("");
    }
}