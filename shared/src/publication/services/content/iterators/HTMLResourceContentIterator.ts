import { Resource } from "../../../../fetcher/Resource";
import { Link, Links } from "../../../Link";
import { Locator, LocatorLocations } from "../../../Locator";
import { IllegalStateError, Iterator } from "../Iterator";
import { Attribute, AttributeKeys, AudioElement, Body, ContentElement, Footnote, Heading, ImageElement, TextElement, TextQuote, TextRole, TextSegment, VideoElement } from "../element";
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
            element: this.parser!.executeRecipe(content)
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
            element: this.parser!.executeRecipe(content)
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
    private parsedElementRecipes: ParsedElementRecipes | null = null;

    private async elements(): Promise<ParsedElementRecipes> {
        this.parsedElementRecipes ??= await this.parseElements();
        return this.parsedElementRecipes;
    }

    private parser: ContentParser | null = null;

    private async parseElements(): Promise<ParsedElementRecipes> {
        const raw = await this.resource.readAsString();
        const doc = (new DOMParser()).parseFromString(raw!, this.locator.type as DOMParserSupportedType);
        this.parser = new ContentParser(
            doc,
            this.locator,
            this.locator.locations.getCssSelector() ? doc.querySelector(this.locator.locations.getCssSelector()!) as Element : null,
            this.beforeMaxLength
        );

        TraverseNode(this.parser, doc.body);
        return this.parser.result();
    }
}

/**
 * Holds the result of parsing the HTML resource into a list of [ElementRecipe].
 * The recipes can be used to generate ContentElement instances, but are used
 * instead to reduce memory usage that happens due to string copies
 * The [startIndex] will be calculated from the element matched by the base
 * [locator], if possible. Defaults to 0.
 */
interface ParsedElementRecipes {
    elements: ElementRecipe[];
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

interface LocatorRecipe {
    cssSelectorNode: Node | undefined;
}

type TextSegmentRecipe = LocatorRecipe & {
    text: string;
    beforeRange: [number, number];
    attributes: Attribute<any>[];
}

type TextElementRecipe = LocatorRecipe & {
    text: string;
    role: TextRole;
    segments: TextSegmentRecipe[];
}

type ImageElementRecipe = LocatorRecipe & {
    href: string;
    caption: string | undefined;
    attributes: Attribute<any>[];
}

type AVElementRecipe = LocatorRecipe & {
    link: Link;
}

enum ElementRecipeType {
    TextRecipe,
    ImageRecipe,
    AudioRecipe,
    VideoRecipe
}

type ElementRecipe = {
    type: ElementRecipeType.TextRecipe;
    recipe: TextElementRecipe;
} | {
    type: ElementRecipeType.ImageRecipe;
    recipe: ImageElementRecipe;
} | {
    type: ElementRecipeType.AudioRecipe | ElementRecipeType.VideoRecipe;
    recipe: AVElementRecipe;
};

// Note that this whole thing is based off of JSoup's Node-related classes, with simplifications
// https://jsoup.org/apidocs/org/jsoup/select/NodeTraversor.html
class ContentParser implements NodeVisitor {
    private readonly elementRecipes: ElementRecipe[] = [];
    private startIndex = 0;
    private segmentRecipesAcc: TextSegmentRecipe[] = []; // Segments accumulated for the current element.
    private textAcc = ""; // Text since the beginning of the current segment, after coalescing whitespaces.
    private wholeRawTextAcc: string | null = null; // Text content since the beginning of the resource, including whitespaces.
    private elementRawTextAcc = ""; // Text content since the beginning of the current element, including whitespaces.
    private rawTextAcc = ""; // Text content since the beginning of the current segment, including whitespaces.
    private currentLanguage: string | null = null; // Language of the current segment.
    private breadcrumbs: Node[] = []; // LIFO stack of the current element's block ancestors.
    private recipeCssSelectorCache = new WeakMap<HTMLElement, string>();

    constructor(
        private doc: Document,
        private baseLocator: Locator,
        private startElement: Element | null,
        private beforeMaxLength: number
    ) { }

    result(): ParsedElementRecipes {
        return {
            elements: this.elementRecipes,
            startIndex: this.baseLocator.locations.progression === 1.0
                ? this.elementRecipes.length : this.startIndex
        } as ParsedElementRecipes;
    }

    executeRecipe(item: ElementRecipe): ContentElement {
        const cssSelector = item.recipe.cssSelectorNode ? this.cssSelector(item.recipe.cssSelectorNode) : null;

        if(item.type === ElementRecipeType.ImageRecipe) {
            // Image
            const recipe = item.recipe;
            return new ImageElement(
                new Locator({
                    href: this.baseLocator.href,
                    type: this.baseLocator.type,
                    title: this.baseLocator.title,
                    locations: new LocatorLocations(cssSelector ? {
                        otherLocations: new Map([
                            ["cssSelector", cssSelector]
                        ])
                    } : {})
                }),
                new Link({
                    href: recipe.href
                }),
                recipe.caption,
                recipe.attributes
            );
        } else if(item.type === ElementRecipeType.AudioRecipe || item.type === ElementRecipeType.VideoRecipe) {
            // Audio or Video
            const locator = new Locator({
                href: this.baseLocator.href,
                type: this.baseLocator.type,
                title: this.baseLocator.title,
                locations: new LocatorLocations(cssSelector ? {
                    otherLocations: new Map([
                        ["cssSelector", cssSelector]
                    ])
                } : {})
            });
            const recipe = item.recipe;

            if(item.type === ElementRecipeType.VideoRecipe) {
                return new VideoElement(
                    locator,
                    recipe.link
                );
            } else {
                return new AudioElement(
                    locator,
                    recipe.link
                );
            }
        } else if(item.type === ElementRecipeType.TextRecipe) {
            // Text
            const recipe = item.recipe;
            const segments: TextSegment[] = recipe.segments.map(sr => {
                const segmentCssSelector = sr.cssSelectorNode ? this.cssSelector(sr.cssSelectorNode) : null;
                return new TextSegment(
                    new Locator({
                        href: this.baseLocator.href,
                        type: this.baseLocator.type,
                        title: this.baseLocator.title,
                        text: trimmingTextLocator(sr.text, this.wholeRawTextAcc?.substring(sr.beforeRange[0], sr.beforeRange[1])),
                        locations: new LocatorLocations(segmentCssSelector ? {
                            otherLocations: new Map([
                                ["cssSelector", segmentCssSelector]
                            ])
                        } : {})
                    }),
                    sr.text,
                    sr.attributes
                );
            });
    
            return new TextElement(
                new Locator({
                    href: this.baseLocator.href,
                    type: this.baseLocator.type,
                    title: this.baseLocator.title,
                    text: trimmingTextLocator(recipe.text, segments.length && segments[0].locator.text?.before || ""),
                    locations: new LocatorLocations(cssSelector ? {
                        otherLocations: new Map([
                            ["cssSelector", cssSelector]
                        ])
                    } : {})
                }),
                recipe.role,
                segments,
            );
        } else {
            throw new Error(`Unknown recipe type`);
        }
    }

    private cssSelector(node: Node) {
        const el = node as HTMLElement;

        const cached = this.recipeCssSelectorCache.get(el);
        if(cached) return cached;

        /**
         * The css-selector-generator library chokes when generating a selector and using element
         * attributes that have a namespace prefix, for example `xml:lang="fr"`. It's also not very
         * useful to use these elements to generate a CSS selector that's usable with the querySelector
         * DOM API, because that API can't use attributes with prefixes, unless you just select for any prefix,
         * which, in certain edge cases, could result in the incorrect element being selected. So, in order to
         * to solve the breakage in the library and avoid using these attributes in the first place, we just
         * remove any attributes with namespace prefixes. There's still enough "meat" left to properly
         * generate a CSS selector that can reliably be used with querySelector. Afterwards, we add them back
         * to the element, so we can, for example, still select the xml:lang for accessibility purposes.
         */
        const removedAttributes = new Map<HTMLElement, Attr[]>();
        let currEl: HTMLElement | null = el;
        while(currEl && currEl !== this.doc.body) {
            for (let i = 0; i < currEl.attributes.length; i++) {
                const attr = currEl.attributes[i];
                if(attr.prefix) {
                    if(!removedAttributes.has(currEl)) {
                        removedAttributes.set(currEl, [attr])
                    } else {
                        removedAttributes.set(currEl, removedAttributes.get(currEl)!.concat([attr]))
                    }
                    currEl.attributes.removeNamedItem(attr.name);
                }
            }
            currEl = currEl.parentElement;
        }
        const sel = getCssSelector(el, {
            root: this.doc
        });
        removedAttributes.forEach((value, key) => value.forEach(v => key.attributes.setNamedItem(v)));
        this.recipeCssSelectorCache.set(el, sel);
        return sel;
    }

    // Implements NodeTraversor
    head(node: Node, depth: number) {
        if (node.nodeType == Node.ELEMENT_NODE) {
            const isBlock = !isInlineTag(node);
            if (isBlock) {
                // Flush text
                this.flushText();

                // Add blocks to breadcrumbs
                this.breadcrumbs.push(node);
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

                if (nodeName === "IMG") {
                    const el = node as HTMLImageElement;
                    const href = srcRelativeToHref(el, this.baseLocator.href);
                    let alt = el.getAttribute("alt");
                    if (!alt?.length)
                        // Try fallback to title if no alt
                        alt = el.getAttribute("title");
                    if (href != null) {
                        this.elementRecipes.push({
                            type: ElementRecipeType.ImageRecipe,
                            recipe: {
                                href,
                                caption: undefined, // FIXME: Get the caption from figcaption
                                cssSelectorNode: node,
                                attributes: alt?.length ? [new Attribute(
                                    AttributeKeys.ACCESSIBILITY_LABEL,
                                    alt
                                )] : []
                            }
                        });
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
                            this.elementRecipes.push({
                                type: ElementRecipeType.AudioRecipe,
                                recipe: {
                                    cssSelectorNode: node,
                                    link,
                                }
                            });
                        } else if (nodeName === "VIDEO") {
                            this.elementRecipes.push({
                                type: ElementRecipeType.VideoRecipe,
                                recipe: {
                                    cssSelectorNode: node,
                                    link,
                                }
                            });
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
                    this.breadcrumbs.at(-1) !== node
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
            this.breadcrumbs.at(-1) === this.startElement
        ) {
            this.startIndex = this.elementRecipes.length;
        }

        if (!this.segmentRecipesAcc.length) return;

        // Trim the end of the last segment's text to get a cleaner output for the TextElement.
        // Only whitespaces between the segments are meaningful.
        this.segmentRecipesAcc[this.segmentRecipesAcc.length - 1].text = trimUnicodeSpaceEnd(
            this.segmentRecipesAcc[this.segmentRecipesAcc.length - 1].text
        );

        // Determine the role of the element
        let bestRole = Body;
        if (this.breadcrumbs.length > 0) {
            const el = this.breadcrumbs.at(-1) as HTMLElement;
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

        this.elementRecipes.push({
            type: ElementRecipeType.TextRecipe,
            recipe: {
                text: this.elementRawTextAcc,
                role: bestRole,
                segments: [...this.segmentRecipesAcc],
                cssSelectorNode: this.breadcrumbs.at(-1),
            }
        });
        this.elementRawTextAcc = "";
        this.segmentRecipesAcc = [];
    }

    flushSegment() {
        let text = this.textAcc;
        const trimmedText = trimUnicodeSpace(text);
        if (!isBlank(trimmedText)) {
            if (!this.segmentRecipesAcc.length) {
                text = trimUnicodeSpaceStart(text)
                const whitespaceSuffix = (text.length && isBlank(text[text.length - 1])) ? text[text.length - 1] : "";
                text = trimmedText + whitespaceSuffix;
            }

            this.segmentRecipesAcc.push({
                text,
                attributes: this.currentLanguage ? [new Attribute(
                    AttributeKeys.LANGUAGE,
                    this.currentLanguage
                )] : [],
                beforeRange: this.wholeRawTextAcc ? [this.wholeRawTextAcc.length - this.beforeMaxLength, this.wholeRawTextAcc.length] : [0, 0],
                cssSelectorNode: this.breadcrumbs.at(-1)
            });
        }

        if (this.rawTextAcc.length) {
            this.wholeRawTextAcc = (this.wholeRawTextAcc || "") + this.rawTextAcc;
            this.elementRawTextAcc += this.rawTextAcc;
        }
        this.rawTextAcc = "";
        this.textAcc = "";
    }
}