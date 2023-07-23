import { ContentElement } from "./element";

export class IllegalStateError extends Error {
    constructor(message: string) {
        super(message);
    }
}

/**
 * Iterates through a list of [Element] items asynchronously.
 * [hasNext] and [hasPrevious] refer to the last element computed by a previous call to any of both methods.
 */
export abstract class Iterator {
    /**
     * Returns true if the iterator has a next element, suspending the caller while processing it.
     */
    abstract hasNext(): Promise<boolean>;
    /**
     * Retrieves the element computed by a preceding call to [hasNext], or throws an
     * [IllegalStateError] if [hasNext] was not invoked. This method should only be used in
     * pair with [hasNext].
     */
    abstract next(): ContentElement;
    /**
     * Advances to the next item and returns it, or null if we reached the end.
     */
    async nextOrNull(): Promise<ContentElement | null> {
        return (await this.hasNext()) ? this.next() : null;
    }
    /**
     * Returns true if the iterator has a previous element, suspending the caller while processing it.
     */
    abstract hasPrevious(): Promise<boolean>;
    /**
     * Retrieves the element computed by a preceding call to [hasPrevious], or throws an
     * [IllegalStateError] if [hasPrevious] was not invoked. This method should only be used in
     * pair with [hasPrevious].
     */
    abstract previous(): ContentElement;
    /**
     * Advances to the previous item and returns it, or null if we reached the beginning.
     */
    async previousOrNull(): Promise<ContentElement | null> {
        return (await this.hasPrevious()) ? this.previous() : null;
    }
}