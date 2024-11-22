# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.3.2] - 2024-11-22

### Fixed

- Export of `Decorator` was missing in build, preventing its usage

## [1.3.1] - 2024-11-22

### Fixed

- Incorrect NPM publishing, requires new version

## [1.3.0] - 2024-11-22

### Added

- (`epubReadingSystem`)[https://www.w3.org/TR/epub-rs-33/#app-epubReadingSystem] is available to publications.

### Fixed

- Ensure CSS-only locator ranges are correct, especially relevant when using the `go_text` command (#77).

### Changed

- The `ColumnSnapper` and `ScrollSnapper` report progress that now includes a reference progression – a.k.a. progression by a ReadiumWindow viewport – in addition to the current one (#62).