# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] – 2026-10-01

### Added

- `makeGnd` and `parseMarkup` generate Guided Navigation documents and objects from HTML and XHTML, as `@readium/shared` models
- `textrefs` generation option, with CSS selector, DOM range and text fragment references
- `decodeTextref`, `combineDomRangeTextrefs`, and encoders/decoders for `#css(...)` and `#domrange(...)` references
- `isAriaSubstituted` and `substitutedOwnSelector` for text taken from `aria-label`/`aria-labelledby`
- A language-agnostic fixture suite in `fixtures/`
