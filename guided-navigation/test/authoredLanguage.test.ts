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
