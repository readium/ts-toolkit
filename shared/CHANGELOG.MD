# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.4.0] – 2026-07-23

### Changed

- **Breaking:** `Timeline.adjacentTo()` has been renamed to `navigableFrom()` to better express its purpose ([#244](https://github.com/readium/ts-toolkit/pull/244))

## [2.3.2] – 2026-07-22

### Fixed

- `Timeline` no longer matches hrefless toc entries (e.g. `<span>` grouping headings, which carry no `href`) against every resource; they are now correctly excluded as candidates ([#243](https://github.com/readium/ts-toolkit/pull/243))

## [2.3.1] – 2026-07-16

### Fixed

- `Timeline.tocEntryFor()` now falls back to the nearest preceding resource's toc entry when a resource has no toc entry of its own — the case where one toc entry spans several consecutive reading-order resources ([#242](https://github.com/readium/ts-toolkit/pull/242))

## [2.3.0] – 2026-07-16

### Added

- `Timeline` can now be built for HTML-based publications, not just audiobooks, via the new `buildTimeline`/`buildHtmlTimeline` helpers ([#234](https://github.com/readium/ts-toolkit/pull/234))
- Added `formatNptTime()` utility, formatting a duration in seconds as `H:MM:SS`/`M:SS` ([#234](https://github.com/readium/ts-toolkit/pull/234))
- Added `./html`, `./epub`, `./opds`, and `./encryption` subpath exports, so consumers can import only the format-specific extensions they need ([#228](https://github.com/readium/ts-toolkit/pull/228))
- Spanish (`es`), Estonian (`et`), Finnish (`fi`), Polish (`pl`), and Greek (`el`) are now supported accessibility metadata display-guide languages, registered in `SUPPORTED_LANGUAGES` and `Localization` ([#228](https://github.com/readium/ts-toolkit/pull/228))

### Changed

- **Breaking:** All format-specific prototype augmentations (on `LocatorLocations`, EPUB/OPDS `Properties`, `Publication`, `Metadata`, etc.) have been replaced with standalone exported functions, e.g. `loc.time()` → `getTime(loc)`. Augmentation modules were side-effect-only and incompatible with the package's new `sideEffects: false`/tree-shakeable build. See [`docs/migration-standalone-extensions.md`](docs/migration-standalone-extensions.md) for the full before/after mapping ([#228](https://github.com/readium/ts-toolkit/pull/228))
- **Breaking:** As part of the above, `getSpace(loc)` (formerly `loc.space()`) now returns `{ unit: "pixel" | "percent", x, y, width, height }` instead of a `[number, number, number, number]` tuple, to support percentage-based spatial media fragments ([#235](https://github.com/readium/ts-toolkit/pull/235))
- **Breaking:** Dropped the CommonJS/UMD build; the package is now ESM-only ([#228](https://github.com/readium/ts-toolkit/pull/228))
- Vendored `@edrlab/thorium-locales` locale files directly under `src/locales/` instead of depending on the package at install time; added an `update-locales` script to refresh them ([#228](https://github.com/readium/ts-toolkit/pull/228))

## [2.2.3] – 2026-06-23

### Changed

- References to OPDS specs have been updated to `specs.opds.io` ([#230](https://github.com/readium/ts-toolkit/pull/230))

### Fixed

- `LocatorLocations.time()` now handles decimals properly, which fixes the retrieval of timeline items ([#232](https://github.com/readium/ts-toolkit/pull/232))

## [2.2.2] – 2026–06–04

### Removed

- Removed unused type in `Publication`

## [2.2.1] – 2026–04–27

### Fixed

- Fixed `PublicationContentIterator` always returning `null` ([#220](https://github.com/readium/ts-toolkit/pull/220))
- Fixed deserialization of subcollections ([#225](https://github.com/readium/ts-toolkit/pull/225))

## [2.2.0] – 2026-04-14

### Added

- Support for AVIF in `MediaType` and `isBitmap()` helper
- Helper to `getCover()` of the publication
- Initialized Timeline on `Publication`

### Fixed

- Imports and exports now include file extension ([#205](https://github.com/readium/ts-toolkit/pull/205))

## [2.1.5] – 2026-02-03

### Fixed

- Fixed type generation issues by ensuring clean rebuild of declaration files

## [2.1.4] – 2026-02-02

### Changed

- Migrated accessibility metadata display-guide to use `@edrlab/thorium-locales` package.
- Updated `Localization` to use dynamic imports for locale files.

## [2.1.3] – 2026-01-22

### Changed

- `LocalizedString` now uses `und` instead of `undefined` as the unknown language.
- Updated dependencies

## [2.1.2] – 2025–12–18

### Fixed

- Corrected `sortAs` property in `Contributor` and `Subject` to be a `LocalizedString` instead of a plain `string`. ([#182](https://github.com/readium/ts-toolkit/issues/182))

## [2.1.1] – 2025–09–10

### Fixed

- Replaced `instanceof` checks with `Array.isArray` and `typeof === 'object'` to ensure compatibility with the `iframe` context. ([#159](https://github.com/readium/ts-toolkit/issues/159))
- Removed `postinstall` script generating locale files as it was failing when installed as a dependency ([#160](https://github.com/readium/ts-toolkit/issues/160)).

## [2.1.0] - 2025-08-29

### Added

- `Accessibility` class has been added to the default profile.
- `Accessibility` property has been added to `Metadata`.
- `AccessibilityMetadataDisplayGuide` class has been added as a helper to handle display of accessibility metadata for user-facing features.

## [2.0.0] - 2025-08-01

### Added

- `AltIdentifier` class has been added to the default profile.
- `GuidedNavigationText` class has been added to the default Profile.
- `TDM` class has been added to the default Profile.
- `MediaOverlay` class has been added to the EPUB extension (`Metadata`).
- `altIdentifiers` property has been added to `Contributor`.
- `altIdentifier` property has been added to `Metadata`.
- `size` property has been added to `Link`.
- `tdm` and `conformsTo` properties have been added to `Metadata`.
- `level` and `description` properties have been added to `GuidedNavigation`.
- `Profile` enum is available to check the profile of a publication through `Metadata.conformsTo`. It contains values `EPUB`, `AUDIOBOOK`, `PDF`, and `DIVINA`.

### Changed

- `GuidedNavigation` has been updated to the latest schema. Property `text` is now using `GuidedNavigationText` instead of `string`.
- `Presentation.layout` has been superseded by `Metadata.layout`. You can now use `Metadata.effectiveLayout` to get the layout of the publication based on the `Profile` found in `conformsTo`. ([#143](https://github.com/readium/ts-toolkit/issues/143))
- `getPage()` method has been replaced with `page` property in `Properties`.
- `EPUBLayout` enum has been replaced with `Layout`, which contains an additional `scrolled` value. ([#143](https://github.com/readium/ts-toolkit/issues/143))
- `ReadingProgression` enum has been updated to only contain `ltr` and `rtl` values. Values `auto`, `ttb`, and `btt` have been removed.

### Removed

- `getPresentation()` method has been removed from `Metadata`. Use `effectiveLayout` instead. ([#143](https://github.com/readium/ts-toolkit/issues/143))
- `getLayout()` method has been removed from `Properties` in the EPUB extension. ([#143](https://github.com/readium/ts-toolkit/issues/143))
- `layoutOf()` method has been removed from `Presentation` in the EPUB extension. ([#143](https://github.com/readium/ts-toolkit/issues/143))
- `getClipped()`, `getFit()`, `getOrientation()`, `getOverflow`, `getPage()`, and `getSpread()` methods, and their enums, have been removed with the `Presentation` class. ([#143](https://github.com/readium/ts-toolkit/issues/143))

## [1.3.0] - 2025-07-04

### Fixed

- Parsing of `toc` was not working correctly if a `Link` had an empty `href` attribute. Its `children` would not be parsed, resulting in an incomplete table of contents. ([#131](https://github.com/readium/ts-toolkit/issues/131))

## [1.2.1] - 2024-11-22

### Fixed

- Export of `Resource` and `services` folder was missing in build, preventing usage of `Resource`, `ContentTokenizer`, `Tokenizer`, `Iterator`, etc.