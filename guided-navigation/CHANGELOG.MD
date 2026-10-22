# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
