import { makeGnd } from "../src/makeGnd.ts";
import { parseMarkup } from "../src/converter.ts";

test("makeGnd wraps parseMarkup's output as-is for a full document", () => {
  const input = "<!DOCTYPE html><html><head><title>t</title></head><body><p>Hello.</p></body></html>";
  expect(makeGnd(input)?.guided).toEqual(parseMarkup(input));
});

test("makeGnd wraps parseMarkup's output as-is for a bodyless fragment", () => {
  const input = '<section epub:type="chapter" xml:lang="fr">Bonjour.</section>';
  expect(makeGnd(input, "application/xhtml+xml")?.guided).toEqual(parseMarkup(input, "application/xhtml+xml"));
});

test("makeGnd never fabricates a body node for a bodyless fragment", () => {
  const input = '<section epub:type="chapter" xml:lang="fr">Bonjour.</section>';
  const doc = makeGnd(input, "application/xhtml+xml");
  expect(doc?.guided.some((node) => node.role?.has("body"))).toBe(false);
});

test("makeGnd returns undefined when the input has no navigable content", () => {
  expect(makeGnd("<div></div>")).toBe(undefined);
});
