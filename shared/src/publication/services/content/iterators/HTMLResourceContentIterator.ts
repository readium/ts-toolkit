import { Resource } from "../../../../fetcher/Resource";
import { Link, Links } from "../../../Link";
import { Locator, LocatorLocations } from "../../../Locator";
import { IllegalStateError, Iterator } from "../Iterator";
import { Attribute, AttributeKeys, AudioElement, Body, ContentElement, Footnote, Heading, ImageElement, TextElement, TextQuote, TextSegment, VideoElement } from "../element";
import { appendNormalizedWhitespace, elementLanguage, isBlank, isInlineTag, srcRelativeToHref, trimUnicodeSpace, trimUnicodeSpaceEnd, trimUnicodeSpaceStart, trimmingTextLocator } from "./helpers";
import { getCssSelector } from "css-selector-generator";

interface ElementWithDelta {
    element: ContentElement;
    delta: number;
}

/**
 * Iterates an HTML [resource], starting from the given [locator].
 *
 * If you want to start mid-resource, the [locator] must contain a `cssSelector` key in its
 * [Locator.Locations] object.
 *
 * If you want to start from the end of the resource, the [locator] must have a `progression` of 1.0.
 *
 * Locators will contain a `before` context of up to `beforeMaxLength` characters.
 */
export class HTMLResourceContentIterator extends Iterator {
    private currentElement: ElementWithDelta | null = null;

    constructor(
        private resource: Resource,
        private locator: Locator,
        private beforeMaxLength = 50
    ) {
        super();
    }

    async hasPrevious(): Promise<boolean> {
        if (this.currentElement?.delta === -1) return true;

        const elements = await this.elements();
        const index = (this.currentIndex ?? elements.startIndex) - 1;

        const content = elements.elements.at(index);
        if (!content) return false;

        this.currentIndex = index;
        this.currentElement = {
            delta: -1,
            element: content
        };
        return true;
    }

    previous(): ContentElement {
        if (!this.currentElement || this.currentElement.delta !== -1) throw new IllegalStateError("Called previous() without a successful call to hasPrevious() first");
        const el = this.currentElement.element;
        this.currentElement = null;
        return el;
    }

    async hasNext(): Promise<boolean> {
        if (this.currentElement?.delta === 1) return true;

        const elements = await this.elements();
        const index = (this.currentIndex ?? (elements.startIndex - 1)) + 1;

        const content = elements.elements.at(index);
        if (!content) return false;

        this.currentIndex = index;
        this.currentElement = {
            delta: 1,
            element: content
        };
        return true;
    }

    next(): ContentElement {
        if (!this.currentElement || this.currentElement.delta !== 1) throw new IllegalStateError("Called next() without a successful call to hasNext() first");
        const el = this.currentElement.element;
        this.currentElement = null;
        return el;
    }

    private currentIndex: number | null = null;
    private parsedElements: ParsedElements | null = null;

    private async elements(): Promise<ParsedElements> {
        this.parsedElements ??= await this.parseElements();
        return this.parsedElements;
    }

    private async parseElements(): Promise<ParsedElements> {
        const raw = await this.resource.readAsString();
        const doc = (new DOMParser()).parseFromString(raw!, this.locator.type as DOMParserSupportedType);
        const parser = new ContentParser(
            doc,
            this.locator,
            this.locator.locations.getCssSelector() ? doc.querySelector(this.locator.locations.getCssSelector()!) as Element : null,
            this.beforeMaxLength
        );

        TraverseNode(parser, doc.body);
        return parser.result();
    }
}

/**
 * Holds the result of parsing the HTML resource into a list of [ContentElement].
 * The [startIndex] will be calculated from the element matched by the base
 * [locator], if possible. Defaults to 0.
 */
interface ParsedElements {
    elements: ContentElement[];
    startIndex: number;
}

// https://jsoup.org/apidocs/org/jsoup/select/NodeVisitor.html (simplified)
interface NodeVisitor {
    head(node: Node, depth: number): void; // Callback for when a node is first visited.
    tail(node: Node, depth: number): void; // Callback for when a node is last visited, after all of its descendants have been visited.
}

// Start a depth-first traverse of the root and all of its descendants.
// This implementation does not use recursion, so a deep DOM does not risk blowing the stack.
// From JSoup: https://github.com/jhy/jsoup/blob/1762412a28fa7b08ccf71d93fc4c98dc73086e03/src/main/java/org/jsoup/select/NodeTraversor.java#L20
// NOTE: Unlike the JSoup implementation, we expect any implementor of NodeVisitor to be read-only, because it simplifies implementation.
function TraverseNode(visitor: NodeVisitor, root: Node | null) {
    let node = root;
    let depth = 0;

    while (node != null) {
        visitor.head(node, depth); // visit current node

        // DON'T check if removed or replaced

        if (node.firstChild != null) { // descend
            node = node.firstChild;
            depth++;
        } else {
            while (true) {
                if (!(node?.nextSibling == null && depth > 0)) break;
                node && visitor.tail(node, depth); // when no more siblings, ascend
                node = node?.parentNode || null;
                depth--;
            }
            node && visitor.tail(node, depth);
            if (node === root) {
                break;
            }
            node = node?.nextSibling || null;
        }
    }
}

interface BreadcrumbData {
    node: Node;
    cssSelector?: string;
}

// Note that this whole thing is based off of JSoup's Node-related classes, with simplifications
// https://jsoup.org/apidocs/org/jsoup/select/NodeTraversor.html
class ContentParser implements NodeVisitor {
    private readonly elements: ContentElement[] = [];
    private startIndex = 0;
    private segmentsAcc: TextSegment[] = []; // Segments accumulated for the current element.
    private textAcc = ""; // Text since the beginning of the current segment, after coalescing whitespaces.
    private wholeRawTextAcc: string | null = null; // Text content since the beginning of the resource, including whitespaces.
    private elementRawTextAcc = ""; // Text content since the beginning of the current element, including whitespaces.
    private rawTextAcc = ""; // Text content since the beginning of the current segment, including whitespaces.
    private currentLanguage: string | null = null; // Language of the current segment.
    private breadcrumbs: BreadcrumbData[] = []; // LIFO stack of the current element's block ancestors.

    constructor(
        private doc: Document,
        private baseLocator: Locator,
        private startElement: Element | null,
        private beforeMaxLength: number
    ) { }

    result(): ParsedElements {
        return {
            elements: this.elements,
            startIndex: this.baseLocator.locations.progression === 1.0
                ? this.elements.length : this.startIndex
        } as ParsedElements;
    }

    // Implements NodeTraversor
    head(node: Node, depth: number) {
        if (node.nodeType == Node.ELEMENT_NODE) {
            const isBlock = !isInlineTag(node);
            let cssSelector: string | null = null;
            if (isBlock) {
                // Calculate CSS selector now because we'll definitely need it
                cssSelector = getCssSelector(node as Element, {
                    root: this.doc
                });

                // Add blocks to breadcrumbs
                this.breadcrumbs.push({
                    node,
                    cssSelector
                });
            }

            const nodeName = node.nodeName.toUpperCase();
            if (nodeName === "BR") {
                this.flushText();
            } else if (
                nodeName === "IMG" ||
                nodeName === "AUDIO" ||
                nodeName === "VIDEO"
            ) {
                this.flushText();

                if (!cssSelector) {
                    cssSelector = getCssSelector(node as Element, {
                        root: this.doc
                    });
                }
                const elementLocator = this.baseLocator.copyWithLocations({
                    otherLocations: new Map([
                        ["cssSelector", cssSelector]
                    ])
                });

                if (nodeName === "IMG") {
                    const el = node as HTMLImageElement;
                    const href = srcRelativeToHref(el, this.baseLocator.href);
                    let alt = el.getAttribute("alt");
                    if (!alt?.length)
                        // Try fallback to title if no alt
                        alt = el.getAttribute("title");
                    if (href != null) {
                        this.elements.push(new ImageElement(
                            elementLocator,
                            new Link({
                                href
                            }),
                            undefined, // // FIXME: Get the caption from figcaption
                            alt?.length ? [new Attribute(
                                AttributeKeys.ACCESSIBILITY_LABEL,
                                alt
                            )] : []
                        ))
                    }
                } else { // Audio or Video
                    const el = node as HTMLAudioElement | HTMLVideoElement;
                    const href = srcRelativeToHref(el, this.baseLocator.href);
                    let link: Link | undefined;
                    if (href != null) {
                        link = new Link({
                            href
                        });
                    } else {
                        const sources = [...el.getElementsByTagName("source")].map(s => {
                            const src = srcRelativeToHref(s, this.baseLocator.href);
                            if (!src) return null;
                            return new Link({
                                href: src,
                                type: s.getAttribute("type") || undefined
                            });
                        }).filter(s => !!s) as Link[];

                        if (sources.length > 0) {
                            link = new Link({
                                href: sources[0].href,
                                type: sources[0].type,
                                alternates: sources.length > 1 ? new Links(sources.slice(1)) : undefined
                            });
                        }
                    }

                    if (link) {
                        if (nodeName === "AUDIO") {
                            this.elements.push(new AudioElement(
                                elementLocator,
                                link
                            ));
                        } else if (nodeName === "VIDEO") {
                            this.elements.push(new VideoElement(
                                elementLocator,
                                link
                            ));
                        }
                    }
                }
            }

            if (isBlock) {
                this.flushText();
            }
        }
    }

    // Implements NodeTraversor
    tail(node: Node, depth: number) {
        if (node.nodeType === Node.TEXT_NODE && !isBlank(node.textContent)) {
            const language = elementLanguage(node.parentElement);
            if (this.currentLanguage !== language) {
                this.flushSegment();
                this.currentLanguage = language;
            }

            this.rawTextAcc += node.textContent;
            this.textAcc = appendNormalizedWhitespace(this.textAcc, node.textContent!);
        } else if (node.nodeType === Node.ELEMENT_NODE) {
            if (!isInlineTag(node)) {
                if (
                    !this.breadcrumbs.length ||
                    this.breadcrumbs.at(-1)?.node !== node
                ) throw new Error("HTMLContentIterator: breadcrumbs mismatch"); // Kotlin does assert(breadcrumbs.last() == node) which throws
                this.flushText();
                this.breadcrumbs.pop();
            }
        }
    }

    flushText() {
        this.flushSegment();

        if (
            this.startIndex === 0 &&
            this.startElement &&
            this.breadcrumbs.length &&
            this.breadcrumbs.at(-1)?.node === this.startElement
        ) {
            this.startIndex = this.elements.length;
        }

        if (!this.segmentsAcc.length) return;

        // Trim the end of the last segment's text to get a cleaner output for the TextElement.
        // Only whitespaces between the segments are meaningful.
        const lastSegment = this.segmentsAcc[this.segmentsAcc.length - 1]
        this.segmentsAcc[this.segmentsAcc.length - 1] = new TextSegment(
            lastSegment.locator,
            trimUnicodeSpaceEnd(lastSegment.text),
            lastSegment._attributes
        );

        // Determine the role of the element
        let bestRole = Body;
        if (this.breadcrumbs.length > 0) {
            const el = this.breadcrumbs.at(-1)?.node as HTMLElement;
            if(el.getAttributeNS("http://www.idpf.org/2007/ops", "type") === "footnote") {
                bestRole = Footnote;
            } else {
                switch (el.nodeName.toUpperCase()) {
                    case "H1":
                    case "H2":
                    case "H3":
                    case "H4":
                    case "H5":
                    case "H6":
                        bestRole = new Heading(parseInt(el.nodeName[1]));
                        break;
                    case "BLOCKQUOTE":
                    case "Q":
                        bestRole = new TextQuote(
                            (el.getAttribute("cite")?.length || 0 > 0) ? new URL(el.getAttribute("cite")!) : undefined,
                            el.getAttribute("title") || undefined
                        );
                        break;
                }
            }
        }

        this.elements.push(new TextElement(
            new Locator({
                href: this.baseLocator.href,
                type: this.baseLocator.type,
                title: this.baseLocator.title,
                text: trimmingTextLocator(this.elementRawTextAcc, (this.segmentsAcc.length && this.segmentsAcc[0]?.locator?.text?.before) || ""),
                locations: new LocatorLocations(this.breadcrumbs.at(-1)?.cssSelector ? {
                    otherLocations: new Map([
                        ["cssSelector", this.breadcrumbs.at(-1)?.cssSelector]
                    ])
                } : {})
            }),
            bestRole,
            [...this.segmentsAcc]
        ));
        this.elementRawTextAcc = "";
        this.segmentsAcc = [];
    }

    flushSegment() {
        let text = this.textAcc;
        const trimmedText = trimUnicodeSpace(text);
        if (!isBlank(trimmedText)) {
            if (!this.segmentsAcc.length) {
                text = trimUnicodeSpaceStart(text)
                const whitespaceSuffix = (text.length && isBlank(text[text.length - 1])) ? text[text.length - 1] : "";
                text = trimmedText + whitespaceSuffix;
            }

            this.segmentsAcc.push(new TextSegment(
                new Locator({
                    href: this.baseLocator.href,
                    type: this.baseLocator.type,
                    title: this.baseLocator.title,
                    text: trimmingTextLocator(text, this.wholeRawTextAcc?.substring(this.wholeRawTextAcc.length - this.beforeMaxLength)),
                    locations: new LocatorLocations(this.breadcrumbs.at(-1)?.cssSelector ? {
                        otherLocations: new Map([
                            ["cssSelector", this.breadcrumbs.at(-1)?.cssSelector]
                        ])
                    } : {})
                }),
                text,
                this.currentLanguage ? [new Attribute(
                    AttributeKeys.LANGUAGE,
                    this.currentLanguage
                )] : []
            ));
        }

        if (this.rawTextAcc.length) {
            this.wholeRawTextAcc = (this.wholeRawTextAcc || "") + this.rawTextAcc;
            this.elementRawTextAcc += this.rawTextAcc;
        }
        this.rawTextAcc = "";
        this.textAcc = "";
    }


}