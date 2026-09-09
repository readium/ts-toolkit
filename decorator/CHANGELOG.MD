# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.1.1] – 2026-09-09

### Fixed

- Decorations rendered via the DOM overlay path no longer stay frozen at their original position when the reader scrolls, and every group is now correctly relaid out on resize, including ones that only use the CSS Highlight API, via updated `@readium/navigator-html-injectables`
- `Highlight` decorations with `layout: Bounds` no longer render as an opaque block hiding the underlying text on iPadOS Safari, via updated `@readium/navigator-html-injectables`

## [1.1.0] – 2026-09-08

### Added

- Decorations can now be positioned via a `Locator`'s `domRange` or a WICG text-fragment directive, in addition to `text.highlight`, via updated `@readium/navigator-html-injectables`/`@readium/shared` ([#249](https://github.com/readium/ts-toolkit/pull/249))

## [1.0.2] – 2026-07-29

### Fixed

- Republished against current `@readium/navigator-html-injectables`/`@readium/shared` versions; the previous release still pinned `2.6.1`/`2.3.0`, causing installs alongside `@readium/navigator` to resolve two copies of `@readium/shared` and break `instanceof` checks across them

## [1.0.1] – 2026-07-16

### Fixed

- Internal `@readium/*` dependencies were published with an unresolved `workspace:*` version, making the package uninstallable outside the monorepo; they now point to real published versions

## [1.0.0] – 2026-07-16

### Added

- Initial release: standalone decoration controller (`DecorationController`) and renderer (`Decorator`) for rendering visual annotations (highlights, underlines, strikethroughs, outlines, text color, masks, custom HTML templates) over text ranges in HTML content, extracted from `@readium/navigator-html-injectables` and `@readium/navigator` ([#228](https://github.com/readium/ts-toolkit/pull/228))
