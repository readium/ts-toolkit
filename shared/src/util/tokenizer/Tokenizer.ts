

/**
 * A tokenizer splits a piece of data [D] into a list of [T] tokens.
 * @deprecated Use `@readium/speech`, which segments text itself.
 */
export interface Tokenizer<D, T> {
    tokenize(data: D): T[];
}