# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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