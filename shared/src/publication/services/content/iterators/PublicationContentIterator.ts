import { Resource } from "../../../../fetcher/Resource";
import { Locator } from "../../../Locator";
import { Publication } from "../../../Publication";
import { IllegalStateError, Iterator } from "../Iterator";
import { ContentElement } from "../element";

// Creates a [Content.Iterator] instance for the [Resource], starting from the given [Locator].
// Returns null if the resource media type is not supported.
export type ResourceContentIteratorFactory = (resource: Resource, locator: Locator) => Iterator | null;

enum Direction {
    Forward = 1,
    Backward = -1
}

// [Iterator] for a resource, associated with its [index] in the reading order.
class IndexedIterator {
    constructor(
        readonly index: number,
        readonly iterator: Iterator
    ) {}

    async nextContentIn(direction: Direction): Promise<ContentElement | null> {
        return direction === Direction.Forward ? this.iterator.nextOrNull() : this.iterator.previousOrNull();
    }
}

// [Element] loaded with [hasPrevious] or [hasNext], associated with the move direction.
class ElementInDirection {
    constructor(
        readonly element: ContentElement,
        readonly direction: Direction
    ) {}
}

type LocatorOrProgression = Locator | number;

// A composite [Content.Iterator] which iterates through a whole [publication] and delegates the
// iteration inside a given resource to media type-specific iterators.
export class PublicationContentIterator extends Iterator {
    private _currentIterator: IndexedIterator | null = null;
    private currentElement: ElementInDirection | null = null;

    constructor(
        /**
         * The [Publication] which will be iterated through.
         */
        private publication: Publication,
        /**
         * Starting [Locator] in the publication.
         */
        private startLocator: Locator | undefined,
        /**
         * List of [ResourceContentIteratorFactory] which will be used to create the
         * iterator for each resource. The factories are tried in order until there's a match.
         */
        private resourceContentIteratorFactories: ResourceContentIteratorFactory[]
    ) { super(); }


    async hasPrevious(): Promise<boolean> {
        this.currentElement = await this.nextIn(Direction.Backward);
        return this.currentElement !== null;
    }

    previous(): ContentElement {
        if(this.currentElement?.direction !== Direction.Backward) throw new IllegalStateError("Called previous() without a successful call to hasPrevious() first");
        return this.currentElement.element;
    }

    async hasNext(): Promise<boolean> {
        this.currentElement = await this.nextIn(Direction.Forward);
        return this.currentElement !== null;
    }

    next(): ContentElement {
        if(this.currentElement?.direction !== Direction.Forward) throw new IllegalStateError("Called next() without a successful call to hasNext() first");
        return this.currentElement.element;
    }

    private async nextIn(direction: Direction): Promise<ElementInDirection | null> {
        const iterator = this.currentIterator;
        if(!iterator) return null;

        const content = await iterator.nextContentIn(direction);
        if(!content) {
            const ni = this.nextIteratorIn(direction, iterator.index);
            if(!ni) return null;
            this._currentIterator = ni;
            return this.nextIn(direction);
        }
        return new ElementInDirection(content!, direction);
    }

    /**
     * Returns the [Iterator] for the current [Resource] in the reading order.
     */
    private get currentIterator(): IndexedIterator | null {
        if(!this._currentIterator) {
            this._currentIterator = this.initialIterator();
        }
        return this._currentIterator;
    }

    /**
     * Returns the first iterator starting at [startLocator] or the beginning of the publication.
     */
    private initialIterator(): IndexedIterator | null {
        const index = this.startLocator ? this.publication.readingOrder.findIndexWithHref(this.startLocator.href) : 0;
        const locations: LocatorOrProgression = this.startLocator || 0;
        return this.loadIteratorAt(index, locations) ?? this.nextIteratorIn(Direction.Forward, index);
    }

    /**
     * Returns the next resource iterator in the given [direction], starting from [fromIndex].
     */
    private nextIteratorIn(direction: Direction, fromIndex: number): IndexedIterator | null {
        const index = fromIndex + direction;
        if(index < 0 || index >= this.publication.manifest.readingOrder.items.length) return null;
        const progression = direction === Direction.Forward ? 0 : 1;

        return this.loadIteratorAt(index, progression) ?? this.nextIteratorIn(direction, index);
    }

    /**
     * Loads the iterator at the given [index] in the reading order.
     * The [location] will be used to compute the starting [Locator] for the iterator.
     */
    private loadIteratorAt(index: number, location: LocatorOrProgression): IndexedIterator | null {
        const link = this.publication.readingOrder.items[index];
        const locator = typeof location === "number" ? this.publication.manifest.locatorFromLink(link)?.copyWithLocations({
            progression: location
        }) : location;
        if(!locator) return null;
        const resource = this.publication.get(link);

        for (const factory of this.resourceContentIteratorFactories) {
            const res = factory(resource, locator);
            if(res) new IndexedIterator(index, res);
        }

        return null;
    }
}