import { Locator } from "../../../Locator";
import { Attribute, ContentElement } from "../element";
import { IllegalStateError, Iterator } from "../Iterator";

// Type TextItem represents a text item in a PDF page (extracted from pdf.js TextItem type).
type TextItem = {
    str: string;
    dir: string;
    locator: Locator;
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
    index: number,
    text: string;
    readingDirection?: string;
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
export class PageContentIteratorPDF extends Iterator{
    private pageContentFiltered: Array<PDFContentElement> = [];
    private currentElement: ElementInDirection | null = null;
    private currentProgression: number = 0;
    private currentElementIndex: number = 0;

    constructor(
        /**
         * The pdf page, represented as array of [TextItem] which will be iterated through.
         * @param {Array<TextItem>} pageContent - an array that represents the page content of a PDF page.
         * @param {Locator} startLocator - (optional) the locator of the first element to be read.
         */
        private pageContent: Array<TextItem>,
        private startLocator?: Locator | null | undefined
    ) { 
        super();
        const contentFiltered = this.pageContent.filter(
            (item: TextItem) => item?.str !== " " && item?.str !== ""
        ) as Array<TextItem>;

        this.pageContentFiltered = contentFiltered.map((item) => {
            return new PDFContentElement(item.locator, {
                index: contentFiltered.indexOf(item),
                text: item.str,
                readingDirection: item.dir
            });
        });

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


    // Returns the current element to be read.
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
            new PDFContentElement(new Locator( { href : "", type: "" }), { index: -1, text: "" });
        
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
            new PDFContentElement(new Locator( { href : "", type: "" }), { index: -1, text: "" });
             
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