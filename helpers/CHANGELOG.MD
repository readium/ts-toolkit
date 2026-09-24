# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.1.0] – 2026-09-08

### Added

- `decodeTextFragmentDirective` parses WICG Text Fragment directive strings (`:~:text=...`), and a vendored `text-fragments-polyfill` is exposed for resolving them against a document (`processTextFragmentDirective`) or generating one from a `Range` (`generateFragmentFromRange`) ([#249](https://github.com/readium/ts-toolkit/pull/249))

## [1.0.0] – 2026-07-16

### Added

- Initial release: general-purpose browser helpers extracted from `@readium/shared` — color parsing/contrast utilities (`colorToRgba`, `checkContrast`, `isDarkColor`, `isLightColor`, `getContrastingTextColor`, `adjustColorForContrast`, `getLuminance`) and OS/browser detection (`sML`, `sMLWithRequest`) ([#228](https://github.com/readium/ts-toolkit/pull/228))
