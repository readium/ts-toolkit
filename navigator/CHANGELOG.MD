# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.3.0] - 2024-11-22

### Changed

- `findNearestPosition` in the (`EPUBNavigator`)[https://github.com/readium/ts-toolkit/blob/develop/navigator/src/epub/EpubNavigator.ts] has been replaced by `findLastPositionInProgressionRange` and `findNearestPositions` (#62).
- The Readium CSS dependency is now on the latest 1.x version, and added as a dependency using the `@readium/css` NPM package.