# @readium/helpers

General-purpose browser helpers for Readium packages: color parsing/contrast utilities, OS/browser detection, and WICG Text Fragment parsing/resolution/generation.

## Installation

```ts
import { colorToRgba, checkContrast, isDarkColor, isLightColor, getContrastingTextColor, adjustColorForContrast, getLuminance, sML, sMLWithRequest, decodeTextFragmentDirective, processTextFragmentDirective, generateFragmentFromRange } from "@readium/helpers";
```

## Color utilities

```ts
// Parse any CSS color value (including custom properties resolved by the browser) to RGBA
colorToRgba("rebeccapurple"): { r: number; g: number; b: number; a: number }

// Relative luminance per WCAG 2.2
getLuminance({ r: 255, g: 255, b: 255 }): number

// WCAG 2.2 contrast ratio between two colors (string or RGBA)
checkContrast("#000", "#fff"): number

// Whether a color reads as dark/light against an optional background it's blended with
isDarkColor("#333", "#fff"): boolean
isLightColor("#333", "#fff"): boolean

// "black" or "white", whichever contrasts best against the given color
getContrastingTextColor("#333"): "black" | "white"

// Lightens/darkens baseColor against backgroundColor until targetContrast (default 3) is met
adjustColorForContrast("#888", "#fff", 3): string
```

`colorToRgba` uses an offscreen canvas to resolve any value the browser's CSS engine understands (named colors, `hsl()`, `oklch()`, etc.) and caches results. Unparseable or special values (`transparent`, `currentColor`, gradients, CSS variables) log a warning and fall back to opaque white.

## OS / browser detection

```ts
sML.OS   // { iOS, macOS, iPadOS, Windows, Android, ChromeOS, Linux, ... } — each a version array, e.g. [17, 4]
sML.UA   // { Chrome, Safari, Firefox, Edge, WebKit, Blink, ... } — each a version array
sML.Env  // string[] of all detected OS/UA flag names

sMLWithRequest.iOSRequest // "mobile" | "desktop" | undefined — iPadOS "Request Desktop Site" state
```

`sML` is a bundled subset of [sML.js](https://github.com/satorumurmur/sML) by Satoru Matsushima, MIT licensed. Falls back safely when `navigator` is unavailable (SSR).

## Text Fragments

```ts
// Parses a "text=[prefix-,]textStart[,textEnd][,-suffix]" directive out of a URL fragment/hash
decodeTextFragmentDirective("#some-id:~:text=hello,world"): TextFragmentDirective | undefined

// Resolves a TextFragmentDirective to zero or more Ranges in a document
processTextFragmentDirective(directive, document, root?): Range[]

// Generates a TextFragmentDirective that uniquely resolves back to the given Range
generateFragmentFromRange(range): { status: GenerateFragmentStatusValue; fragment?: TextFragment }
```

`processTextFragmentDirective` and `generateFragmentFromRange` come from a vendored [text-fragments-polyfill](https://github.com/GoogleChromeLabs/text-fragments-polyfill) — see [Third-party licenses](#third-party-licenses).

## Third-party licenses

This package is BSD-3-Clause, except for:

- `src/sML.ts`, which vendors code from [sML.js](https://github.com/satorumurmur/sML), Copyright (c) Satoru Matsushima, licensed under the MIT license (see the header of that file for the full notice)
- `src/vendor/text-fragments-polyfill/`, ported from [text-fragments-polyfill](https://github.com/GoogleChromeLabs/text-fragments-polyfill), licensed under the Apache License 2.0 (see that directory's `LICENSE` and `README.MD`)
