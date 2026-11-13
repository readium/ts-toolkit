# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and versions follow `MAJOR.MINOR.PATCH`, but breaking changes can ship in minor versions (marked **Breaking:**). Patch versions never contain breaking changes.

## [Unreleased]

### Changed

- **Breaking:** a `textref` always references the object's own content, as in the Guided Navigation specification. Links, backlinks, glossrefs and bibliorefs no longer carry their `href` as `textref`; a link that is the only content of a list item or block becomes that object's text
- **Breaking:** `decodeTextref` reads a bare or href-qualified `#id` as the object's own content whether or not the object has an `id`, so documents whose objects have none are located
- Links, note references, images, audio and video get a `textref` to their own element when `textrefs` covers their role, like blocks
- **Breaking:** a `<figcaption>` or table `<caption>` is no longer folded into its figure's or table's `description`. It stays a `caption` object, so a caption holding headings and paragraphs keeps their text instead of flattening it into one description. A figure or table still gets a `description` from `aria-label`, `aria-labelledby` or `aria-describedby`

### Added

- Fixtures for a figure whose figcaption holds headings and paragraphs, a figure and a table with an `aria-label` and a caption, and a table labelled by its own caption

## [1.3.0] – 2026-11-12

### Added

- `removeDropped` and `DROPPED` are exported, to remove the bracket or quote pairs that objects left out of plain text leave empty, per language, like `text.plain` does, e.g. `前（）後` → `前後`
- Fixtures for an abbreviation's final period, mid-sentence and at sentence end, and for a link in a table cell

## [1.2.4] – 2026-11-10

### Added

- Fixtures for authored-language resolution (descriptions, `lang`/`xml:lang`, empty declarations, case-insensitive matching), roleless objects with a description, inline MathML, roles repeated on a wrapper and its sole child, and link content

### Changed

- The `abbreviation-nested-term-punctuation` fixture uses an abbreviated title mid-sentence, `Dr.`, instead of markup authors don't write

### Fixed

- Punctuation an abbreviation holds alongside the element carrying its text, such as the period of `<abbr title="Doctor"><dfn>Dr</dfn>.</abbr>`, is now part of the expansion, `<sub alias="Doctor">Dr.</sub>`, instead of an object of its own
- A role repeated on a wrapper and its sole child, such as `chapter` on both `<body>` and `<section>`, is now kept on the wrapper only, instead of appearing twice or being removed together with the wrapper's own roles (e.g. `section` in nested sections)
- Plain text left out the words of a link, glossref or biblioref in its sentence, e.g. "The light passes through a at the top." It now keeps them; footnote references, backlinks, pagebreaks and media are still left out
- The content of a link, glossref or biblioref was reduced to its raw text: a language shift or emphasis inside it was lost, a pagebreak's number ran into its words (e.g. "the long chap5ter"), and an image or pagebreak inside it was missing from the output. Its content is now converted like any other text, with its own `ssml` and `children`

## [1.2.3] – 2026-11-06

### Changed

- Republished against `@readium/helpers@1.3.0`/`@readium/shared@2.9.0`

## [1.2.2] – 2026-10-22

### Changed

- The table cell abbreviation and noteref fixtures are reduced to the roles they test: no header row, and a `role="doc-footnote"` element instead of an `<aside>`

## [1.2.1] – 2026-10-22

### Added

- Fixtures for an abbreviation and a noteref inside table cells, and a glossref that is its block's whole content

## [1.2.0] – 2026-10-21

### Added

- `abbreviation` role for `<abbr>` and `<acronym>`. With a `title`, an abbreviation becomes `<sub alias="…">` in SSML, with the title as alias, e.g. `<sub alias="World Health Organization">WHO</sub>`. In another language, the `<sub>` is wrapped in `<lang>`, since it can't carry `xml:lang` itself
- Fixtures for abbreviations
- A `glossref` or `biblioref` to an element in the same document carries that element's content as its `children`, like a `noteref` its footnote: a glossary term (`<dt>`) followed by its definitions (`<dd>`), else the element itself. Unlike a footnote, that element is still output at its own location
- Fixtures for a `glossref` to a glossary and a `biblioref` to a bibliography in the same document

### Fixed

- Plain text kept the brackets or quotes around a note reference, page break or other embedded object it leaves out, e.g. "in the 1870s () along the coast". A pair enclosing only such objects, and separators between them, is now left out with them. Quotation marks follow the text's language, e.g. `„…“` in German, `« … »` in French, `”…”` in Swedish
- Plain text lost the space between an embedded object it leaves out and a following opening quote that is also a closing one elsewhere, e.g. German `»Welt«` or Swedish `”nästa”`, and French lost the space before `»`, `;`, `:`, `!` and `?`
- Content whose text is all one flow around an embedded object, e.g. a lone `<div>` with a noteref, lost that text, keeping only the object
- An embedded object given a new `id` because its own was taken, e.g. a duplicate `id`, kept a `textref` to its own `id` that didn't decode as its locator
- Text from `title`, `alt`, `aria-label` and `alttext` kept line breaks, runs of spaces, soft hyphens and zero-width spaces. Like the text of the content, it now has them collapsed or removed

## [1.1.3] – 2026-10-15

### Fixed

- Descriptions (`alt`, `aria-label`, `aria-labelledby`/`aria-describedby` text, figure and table captions) and the text of page breaks, note references, links and math had no language. They now carry the language of the element they come from, e.g. `<img lang="en" alt="…">` in a French page, and none when their text is in several languages
- An empty `lang` (or `xml:lang` in XHTML) makes the language unknown instead of inheriting the parent's, as `<lang xml:lang="">` in SSML
- Language declarations differing only in case (`en`/`EN`, `en-US`/`en-us`) are the same language, instead of a `<lang>` shift in SSML

## [1.1.2] – 2026-10-13

### Changed

- Footnote and endnote fixtures place the noteref mid-sentence, so inline and deferred note reading produce different output

## [1.1.1] – 2026-10-09

### Changed

- Republished against `@readium/helpers@1.2.1`/`@readium/shared@2.8.0`

## [1.1.0] – 2026-10-02

### Added

- `href` option for `makeGnd`/`parseMarkup`: every ref is resolved against the input's own href, e.g. `#p1` becomes `chapter.xhtml#p1`
- `DecodedTextref.href`: `decodeTextref` reads textrefs naming their resource (`chapter.xhtml#css(...)`, `chapter.xhtml#p1`) instead of ignoring them

### Changed

- `combineDomRangeTextrefs` returns `undefined` for references to two different resources

## [1.0.1] – 2026-10-02

### Added

- Fixtures for `aria-labelledby` pointing to `hidden` and `aria-hidden` elements

### Fixed

- `aria-labelledby` now uses the elements it references even when they are hidden (`hidden` or `aria-hidden="true"`), as AccName requires, instead of ignoring them

## [1.0.0] – 2026-10-01

### Added

- `makeGnd` and `parseMarkup` generate Guided Navigation documents and objects from HTML and XHTML, as `@readium/shared` models
- `textrefs` generation option, with CSS selector, DOM range and text fragment references
- `htmlFallback` generation option, to re-parse malformed XHTML as HTML instead of throwing
- `decodeTextref`, `combineDomRangeTextrefs`, and encoders/decoders for `#css(...)` and `#domrange(...)` references
- `isAriaSubstituted` and `substitutedOwnSelector` for text taken from `aria-label`/`aria-labelledby`
- A language-agnostic fixture suite in `fixtures/`
