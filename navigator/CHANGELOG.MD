# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.2.9] – 2026-02-03

### Fixed

- Fixed code from `Shared` being duplicated in the build output ([#192](https://github.com/readium/ts-toolkit/issues/192))
- Fixed type generation issues by ensuring clean rebuild of declaration files

### Changed

- Migrated internal resources i.e. blobified stylesheets and scripts from `BlobBuilders` to new Injection API

## [2.2.8] – 2026-02-02

### Added

- Experimental Injection API (Injectable types + `Injector` class) for injecting static resources into content documents

### Changed

- Migrated internal resources i.e. blobified stylesheets and scripts from `BlobBuilders` to new Injection API

## [2.2.7] – 2026-01-22

### Changed

- Updated dependencies and created a script to handle `css-selector-generator` and resolve a bug with namespaced attributes ([#117](https://github.com/readium/ts-toolkit/issues/117)).

## [2.2.6] – 2026-01-19

### Added

- Added `highlight-id` data attribute to non-experimental decoration items, containing the ID of the Decorator ([#184](https://github.com/readium/ts-toolkit/pull/184))

## [2.2.5] - 2025-11-28

### Added

- More defenses to iframes in EpubNavigator
- Support for ReadiumCSS experimental flags in Preferences API ([#176](https://github.com/readium/ts-toolkit/pull/176))

### Changed

- Updated ReadiumCSS to `v2.0.0-beta.24`

## [2.2.4] - 2025-11-06

### Added

- Added the handling of iOS and iPadOS patches to the WebPub Preferences API

### Changed

- Updated ReadiumCSS to `v2.0.0-beta.22`
- Switched experimental WebPublication Navigator Preferences to ReadiumCSS
- Updated ligatures handling in EpubPreferencesEditor to match ReadiumCSS

## [2.2.3] - 2025-11-01

### Fixed

- Implements fix from ReadiumCSS where text normalization would override the font weight set through the Preferences API

### Changed

- Updates ReadiumCSS with some slight improvement for text alignment

## [2.2.2] - 2025-10-30

### Added

- Guard `WebPubSettings` assignment on `displayTransformability`

### Fixed

- Corrects `isEffective` check in `WebPubPreferencesEditor`

## [2.2.1] - 2025-10-28

### Added

- Implemented Preferences API for WebPublication Navigator

## [2.2.0] - 2025-10-17

### Added

- Experimental WebPublication Navigator

## [2.1.1] - 2025-09-10

### Changed

- Updated shared models ([#159](https://github.com/readium/ts-toolkit/issues/159)) as some checks were not working properly in the `iframe` context.

### Removed

- Removed `appearance` property from `UserProperties` and `ReadiumCSS`, `Theme` enum and `theme` property from the Preferences API, since ReadiumCSS is no longer providing reading modes (night, sepia) as of `v2.0.0-beta.19`.

## [2.1.0] - 2025-08-29

### Added

- `Publication.metadata` now has an `accessibility` property.

### Changed

- Updated shared models.

### Fixed

- Fix `n > 1` discrepancy in ReadiumCSS `paginate` method when falling back to 1 column.

## [2.0.0] - 2025-08-01

### Added

- Implemented the Preferences API for the reflowable EpubNavigator and its `PreferencesEditor`. ([#82](https://github.com/readium/ts-toolkit/issues/82))
- Added a `viewport` property to the `EpubNavigator` class, which returns the `href`, `progressions` and `positions` visible in the current viewport.
- Added helpers methods to the `EpubNavigator` class to get the start/end of resources and publication. They can be used in replacement of the scroll anchors that were previously injected. ([#96](https://github.com/readium/ts-toolkit/issues/96), [#65](https://github.com/readium/ts-toolkit/issues/65))
- Added `scroll` event to the `EpubNavigatorListeners` interface. ([#151](https://github.com/readium/ts-toolkit/issues/151))

### Changed

- The Readium CSS dependency is now on the latest 2.x beta version.
- `layout` uses the updated `Layout` enum from `@readium/shared`. The value can now be `scrolled` in addition to `reflowable` and `fixed`. `EpubNavigator` will return `scrolled` for a reflowable publication if `scroll` is set to `true` in the `settings` (through `submitPreferences`).

### Removed

- `currentNumbers` property has been removed from the `EpubNavigator` class. Use `viewport.positions` instead.
- `setReadingProgression()` method has been removed from the `EpubNavigator` class.

### Fixed

- FramePoolManager and FrameManager now accept a `progression` of `0` when showing iframes already in the pool. Previously, a frame in the pool would be shown with its in-memory progression. ([#132](https://github.com/readium/ts-toolkit/issues/132))

## [1.3.4] - 2025-01-16

### Fixed

- Fix bug preventing iFrame from being properly hidden, add more safeguards to iFrame management

## [1.3.3] - 2024-11-22

### Added

- Fix export of `sML` utility to be named
- Add export of `FrameBlobBuilder` utility

## [1.3.2] - 2024-11-22

### Added

- Export of `sML` utility is now exposed for User Agent sniffing

## [1.3.1] - 2024-11-22

### Fixed

- Incorrect NPM publishing, requires new version

## [1.3.0] - 2024-11-22

### Changed

- `findNearestPosition` in the (`EPUBNavigator`)[https://github.com/readium/ts-toolkit/blob/develop/navigator/src/epub/EpubNavigator.ts] has been replaced by `findLastPositionInProgressionRange` and `findNearestPositions` (#62).
- The Readium CSS dependency is now on the latest 1.x version, and added as a dependency using the `@readium/css` NPM package.