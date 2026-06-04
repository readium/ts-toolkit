# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.6.0] – 2026–06–04

### Added

- Implemented Decorator API ([#209](https://github.com/readium/ts-toolkit/pull/209))

## [2.5.8] – 2026–06–04

### Added

- Added a check for trusted events in Keyboard Peripherals to ignore synthetic key events ([#227](https://github.com/readium/ts-toolkit/pull/227))

## [2.5.7] – 2026–04–27

### Fixed

- Safari-specific follow-up for keyboard peripheral input being hijacked by a previously focused `iframe` after navigation ([#221](https://github.com/readium/ts-toolkit/issues/221))

## [2.5.6] – 2026–04–27

### Fixed

- Fixed an issue where keyboard peripheral input would be hijacked by a previously focused `iframe` after navigation ([#221](https://github.com/readium/ts-toolkit/issues/221))
- Added a navigation lock so that FramePool Managers do not become overwhelmed with quick-fire navigation ([#190](https://github.com/readium/ts-toolkit/issues/190))

## [2.5.5] – 2026–05–21

### Fixed

- `positionChanged` event now fires reliably for FXL in EPUBNavigator (([#218](https://github.com/readium/ts-toolkit/pull/218)))

## [2.5.4] – 2026–05–13

### Changed

- Readium CSS update – it no longer uses `default` as JSON property

## [2.5.3] – 2026-05-11

### Fixed

- Fixed data type for `listeners.peripheral` event in Audio Navigator

## [2.5.2] – 2026-05-07

### Added

- `KeyCombo` objects have two new properties, to suppress handling on interactive elements, and on an observable condition
- `Peripheral` event data now returns the interactive element currently focused
- Package provides types for the new JSON of Readium CSS (settings and i18n)

### Changed

- Readium CSS has been updated
- in Preferences API line-height range has been updated with a larger `max` value to accommodate non-latin scripts

### Fixed

- Keyboard combinations are now properly matched when combinators are `undefined`
- `Peripheral` event now returns the correct type of `data`

## [2.5.1] – 2026-04-27

### Fixed

- Added missing keyboard combinations for dev tools in Content Protection API

## [2.5.0] – 2026–04–23

### Added

- Support for Right-to-left Scripts and vertical writing 

### Fixed

- `canGoBackward` and `canGoForward` helpers now return correctly for Fixed-Layout when displayed in single page ([#203](https://github.com/readium/css/issues/203))

## [2.4.0] – 2026-04-14

### Added

- Audio Navigator and a `Media Navigator` abstract for media playback navigators
- Expose `Timeline` in Audio Navigator

### Fixed

- Corrects `printProtection` in all Navigators

## [2.3.1] – 2026–03–19

### Fixed

- Fixed context menu event propagation in WebPub Navigator ([#201](https://github.com/readium/ts-toolkit/pull/201))

## [2.3.0] – 2026-02-24

### Added

- Implemented content protection ([#194](https://github.com/readium/ts-toolkit/pull/194))
- Implemented keyboard peripherals ([#194](https://github.com/readium/ts-toolkit/pull/194))

### Changed

- Updated Readium CSS to stable `v2.0.0` and resolved `pageGutter` and `scrollPadding` conflict in Preference API ([#195](https://github.com/readium/ts-toolkit/pull/195))

### Removed

- Readium CSS fonts are no longer bundled with the package as they were removed from Readium CSS itself. See [readium/css#209](https://github.com/readium/css/issues/209)

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