import { Iterator } from "./Iterator";
import { ContentElement, TextualElement } from "./element";

/**
 * Provides an iterable list of content [Element]s.
 */
export abstract class Content {
    /**
     * Extracts the full raw text, or returns null if no text content can be found.
     * @param separator Separator to use between individual elements. Defaults to newline.
     */
    text(separator: string = "\n"): string | null {
        return this.elements()
            .map(element => (element as TextualElement)?.text)
            .filter(text => text !== undefined && text.length > 0)
            .join(separator);
    }

    /**
     * Creates a new iterator for this content.
     */
    abstract iterator(): Iterator;

    /**
     * Returns all the elements as a list.
     */
    elements(): ContentElement[] {
        const list: ContentElement[] = [];
        const iterator = this.iterator();
        while (true) {
            if(!iterator.hasNext()) break;
            list.push(iterator.next());
        }
        return list;
    }
}