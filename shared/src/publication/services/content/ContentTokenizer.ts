import { DefaultTextContentTokenizer, Range, TextTokenizer, TextUnit, Tokenizer } from "../../../util";
import { Locator, LocatorText } from "../../Locator";
import { ContentElement, TextElement, TextSegment } from "./element";

// A tokenizer splitting a [Content.Element] into smaller pieces.
export type ContentTokenizer  = Tokenizer<ContentElement, ContentElement>;

export class TextContentTokenizer implements ContentTokenizer {
    /**
     * 
     * @param defaultLanguage The default assumed language
     * @param unit The unit of the produced [Locator]s.
     * @param contextSnippetLength Length of `before` and `after` snippets in the produced [Locator]s.
     * @param textTokenizerFactory Factory to create a [TextTokenizer] from, using the specified language and unit.
     */
    constructor(
        private readonly defaultLanguage: string | null,
        unit: TextUnit,
        private readonly contextSnippetLength = 50,
        private readonly textTokenizerFactory: (language: string | null) => TextTokenizer
            = (language) => DefaultTextContentTokenizer(language, unit)
    ) {}

    tokenize(data: ContentElement): ContentElement[] {
        if(data instanceof TextElement) {
            return [
                new TextElement(
                    data.locator,
                    data.role,
                    data.segments.map(s => this.tokenizeSegment(s)).flat(), 
                )
            ];
        }
        return [data];
    }

    private tokenizeSegment(segment: TextSegment): TextSegment[] {
        return this.textTokenizerFactory(segment.language ?? this.defaultLanguage)
            .tokenize(segment.text)
            .map(range => new TextSegment(
                new Locator({
                    href: segment.locator.href,
                    type: segment.locator.type,
                    title: segment.locator.title,
                    locations: segment.locator.locations,
                    text: this.extractTextContextIn(segment.text, range)
                }),
                segment.text.substring(range[0], range[1]),
                segment._attributes
            ));
    }

    private extractTextContextIn(str: string, range: Range): LocatorText {
        const after = str.substring(range[1], range[1] + this.contextSnippetLength);
        const before = str.substring(range[0] - this.contextSnippetLength, range[0]);
        return new LocatorText({
            after: after.length > 0 ? after : undefined,
            before: before.length > 0 ? before : undefined,
            highlight: str.substring(range[0], range[1]),
        })
    }
}