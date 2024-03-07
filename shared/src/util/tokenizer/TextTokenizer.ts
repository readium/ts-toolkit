import { Language } from "../Language";
import { Tokenizer } from "./Tokenizer";
import BasicEnglishTokenizer from "./tokenize-english";
import BasicTokenizer, { TextlintSegment } from "./tokenize-text";

// Start / End
export type Range = [number, number];

/**
 * A tokenizer splitting a String into range tokens (e.g. words, sentences, etc.).
 */
export type TextTokenizer = Tokenizer<string, Range>;

/**
 * A text token unit which can be used with a [TextTokenizer].
 */
export enum TextUnit {
    Word = "word",
    Sentence = "sentence",
    Paragraph = "paragraph",
}

//  A default cluster [TextTokenizer] taking advantage of the best capabilities of the navigator
export const DefaultTextContentTokenizer = (language: Language | null, unit: TextUnit): TextTokenizer => {
    if("Segmenter" in Intl) {
        // Available in any evergreen browser EXCEPT for Firefox.
        // See: https://caniuse.com/mdn-javascript_builtins_intl_segmenter
        return new IntlTextTokenizer(language, unit);
    } else {
        // Fallback that works mainly for English
        return new NaiveTextTokenizer(language, unit);
    }
};

/**
 * A [TextTokenizer] using the Intl.Segmenter API.
 * Very aware of language-specific rules since it uses ICU behind the scenes.
 */
export class IntlTextTokenizer implements TextTokenizer {
    private segmenter: Intl.Segmenter;

    constructor(
        language: Language | null,
        private unit: TextUnit
    ) {
        language = language ?? navigator?.language; // Fallback to browser language
        if("Segmenter" in Intl === false) throw new Error("Intl.Segmenter is not supported in this environment");
        if(unit === TextUnit.Paragraph) throw new Error("IntlTextTokenizer does not handle TextUnit.Paragraph");
        this.segmenter = new Intl.Segmenter(language, {
            granularity: unit
        });
    }

    tokenize(data: string): Range[] {
        const segments = this.segmenter.segment(data);
        const ranges: Range[] = [];
        for (let segment of segments) {
            if(this.unit === TextUnit.Word && segment.isWordLike === false) continue;
            const s = speakableToken(segment.segment);
            if(s === null) continue;
            ranges.push([segment.index, segment.index + s.length]);
        }
        return ranges;
    }
}

/**
 * A [TextTokenizer] using a naive approach to splitting text into tokens.
 * This is a fallback for browsers that don't support Intl.Segmenter.
 * It works mainly on English and similar languages. Don't use unless necessary.
 */
export class NaiveTextTokenizer {
    private tokenizer: BasicTokenizer;
    private isEnglish: boolean;

    constructor(
        language: Language | null,
        private unit: TextUnit
    ) {
        language = language ?? navigator?.language;
        this.isEnglish = language.toLowerCase().split("-")[0] === "en";
        if(unit === TextUnit.Paragraph) throw new Error("NaiveTextTokenizer does not handle TextUnit.Paragraph");
        this.tokenizer = new BasicTokenizer();
    }

    tokenize(data: string): Range[] {
        let segments: TextlintSegment[] = [];
        switch (this.unit) {
            case TextUnit.Word:
                segments = this.tokenizer.words()(data);
                break;
            case TextUnit.Sentence:
                if(this.isEnglish) {
                    const englishTokenizer = BasicEnglishTokenizer(this.tokenizer);
                    segments = englishTokenizer.sentences()(data);
                } else {
                    segments = this.tokenizer.sections()(data);
                }
                break;
            default:
                segments = [];
        }
        if(!segments) return [];

        const ranges: Range[] = [];
        segments.forEach(segment => {
            if(segment.value.length === 0) return;
            const s = speakableToken(segment.value);
            if(s === null) return;
            ranges.push([segment.index, segment.index + s.length]);
        });

        return ranges;
    }
}

// Unicode-aware of checking if there's anything that can be spoken in a string
// "Spoken" in this case means at least one unicode letter or unicode number character
export const speakableToken = (token: string): string | null => {
    const trimmedToken = token.trimEnd();
    if(trimmedToken.length === 0) return null;
    if(trimmedToken.match(/[\p{L}\p{N}]+/u) === null) return null;
    return trimmedToken;
}