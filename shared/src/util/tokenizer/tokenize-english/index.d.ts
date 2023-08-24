export default function (tokenize: Tokenizer): {
    sentences: () => (text: string) => Segment[];
};