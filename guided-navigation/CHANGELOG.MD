# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- `abbreviation` role for `<abbr>` and `<acronym>`. With a `title`, an abbreviation becomes `<sub alias="…">` in SSML, with the title as alias, e.g. `<sub alias="World Health Organization">WHO</sub>`. In another language, the `<sub>` is wrapped in `<lang>`, since it can't carry `xml:lang` itself
- Fixtures for abbreviations
- A `glossref` or `biblioref` to an element in the same document carries that element's content as its `children`, like a `noteref` its footnote: a glossary term's definitions (`<dd>`), else the element itself. Unlike a footnote, that element is still output at its own location
- Fixtures for a `glossref` to a glossary and a `biblioref` to a bibliography in the same document

### Fixed

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
