# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.1.1] – 2026-10-08

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
