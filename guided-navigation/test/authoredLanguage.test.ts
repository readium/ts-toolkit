import type { GuidedNavigationObject } from "@readium/shared";
import { parseMarkup } from "../src/converter.ts";

function find(nodes: GuidedNavigationObject[], match: (node: GuidedNavigationObject) => boolean): GuidedNavigationObject | undefined {
  for (const node of nodes) {
    if (match(node)) return node;
    const found = find(node.children ?? [], match);
    if (found) return found;
  }
  return undefined;
}

const withDescription = (plain: string) => (node: GuidedNavigationObject) => node.description?.text?.plain === plain;

test("an alt is in its element's inherited language", () => {
  const nodes = parseMarkup('<div lang="fr"><p>Texte.</p><img src="a.png" alt="Un chat"></div>');
  expect(find(nodes, withDescription("Un chat"))?.description?.text?.language).toBe("fr");
});

test("an alt is in the language its own element declares", () => {
  const nodes = parseMarkup('<div lang="fr"><p>Texte.</p><img lang="en" src="a.png" alt="A cat"></div>');
  expect(find(nodes, withDescription("A cat"))?.description?.text?.language).toBe("en");
});

test("an aria-labelledby description is in its target's language", () => {
  const nodes = parseMarkup('<div lang="fr"><p id="l" lang="de">Eine Katze</p><img src="a.png" aria-labelledby="l"></div>');
  expect(find(nodes, withDescription("Eine Katze"))?.description?.text?.language).toBe("de");
});

test("a figure's implicit caption is in the caption's language", () => {
  const nodes = parseMarkup('<div lang="fr"><figure><img src="a.png" alt="Un chien"><figcaption lang="en">A dog</figcaption></figure></div>');
  expect(find(nodes, withDescription("A dog"))?.description?.text?.language).toBe("en");
});

test("a pagebreak label is in its element's language", () => {
  const nodes = parseMarkup('<div lang="fr"><p>Avant <span epub:type="pagebreak" title="5"></span> après.</p></div>');
  expect(find(nodes, (node) => node.role?.has("pagebreak") ?? false)?.text?.language).toBe("fr");
});

test("authored text has no language when none is declared", () => {
  const nodes = parseMarkup('<p>Text.</p><img src="a.png" alt="A cat">');
  expect(find(nodes, withDescription("A cat"))?.description?.text?.language).toBeUndefined();
});

test("an aria-labelledby description has no language when its targets' languages differ", () => {
  const nodes = parseMarkup('<div lang="fr"><p id="a">Un chat</p><p id="b" lang="en">and a dog</p><img src="a.png" aria-labelledby="a b"></div>');
  expect(find(nodes, withDescription("Un chat and a dog"))?.description?.text?.language).toBeUndefined();
});

test("an aria-describedby description is in its targets' shared language", () => {
  const nodes = parseMarkup('<div lang="fr"><p id="a" lang="de">Eine</p><p id="b" lang="de">Katze</p><figure aria-describedby="a b"><img src="a.png" alt="x"></figure></div>');
  expect(find(nodes, withDescription("Eine Katze"))?.description?.text?.language).toBe("de");
});

test("an empty language declaration stops inheritance", () => {
  const nodes = parseMarkup('<div lang="fr"><p>Texte.</p><img lang="" src="a.png" alt="Unknown"></div>');
  expect(find(nodes, withDescription("Unknown"))?.description?.text?.language).toBeUndefined();
});

test("xml:lang wins over lang on the same element", () => {
  const nodes = parseMarkup('<div lang="fr"><p>Texte.</p><img xml:lang="de" lang="en" src="a.png" alt="Katze"></div>');
  expect(find(nodes, withDescription("Katze"))?.description?.text?.language).toBe("de");
});

test("an empty language declaration inside a known one is an explicit shift in SSML", () => {
  const [node] = parseMarkup('<p lang="fr">Bonjour <span lang="">xyz</span> fin.</p>');
  expect(node.text?.ssml).toBe('Bonjour <lang xml:lang="">xyz</lang> fin.');
  expect(node.text?.language).toBe("fr");
});

test("text only in an empty language declaration has no language", () => {
  const [node] = parseMarkup('<p lang="fr"><span lang="">xyz</span></p>');
  expect(node.text?.language).toBeUndefined();
});

test("undeclared text isn't tagged when the SSML base defaults to English", () => {
  const [node] = parseMarkup('<p>Hello <span lang="fr">monde</span> end.</p>');
  expect(node.text?.ssml).toBe('Hello <lang xml:lang="fr">monde</lang> end.');
});

test("formatted text only in an empty language declaration has no language", () => {
  const [node] = parseMarkup('<p lang="fr"><span lang=""><em>xyz</em></span></p>');
  expect(node.text?.ssml).toBe("<emphasis>xyz</emphasis>");
  expect(node.text?.language).toBeUndefined();
});

test("a block in an empty language declaration isn't defaulted to English in SSML", () => {
  const [node] = parseMarkup('<p lang="">Unknown <span lang="fr">monde</span> end.</p>');
  expect(node.text?.ssml).toBe('Unknown <lang xml:lang="fr">monde</lang> end.');
  expect(node.text?.language).toBeUndefined();
});

test("an empty language declaration is a shift when no language is declared around it", () => {
  const [node] = parseMarkup('<p>Hello <span lang="">xyz</span> end.</p>');
  expect(node.text?.ssml).toBe('Hello <lang xml:lang="">xyz</lang> end.');
});

test("an aria-labelledby description has no language when its text switches language inside a target", () => {
  const nodes = parseMarkup('<div lang="fr"><p id="l">Un <span lang="en">cat</span></p><img src="a.png" aria-labelledby="l"></div>');
  expect(find(nodes, withDescription("Un cat"))?.description?.text?.language).toBeUndefined();
});

test("an aria-labelledby target's own aria-label is in that target's language", () => {
  const nodes = parseMarkup('<div lang="fr"><p id="l" lang="de" aria-label="Eine Katze">x</p><img src="a.png" aria-labelledby="l"></div>');
  expect(find(nodes, withDescription("Eine Katze"))?.description?.text?.language).toBe("de");
});

test("a caption has no language when its text switches language", () => {
  const nodes = parseMarkup('<div lang="fr"><figure><img src="a.png" alt="x"><figcaption>Le <i lang="en">cat</i> dort</figcaption></figure></div>');
  expect(find(nodes, withDescription("Le cat dort"))?.description?.text?.language).toBeUndefined();
});

test("a caption's language ignores descendants spoken separately", () => {
  const nodes = parseMarkup('<div lang="fr"><figure><img src="a.png" alt="x"><figcaption>Un chat <span role="doc-credit" lang="en">Photo: Jane</span></figcaption></figure></div>');
  expect(find(nodes, withDescription("Un chat"))?.description?.text?.language).toBe("fr");
});

test("a caption is in the language its text switches to throughout", () => {
  const nodes = parseMarkup('<div lang="fr"><figure><img src="a.png" alt="x"><figcaption> <span lang="en">A dog</span> </figcaption></figure></div>');
  expect(find(nodes, withDescription("A dog"))?.description?.text?.language).toBe("en");
});

test("a link's text has no language when it switches language", () => {
  const nodes = parseMarkup('<p lang="fr">Voir <a href="b.html">le <span lang="en">book</span></a> ici.</p>');
  expect(find(nodes, (node) => node.text?.plain === "le book")?.text?.language).toBeUndefined();
});

test("an empty xml:lang in HTML has no effect, so lang on the same element applies", () => {
  const nodes = parseMarkup('<div lang="de"><p>Text.</p><img xml:lang="" lang="fr" src="a.png" alt="Un chat"></div>');
  expect(find(nodes, withDescription("Un chat"))?.description?.text?.language).toBe("fr");
});

test("an empty xml:lang in HTML doesn't stop inheritance", () => {
  const nodes = parseMarkup('<div lang="fr"><p>Texte.</p><img xml:lang="" src="a.png" alt="Un chat"></div>');
  expect(find(nodes, withDescription("Un chat"))?.description?.text?.language).toBe("fr");
});

test("an empty xml:lang in XHTML makes the language unknown, over lang", () => {
  const nodes = parseMarkup(
    '<div xmlns="http://www.w3.org/1999/xhtml" lang="de"><p>Text.</p><img xml:lang="" lang="fr" src="a.png" alt="Unknown"/></div>',
    "application/xhtml+xml",
  );
  expect(find(nodes, withDescription("Unknown"))?.description?.text?.language).toBeUndefined();
});
