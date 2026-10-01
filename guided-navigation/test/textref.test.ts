import { parseMarkup } from "../src/converter.ts";
import {
  encodeCssSelectorFragment,
  decodeCssSelectorFragment,
  encodeDomRangeFragment,
  decodeDomRangeFragment,
  encodeTextFragmentDirective,
  decodeTextFragmentDirective,
  decodeTextref,
} from "../src/textrefFragment.ts";

test("textrefs option is off by default — no textref is generated", () => {
  const [result] = parseMarkup("<p>Hello.</p>");
  expect(result.textref).toBe(undefined);
});

test("textrefs: true generates a #css(...) textref for a node with no id", () => {
  const [result] = parseMarkup("<p>Hello.</p>", undefined, { textrefs: true });
  expect(result.textref?.startsWith("#css(")).toBe(true);
  expect(decodeCssSelectorFragment(result.textref)).toBe("p");
});

test("textrefs prefers a bare #id over a generated selector", () => {
  const [result] = parseMarkup('<p id="par1">Hello.</p>', undefined, { textrefs: true });
  expect(result.textref).toBe("#par1");
});

test("textrefs keeps an id containing a space as a bare, percent-encoded URL fragment", () => {
  const [result] = parseMarkup('<p id="foo bar">Hello.</p>', undefined, { textrefs: true });
  expect(result.textref).toBe("#foo%20bar");
  expect(decodeTextref(result)).toEqual({ cssSelector: "#foo\\ bar" });
});

test("textrefs emits an id needing CSS escaping as a URL fragment, not a CSS-escaped selector", () => {
  const [result] = parseMarkup('<p id="1intro">Hello.</p>', undefined, { textrefs: true });
  expect(result.textref).toBe("#1intro");
  expect(decodeTextref(result)).toEqual({ cssSelector: "#\\31 intro" });
});

test("textrefs: [roles] restricts generation to the listed roles", () => {
  const input = "<p>Hello.</p><h1>Title</h1>";
  const [p, h1] = parseMarkup(input, undefined, { textrefs: ["heading1"] });
  expect(p.textref).toBe(undefined);
  expect(decodeCssSelectorFragment(h1.textref)?.length ? true : false).toBe(true);
});

test("textrefs: ['leaf-text'] gives each roleless leaf-text <div> its own textref — e.g. paragraph-like fragments with no <p>/role at all", () => {
  const html = `<div class="case"><div class="frag">Hello.</div><div class="frag">World.</div></div>`;
  const [first, second] = parseMarkup(html, undefined, { textrefs: ["leaf-text"] });
  expect(decodeCssSelectorFragment(first.textref)?.length ? true : false).toBe(true);
  expect(decodeCssSelectorFragment(second.textref)?.length ? true : false).toBe(true);
});

test("textrefs: ['leaf-text'] does not give a purely structural wrapper (no text of its own) a textref", () => {
  // A wrapper that owns no text of its own is dropped from the GND tree
  // entirely (nothing to flush at its own tail()) — only the two leaf-text
  // divs come out.
  const html = `<div><div>Hello.</div><div>World.</div></div>`;
  const result = parseMarkup(html, undefined, { textrefs: ["leaf-text"] });
  expect(result.length).toBe(2);
});

test("textrefs: true also covers roleless leaf-text blocks", () => {
  const [result] = parseMarkup("<div>Hello.</div>", undefined, { textrefs: true });
  expect(decodeCssSelectorFragment(result.textref)?.length ? true : false).toBe(true);
});

test("textrefs: [someOtherRole] alone (no 'leaf-text' in the array) still excludes a roleless leaf-text block", () => {
  const [result] = parseMarkup("<div>Hello.</div>", undefined, { textrefs: ["heading1"] });
  expect(result.textref).toBe(undefined);
});

test("textrefs: ['leaf-text'] never assigns a role to the roleless block — only its textref eligibility changes", () => {
  const [result] = parseMarkup("<div>Hello.</div>", undefined, { textrefs: ["leaf-text"] });
  expect(result.role).toBe(undefined);
});

test("textrefs: true doesn't stop a role-less <thead>/<tbody> from being flattened away", () => {
  const html = `<table><thead><tr><th scope="col">Name</th></tr></thead><tbody><tr><td>Ada</td></tr><tr><td>Bob</td></tr></tbody></table>`;
  const [withRefs] = parseMarkup(html, undefined, { textrefs: { roles: true } });
  const [without] = parseMarkup(html);
  expect(withRefs.children?.length).toBe(without.children?.length);
  expect(withRefs.children?.every((c) => c.role?.has("row"))).toBe(true);
});

test("an object with only a role gets a textref to its own element even with textrefs off", () => {
  const [, separator] = parseMarkup("<p>One.</p><hr><p>Two.</p>");
  expect(separator.role).toEqual(new Set(["separator"]));
  expect(decodeCssSelectorFragment(separator.textref)).toBe("hr");
});

test("an object with only a role and a description gets a textref to its own element even with textrefs off", () => {
  const [image] = parseMarkup('<span role="img" aria-label="Four stars">★★★★</span>');
  expect(image.description?.text?.plain).toBe("Four stars");
  expect(decodeCssSelectorFragment(image.textref)).toBe("span");
});

test("a roleless wrapper with a description is kept, not spliced into its parent", () => {
  const [wrapper] = parseMarkup('<div aria-label="Sidebar"><p>One.</p><p>Two.</p></div>');
  expect(wrapper.description?.text?.plain).toBe("Sidebar");
  expect(wrapper.children?.length).toBe(2);
});

test("a lone roleless child with a description is not hoisted into its parent", () => {
  const [item] = parseMarkup('<ul><li><div aria-label="Sidebar">One.</div></li></ul>')[0].children!;
  expect(item.children?.[0].description?.text?.plain).toBe("Sidebar");
});

test("MathML is carried as SSML in the MathML namespace, keeping its alttext as description and a textref to its element", () => {
  const [math] = parseMarkup('<math alttext="x squared"><msup><mi>x</mi><mn>2</mn></msup></math>');
  expect(math.text?.ssml).toBe('<math xmlns="http://www.w3.org/1998/Math/MathML" alttext="x squared"><msup><mi>x</mi><mn>2</mn></msup></math>');
  expect(math.text?.plain).toBe(undefined);
  expect(math.description?.text?.plain).toBe("x squared");
  expect(decodeCssSelectorFragment(math.textref)).toBe("math");
});

test("inline MathML becomes a placeholder in its sentence's SSML, with the math object as a child", () => {
  const [paragraph] = parseMarkup("<p>Since <math><mi>x</mi></math> holds.</p>");
  const [math] = paragraph.children!;
  expect(paragraph.text?.ssml).toBe(`Since <readium:math id="${math.id}" /> holds.`);
  expect(math.text?.ssml).toBe('<math xmlns="http://www.w3.org/1998/Math/MathML"><mi>x</mi></math>');
});

test("role=\"math\" on non-MathML markup carries its content as plain text and its aria-label as description", () => {
  const [math] = parseMarkup('<span role="math" aria-label="x squared">x²</span>');
  expect(math.text?.plain).toBe("x²");
  expect(math.description?.text?.plain).toBe("x squared");
  expect(decodeCssSelectorFragment(math.textref)).toBe("span");
});

test("an object with text next to a role-only sibling still gets no textref with textrefs off", () => {
  const [first, , last] = parseMarkup("<p>One.</p><hr><p>Two.</p>");
  expect(first.textref).toBe(undefined);
  expect(last.textref).toBe(undefined);
});

test("a link's own href textref is never clobbered by, nor clobbers, the parent's generated reference", () => {
  const input = '<ul><li><a href="chapter1.xhtml">Chapter 1</a></li></ul>';
  const [list] = parseMarkup(input, undefined, { textrefs: ["listItem"] });
  const [item] = list.children!;
  expect(decodeCssSelectorFragment(item.textref)?.length ? true : false).toBe(true);
  const [link] = item.children!;
  expect(link.textref).toBe("chapter1.xhtml");
});

test("encodeCssSelectorFragment/decodeCssSelectorFragment round-trip", () => {
  const selector = 'li:nth-child(2) > a[href="chapter1.xhtml"]';
  expect(decodeCssSelectorFragment(encodeCssSelectorFragment(selector))).toBe(selector);
});

test("decodeCssSelectorFragment returns undefined for an unrelated textref", () => {
  expect(decodeCssSelectorFragment("chapter1.xhtml#intro")).toBe(undefined);
  expect(decodeCssSelectorFragment(undefined)).toBe(undefined);
});

test("encodeDomRangeFragment/decodeDomRangeFragment round-trip", () => {
  const domRange = {
    start: { cssSelector: "p", textNodeIndex: 0, charOffset: 3 },
    end: { cssSelector: "p", textNodeIndex: 0, charOffset: 8 },
  };
  expect(decodeDomRangeFragment(encodeDomRangeFragment(domRange))).toEqual(domRange);
});

test("decodeDomRangeFragment returns undefined for an unrelated or malformed textref", () => {
  expect(decodeDomRangeFragment("chapter1.xhtml#intro")).toBe(undefined);
  expect(decodeDomRangeFragment("#domrange(not-json)")).toBe(undefined);
  expect(decodeDomRangeFragment(undefined)).toBe(undefined);
});

test("decodeTextref prefers domRange, then css(), then a self-matching bare #id", () => {
  const domRange = { start: { cssSelector: "p", textNodeIndex: 0, charOffset: 0 } };
  expect(decodeTextref({ textref: encodeDomRangeFragment(domRange) })).toEqual({
    cssSelector: "p",
    domRange,
  });
  expect(decodeTextref({ textref: encodeCssSelectorFragment("p") })).toEqual({ cssSelector: "p" });
  expect(decodeTextref({ id: "par1", textref: "#par1" })).toEqual({ cssSelector: "#par1" });
});

test("decodeTextref prefers domRange's container over start's own selector — start's container is whichever child holds the first flow text node, not the block", () => {
  const domRange = { start: { cssSelector: "span.token", textNodeIndex: 0, charOffset: 0 }, container: "div.frag" };
  expect(decodeTextref({ textref: encodeDomRangeFragment(domRange) })).toEqual({
    cssSelector: "div.frag",
    domRange,
  });
});

test("decodeTextref ignores a navigational textref that isn't this node's own id", () => {
  expect(decodeTextref({ textref: "chapter1.xhtml" })).toBe(undefined);
  expect(decodeTextref({ id: "par1", textref: "#note1" })).toBe(undefined);
  expect(decodeTextref(undefined)).toBe(undefined);
});

test("parseMarkup() given a live element computes a domRange resolving back to the exact text", () => {
  const doc = new DOMParser().parseFromString("<body><p>Hello <em>world</em>.</p></body>", "text/html");
  const p = doc.querySelector("p")!;

  const [result] = parseMarkup(p, undefined, { textrefs: { roles: true, domRange: true } });

  const ref = decodeTextref(result);
  expect(ref?.domRange).toBeTruthy();
  const { start, end } = ref!.domRange!;
  expect(end).toBeTruthy();

  const isText = (n: Node) => n.nodeType === 3;
  const startContainer = doc.querySelector(start.cssSelector)!;
  const startNode = Array.from(startContainer.childNodes).filter(isText)[start.textNodeIndex] as Text;
  expect(startNode.nodeValue!.slice(start.charOffset)).toBe("Hello ");

  const endContainer = doc.querySelector(end!.cssSelector)!;
  const endNode = Array.from(endContainer.childNodes).filter(isText)[end!.textNodeIndex] as Text;
  expect(endNode.nodeValue!.slice(0, end!.charOffset)).toBe(".");
});

test("parseMarkup() given a live leaf-text block whose flow starts inside a child <span> still resolves its domRange's cssSelector to the block itself, not that span", () => {
  const doc = new DOMParser().parseFromString(
    '<body><div class="frag"><span class="token">Hello</span><span class="token"> </span><span class="token">world.</span></div></body>',
    "text/html",
  );
  const div = doc.querySelector("div.frag")!;

  const [result] = parseMarkup(div, undefined, { textrefs: { roles: true, domRange: true } });

  const ref = decodeTextref(result);
  expect(ref?.domRange).toBeTruthy();
  expect(doc.querySelector(ref!.cssSelector!)).toBe(div);
});

test("parseMarkup() given a live element under a selectorRoot never generates a selector that resolves outside that root, even when an id inside it collides with one elsewhere in the host document", () => {
  const doc = new DOMParser().parseFromString(
    '<body><section id="chapter1"><section id="dup">Chapter one.</section></section><section id="chapter2"><section id="dup"><p>Chapter two.</p></section></section></body>',
    "text/html",
  );
  const chapter2 = doc.getElementById("chapter2")!;

  const [root] = parseMarkup(chapter2, undefined, { textrefs: { roles: true, domRange: true } });
  const nodes = [root, ...root.children!, ...root.children!.flatMap((c) => c.children ?? [])];
  const paragraph = nodes.find((n) => decodeTextref(n)?.domRange)!;

  const ref = decodeTextref(paragraph);
  expect(ref?.domRange).toBeTruthy();
  const container = doc.querySelector(ref!.domRange!.start.cssSelector)!;
  expect(chapter2.contains(container)).toBe(true);
});

test("a rootAnchor-prefixed compound selector (starts with '#' like a bare id, but isn't one) is still wrapped in #css(...)", () => {
  const doc = new DOMParser().parseFromString('<body><section id="chapter"><p>a</p><p>b</p></section></body>', "text/html");
  const chapter = doc.getElementById("chapter")!;

  const [root] = parseMarkup(chapter, undefined, { textrefs: { roles: true } });
  const second = root.children![1];

  expect(second.textref?.startsWith("#css(")).toBe(true);
  const selector = decodeCssSelectorFragment(second.textref)!;
  expect(selector.startsWith("#chapter > ")).toBe(true);
  expect(doc.querySelector(selector)).toBe(doc.querySelectorAll("p")[1]);
});

test("parseMarkup() given a markup string never enables domRange, even when requested — it always parses a detached document", () => {
  const [result] = parseMarkup("<p>Hello.</p>", undefined, { textrefs: { roles: true, domRange: true } });
  expect(decodeCssSelectorFragment(result.textref)?.length ? true : false).toBe(true);
  expect(decodeDomRangeFragment(result.textref)).toBe(undefined);
});

test("encodeTextFragmentDirective/decodeTextFragmentDirective round-trip", () => {
  expect(decodeTextFragmentDirective(encodeTextFragmentDirective({ textStart: "Hello, world!" }))).toEqual({
    textStart: "Hello, world!",
  });
  expect(decodeTextFragmentDirective(encodeTextFragmentDirective({ textStart: "middle", prefix: "before-text", suffix: "after-text" }))).toEqual({ textStart: "middle", prefix: "before-text", suffix: "after-text" });
  expect(decodeTextFragmentDirective(encodeTextFragmentDirective({ textStart: "start", textEnd: "end" }))).toEqual({
    textStart: "start",
    textEnd: "end",
  });
});

test("decodeTextFragmentDirective returns undefined for a textref with no directive", () => {
  expect(decodeTextFragmentDirective("#css(p)")).toBe(undefined);
  expect(decodeTextFragmentDirective(undefined)).toBe(undefined);
});

test("textFragment: true appends a :~:text=... directive onto the existing #css(...) reference for unique text", () => {
  const [result] = parseMarkup("<p>A unique sentence.</p>", undefined, { textrefs: { roles: true, textFragment: true } });
  expect(result.textref!.startsWith("#css(p)")).toBe(true);
  expect(result.textref!.includes(":~:text=")).toBe(true);
  // The polyfill's own exact-match path normalizes case (matching is
  // case-insensitive per the WICG spec either way).
  expect(decodeTextFragmentDirective(result.textref)).toEqual({ textStart: "a unique sentence." });
});

test("textFragment: true composes with domRange: true — both encodings appear in one textref", () => {
  const doc = new DOMParser().parseFromString("<body><p>A unique sentence.</p></body>", "text/html");
  const p = doc.querySelector("p")!;
  const [result] = parseMarkup(p, undefined, { textrefs: { roles: true, domRange: true, textFragment: true } });
  expect(decodeTextref(result)?.domRange).toBeTruthy();
  expect(decodeTextFragmentDirective(result.textref)).toEqual({ textStart: "a unique sentence." });
});

test("textFragment: true works from a detached markup string too, unlike domRange", () => {
  const [result] = parseMarkup("<p>A unique sentence.</p>", undefined, { textrefs: { roles: true, textFragment: true } });
  expect(decodeTextFragmentDirective(result.textref)).toEqual({ textStart: "a unique sentence." });
});

test("textFragment: true widens with prefix/suffix context when the text recurs, and gives up when it still can't disambiguate", () => {
  const input =
    "<p>Before one context</p><p>Repeated text</p><p>Middle marker</p><p>Repeated text</p><p>After two context</p>";
  const [, first, , second] = parseMarkup(input, undefined, { textrefs: { roles: true, textFragment: true } });

  const firstDirective = decodeTextFragmentDirective(first.textref);
  const secondDirective = decodeTextFragmentDirective(second.textref);
  expect(firstDirective).toBeTruthy();
  expect(secondDirective).toBeTruthy();
  expect(firstDirective).not.toEqual(secondDirective);

  // Recurring text with identical surrounding context on every occurrence
  // gives up — the existing #css(...) reference is left untouched.
  const identicalContext =
    "<p>A B C</p><p>Same</p><p>D E F</p><p>A B C</p><p>Same</p><p>D E F</p>";
  const nodes = parseMarkup(identicalContext, undefined, { textrefs: { roles: true, textFragment: true } });
  const [dupA, dupB] = nodes.filter((n) => n.text?.plain === "Same");
  expect(decodeTextFragmentDirective(dupA.textref)).toBe(undefined);
  expect(decodeTextFragmentDirective(dupB.textref)).toBe(undefined);
});

// Surrogate pairs, locale-aware word segmentation, and richer inline markup
// each affect where a text-fragment match can legally start/end.

test("textFragment: true keeps an astral-plane character (surrogate pair) intact rather than splitting it", () => {
  const [result] = parseMarkup("<p>Testing emoji 😀 support works.</p>", undefined, {
    textrefs: { roles: true, textFragment: true },
  });
  const directive = decodeTextFragmentDirective(result.textref);
  expect(directive?.textStart).toBe("testing emoji 😀 support works.");
});

test("textFragment: true splits into textStart/textEnd for text past the exact-match length limit", () => {
  const longText = Array.from({ length: 60 }, (_, i) => `word${i}`).join(" ") + ".";
  const [result] = parseMarkup(`<p>${longText}</p>`, undefined, { textrefs: { roles: true, textFragment: true } });
  const directive = decodeTextFragmentDirective(result.textref);
  expect(directive?.textStart).toBe("word0 word1 word2");
  expect(directive?.textEnd).toBe("word57 word58 word59.");
});

test("textFragment: true flattens inline markup and <br> within a block into one match", () => {
  const [result] = parseMarkup("<p>Hello <b>bold</b> and<br/><em>italic</em> text.</p>", undefined, {
    textrefs: { roles: true, textFragment: true },
  });
  const directive = decodeTextFragmentDirective(result.textref);
  expect(directive?.textStart).toBe("Hello bold and");
  expect(directive?.textEnd).toBe("italic text.");
});

test("textFragment: true uses locale-aware word segmentation for recurring CJK text with no whitespace", () => {
  // いただきます/ご馳走様 have no whitespace between characters, so context
  // growth must use Intl.Segmenter word boundaries (driven by the parsed
  // document's own lang, per makeNewSegmenter's document-scoping) rather
  // than splitting mid-word.
  const input = "<html lang=ja><p>いただきますいただきます</p><p>ご馳走様</p><p>いただきますいただきます</p></html>";
  const [first, , third] = parseMarkup(input, undefined, { textrefs: { roles: true, textFragment: true } });

  const firstDirective = decodeTextFragmentDirective(first.textref);
  const thirdDirective = decodeTextFragmentDirective(third.textref);
  // The exact-match path normalizes via NFKD (e.g. だ -> た + a combining mark).
  expect(firstDirective?.textStart).toBe("いただきますいただきます".normalize("NFKD"));
  expect(firstDirective?.prefix).toBe(undefined);
  expect(firstDirective?.suffix).toBe("ご馳走様");
  expect(thirdDirective?.textStart).toBe("いただきますいただきます".normalize("NFKD"));
  expect(thirdDirective?.prefix).toBe("ご馳走様");
  expect(thirdDirective?.suffix).toBe(undefined);
});

test("decodeTextref decodes text (highlight/before/after) from a text-fragment directive, independent of cssSelector/domRange", () => {
  const textref = `${encodeCssSelectorFragment("p")}${encodeTextFragmentDirective({ textStart: "middle", prefix: "before", suffix: "after" })}`;
  expect(decodeTextref({ textref })).toEqual({
    cssSelector: "p",
    text: { highlight: "middle", before: "before", after: "after" },
  });

  const bare = encodeTextFragmentDirective({ textStart: "Hello." });
  expect(decodeTextref({ textref: `#${bare}` })).toEqual({ text: { highlight: "Hello." } });
});

test("decodeTextref carries a textStart/textEnd range as fragment, not text.highlight", () => {
  const directive = { textStart: "start", textEnd: "end", prefix: "before", suffix: "after" };
  const textref = `${encodeCssSelectorFragment("p")}${encodeTextFragmentDirective(directive)}`;
  expect(decodeTextref({ textref })).toEqual({
    cssSelector: "p",
    fragment: encodeTextFragmentDirective(directive),
  });
});
