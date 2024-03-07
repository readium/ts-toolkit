

/**
 * A tokenizer splits a piece of data [D] into a list of [T] tokens.
 */
export interface Tokenizer<D, T> {
    tokenize(data: D): T[];
}