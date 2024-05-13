import { Locator } from "../../../Locator";
import { Attribute, ContentElement } from "../element";
import { IllegalStateError, Iterator } from "../Iterator";
import { appendNormalizedWhitespace, trimUnicodeSpace } from "./helpers";

// Type PDFTextItem represents a text item in a PDF page (some properties extracted from PDF.js TextItem type).
export type PDFTextItem = {
    dir: string; // Text direction: 'ttb', 'ltr' or 'rtl'.
    width: number; // Width in device space.
    height: number; // Height in device space.
    fontName: string; // Font name used by PDF.js for converted font
    hasEOL: boolean; // Indicating if the text content is followed by a line-break.
    locator: Locator; // Readium Locator
};

/**
 * A pdf element.
 */
export class PDFContentElement extends ContentElement {
    constructor(
        locator: Locator,
        /**
         * Readable text.
         */
        readonly element: PDFReadableElement,
        attributes: Attribute<any>[] = [],
    ) { super(locator, attributes); }

    get text(): string | undefined {
        return this.element.text;
    }
}

// Element in a PDF resource page.
export type PDFReadableElement = {
    indexes: number[], // Indexes of the original TextItem pieces comprising this element
    text: string; // The accumulated text of this element
    readingDirection?: string; // The reading direction of this element
};

enum Direction {
    Forward = 1,
    Backward = -1
}

// [Element] loaded with [hasPrevious] or [hasNext], associated with the move direction.
class ElementInDirection {
    constructor(
        readonly element: ContentElement,
        readonly direction: Direction
    ) {}
}

/* An iterator which iterates through a whole PDF page provided, 
    and returns the elements based on a [PDFReadableElement] array. */

// TODO extend Iterator class!
export class PageContentIteratorPDF extends Iterator {
    private pageContentFiltered: Array<PDFContentElement> = [];
    private currentElement: ElementInDirection | null = null;
    private currentProgression: number = 0;
    private currentElementIndex: number = 0;

    constructor(
        /**
         * The pdf page, represented as array of [PDFTextItem] which will be iterated through.
         * @param {Array<PDFTextItem>} pageContent - an array that represents the page content of a PDF page.
         * @param {Locator} startLocator - (optional) the locator of the first element to be read.
         */
        private pageContent: Array<PDFTextItem>,
        private startLocator?: Locator | null | undefined
    ) {
        super();
        this.doSaneContentHeuristics();

        if (this.startLocator) {
            this.currentProgression = this.startLocator?.locations?.progression || 0;
            this.updateElementIndex();
        }

        if (this.pageContentFiltered.length > 0) {
            const index = this.currentElementIndex;

            if (index || index === 0) {
                this.currentElement = new ElementInDirection(this.pageContentFiltered[index], Direction.Forward);
            }
        }
    }

    private doSaneContentHeuristics() {
        const contentFiltered = this.pageContent.filter(
            (item: PDFTextItem) => item.locator.text?.highlight !== " " && item.locator.text?.highlight !== ""
        ) as PDFTextItem[];

        console.log("content filtered", contentFiltered);

        const indexes: number[] = [];
        let prevItem: PDFTextItem | null = null;
        let text = "";
        for (let i = 0; i < contentFiltered.length; i++) {
            const item = contentFiltered[i];
            if(
                !prevItem ||

                // These changes possibly indicated a new chunk of text
                item.dir !== prevItem.dir ||
                item.fontName !== prevItem.fontName ||
                (item.dir !== "ttb" && item.height !== prevItem.height) ||
                (item.dir === "ttb" && item.width !== prevItem.width)

                // TODO heuristics:
                // - Elements with single letters followed and preceded immediately by an element with many letters
                //      (this happens with e.g. French accents)
                //      (maybe combine with the font reverting as well?)
                // - Elements where the beginning (top right of rect in ltr) is far away from the previous element's ending
            ) {
                const finalText = trimUnicodeSpace(text);
                if(prevItem && finalText.length > 0)
                    this.pageContentFiltered.push(new PDFContentElement(prevItem.locator, {
                        text: finalText,
                        indexes: indexes.slice(),
                        readingDirection: prevItem.dir
                    }));

                prevItem = item;
                text = item.locator.text!.highlight!;
                indexes.length = 0;
                indexes.push(i);
                continue;
            }
            text = appendNormalizedWhitespace(text, " " + item.locator.text!.highlight!);
            indexes.push(i);
            prevItem = item;
        }
        const finalText = trimUnicodeSpace(text);
        if(finalText.length > 0) {
            this.pageContentFiltered.push(new PDFContentElement(prevItem!.locator, {
                text: finalText,
                indexes: indexes.slice(),
                readingDirection: prevItem!.dir
            }));
        }

        console.log("post-processed!", this.pageContentFiltered);
    }

    current(): ContentElement | null { 
        return this.currentElement ? this.currentElement.element : null;
    }

    async hasPrevious(): Promise<boolean> {
        this.currentElement?.direction === Direction.Backward;
        return this.nextIn(Direction.Backward) !== null;
    }

    previous(): ContentElement {
        if (!this.currentElement) throw new IllegalStateError("Called next() without a successful call to hasNext() first");

        this.currentElement = this.nextIn(Direction.Backward);

        if (this.currentElementIndex && this.currentElementIndex > 0) {
            const newIndex = this.currentElementIndex - 1;
            this.currentProgression = newIndex / this.pageContentFiltered.length * 100;
            this.currentElementIndex = newIndex;
        }

        return this.currentElement ? 
            this.currentElement.element : 
            new PDFContentElement(new Locator( { href : "", type: "" }), { indexes:[-1], text: "" });
    }

    async hasNext(): Promise<boolean> {
        this.currentElement?.direction === Direction.Forward;
        return this.nextIn(Direction.Forward) !== null;
    }

    next(): ContentElement {
        this.currentElement = this.nextIn(Direction.Forward);
        const currentIndex = this.currentElementIndex;
        if (currentIndex !== null &&
            currentIndex >= 0 && 
            currentIndex < this.pageContentFiltered.length - 1) {
            const newIndex = currentIndex + 1;
            this.currentProgression = newIndex / (this.pageContentFiltered.length) * 100;
            this.currentElementIndex = newIndex;
        }
    
        return this.currentElement ? 
            this.currentElement.element : 
            new PDFContentElement(new Locator( { href : "", type: "" }), { indexes: [-1], text: "" });
    }

    private nextIn(direction: Direction): ElementInDirection | null {
        const index = this.currentElementIndex;

        // If the current progression is out of bounds, return null
        if(index === null) return null;

        // If the current progression is at the end of the pageContentFiltered array, return null
        if(index === this.pageContentFiltered.length - 1 && direction === Direction.Forward) return null;

        // If the current progression is at the beginning of the pageContentFiltered array, return null
        if(index === 0 && direction === Direction.Backward) return null;

        // Get the next element in the pageContentFiltered array
        const content = this.pageContentFiltered[index + direction];

        if (content) {
            return new ElementInDirection(content, direction);
        } else {
            return null;
        }
    }

    /**
     * Updates the current [PDFReadableElement] position in the pageContentFiltered array
     * based on the current progression value.
     */
    private updateElementIndex(): number | null {
        if (this.currentProgression === 0) return 0;
        
        // return null if the current progression is out of bounds
        if (this.currentProgression < 0 || this.currentProgression >= 100) return null;
        
        // Convert the progression percentage to an index in the pageContentFiltered array
        return Math.floor(this.currentProgression * this.pageContentFiltered.length / 100);
    }

}