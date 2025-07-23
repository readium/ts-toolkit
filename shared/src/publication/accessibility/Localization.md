# Accessibility Metadata Localization

This document explains how to use and customize the localization system for accessibility metadata in the `@readium/shared` package.

## Overview

The localization system allows consumers to provide their own translations for accessibility metadata strings while falling back to English if a translation is not available. The system is designed to be simple and flexible, using a singleton pattern for easy access throughout the application.

## Default Behavior

By default, the system uses English (`en`) locale strings that are bundled with the package. These strings are imported from `thorium-locales` and cover all accessibility metadata display needs.

## Customizing Locales

To provide your own translations, you can set a custom locale object using the `setLocale` method:

```typescript
import { localization } from '@readium/shared';

// Define your custom locale object
const customLocale = {
  conformance: {
    aaa: {
      compact: "WCAG 2.1 Level AAA",
      descriptive: "This publication conforms to WCAG 2.1 Level AAA."
    }
  },
  // Add more translations as needed
};

// Set the custom locale
localization.setLocale(customLocale);
```

## Locale Object Structure

The locale object is a nested structure where:
- Keys are nested objects representing the path to the value
- Values can be either:
  - A string, which will be used for both `compact` and `descriptive` values
  - An object with `compact` and `descriptive` string properties

Example of valid locale values:

```typescript
const locale = {
  conformance: {
    aaa: {
      compact: "WCAG 2.1 Level AAA",
      descriptive: "This publication conforms to WCAG 2.1 Level AAA."
    },
    hazards: {
      none: {
        compact: "No hazards",
        descriptive: "This content is known to be free of hazards."
      }
    }
  }
};
```

## Fallback Behavior

If a key is not found in the custom locale, the system will fall back to the English locale. If the key is not found in either locale, a warning will be logged to the console and an empty string will be returned.

## Available Locale Keys

The following keys are used throughout the accessibility metadata system:

### Conformance
- `conformance.no`
- `conformance.a`
- `conformance.aa`
- `conformance.aaa`
- `conformance.unknown-standard`

### Hazards
- `hazards.none`
- `hazards.unknown`
- `hazards.no-metadata`
- `hazards.flashing`
- `hazards.flashing-unknown`
- `hazards.flashing-none`
- `hazards.motion`
- `hazards.motion-unknown`
- `hazards.motion-none`
- `hazards.sound`
- `hazards.sound-unknown`
- `hazards.sound-none`

### Navigation
- `navigation.toc`
- `navigation.index`
- `navigation.structural`
- `navigation.page-navigation`
- `navigation.no-metadata`

### Rich Content
- `rich-content.extended-descriptions`
- `rich-content.accessible-math-described`
- `rich-content.accessible-math-as-mathml`
- `rich-content.accessible-math-as-latex`
- `rich-content.accessible-chemistry-as-mathml`
- `rich-content.accessible-chemistry-as-latex`
- `rich-content.closed-captions`
- `rich-content.open-captions`
- `rich-content.transcript`
- `rich-content.unknown`

### Additional Accessibility Information
- `additional-accessibility-information.page-breaks`
- `additional-accessibility-information.aria`
- `additional-accessibility-information.audio-descriptions`
- `additional-accessibility-information.braille`
- `additional-accessibility-information.ruby-annotations`
- `additional-accessibility-information.full-ruby-annotations`
- `additional-accessibility-information.high-contrast-between-foreground-and-background-audio`
- `additional-accessibility-information.high-contrast-between-text-and-background`
- `additional-accessibility-information.large-print`
- `additional-accessibility-information.sign-language`
- `additional-accessibility-information.tactile-graphics`
- `additional-accessibility-information.tactile-objects`
- `additional-accessibility-information.text-to-speech-hinting`

### Legal Considerations
- `legal-considerations.exempt`
- `legal-considerations.no-metadata`

### Accessibility Summary
- `accessibility-summary.no-metadata`

## Best Practices

1. **Provide both compact and descriptive versions** when possible by using an object with both properties. This allows for more precise control over the display text.
2. **Test your custom locales** to ensure all necessary keys are provided.
3. **Extend the default English locale** rather than replacing it entirely to ensure coverage of all possible keys.
4. **Handle missing translations gracefully** - the system will log warnings for missing keys.

## TypeScript Support

When using TypeScript, the locale object should match the following structure:

```typescript
type LocalizedValue = string | {
  compact: string;
  descriptive: string;
};

type LocaleObject = {
  [key: string]: LocalizedValue;
};

// Example usage:
const customLocale = {
  conformance: {
    aaa: "WCAG 2.1 Level AAA",
    ...
  },
  hazards: {
    none: {
      compact: "No hazards",
      descriptive: "This content is known to be free of hazards."
    },
    ...
  }
};
```
