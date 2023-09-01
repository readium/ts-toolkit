// Only covers what's necessary to use these packages from TS

export declare interface TextlintSegment {
    value: string;
    index: number;
    offset: number;
}

declare class Tokenizer {
    constructor(opts?: {
        cacheGet?: (key: any) => any;
        cacheSet?: (key: any, value: any) => void;
    });

    split(
        fn: Function,
        opts?: {
            preserveProperties?: boolean;
            cache?: Function;
        }
    ): (text: string | Object[], tok?: any) => any[];

    debug(prefix?: string): (text: string, tok: any) => boolean;

    re(re: RegExp, opts?: { split?: boolean }): Function;

    splitAndMerge(
        fn: Function,
        opts?: {
            mergeWith?: string;
        }
    ): (tokens: any[]) => any[];

    filter(fn: Function): Function;

    extend(fn: Function | Object): Function;

    ifthen(condition: Function, then: Function): Function;

    test(re: RegExp): Function;

    flow(...fns: Function[]): Function;

    serie(...fns: Function[]): Function;

    merge: Function;
    sections: Function;
    words: Function;
    characters: Function;
}

export default Tokenizer;