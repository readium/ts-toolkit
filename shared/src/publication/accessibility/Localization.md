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
  "accessibility.display-guide.conformance.aaa": {
    "compact": "WCAG 2.1 Level AAA",
    "descriptive": "This publication conforms to WCAG 2.1 Level AAA."
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
  accessibility: {
    "display-guide": {
      conformance: {
        aaa: "WCAG 2.1 Level AAA"
      },
      hazards: {
        none: {
          compact: "No hazards",
          descriptive: "This content is known to be free of hazards."
        }
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
- `accessibility.display-guide.conformance.no`
- `accessibility.display-guide.conformance.a`
- `accessibility.display-guide.conformance.aa`
- `accessibility.display-guide.conformance.aaa`
- `accessibility.display-guide.conformance.unknown-standard`

### Hazards
- `accessibility.display-guide.hazards.none`
- `accessibility.display-guide.hazards.unknown`
- `accessibility.display-guide.hazards.no-metadata`
- `accessibility.display-guide.hazards.flashing`
- `accessibility.display-guide.hazards.flashing-unknown`
- `accessibility.display-guide.hazards.flashing-none`
- `accessibility.display-guide.hazards.motion`
- `accessibility.display-guide.hazards.motion-unknown`
- `accessibility.display-guide.hazards.motion-none`
- `accessibility.display-guide.hazards.sound`
- `accessibility.display-guide.hazards.sound-unknown`
- `accessibility.display-guide.hazards.sound-none`

### Navigation
- `accessibility.display-guide.navigation.toc`
- `accessibility.display-guide.navigation.index`
- `accessibility.display-guide.navigation.structural`
- `accessibility.display-guide.navigation.page-navigation`
- `accessibility.display-guide.navigation.no-metadata`

### Rich Content
- `accessibility.display-guide.rich-content.extended-descriptions`
- `accessibility.display-guide.rich-content.accessible-math-described`
- `accessibility.display-guide.rich-content.accessible-math-as-mathml`
- `accessibility.display-guide.rich-content.accessible-math-as-latex`
- `accessibility.display-guide.rich-content.accessible-chemistry-as-mathml`
- `accessibility.display-guide.rich-content.accessible-chemistry-as-latex`
- `accessibility.display-guide.rich-content.closed-captions`
- `accessibility.display-guide.rich-content.open-captions`
- `accessibility.display-guide.rich-content.transcript`
- `accessibility.display-guide.rich-content.unknown`

### Additional Accessibility Information
- `accessibility.display-guide.additional-accessibility-information.page-breaks`
- `accessibility.display-guide.additional-accessibility-information.aria`
- `accessibility.display-guide.additional-accessibility-information.audio-descriptions`
- `accessibility.display-guide.additional-accessibility-information.braille`
- `accessibility.display-guide.additional-accessibility-information.ruby-annotations`
- `accessibility.display-guide.additional-accessibility-information.full-ruby-annotations`
- `accessibility.display-guide.additional-accessibility-information.high-contrast-between-foreground-and-background-audio`
- `accessibility.display-guide.additional-accessibility-information.high-contrast-between-text-and-background`
- `accessibility.display-guide.additional-accessibility-information.large-print`
- `accessibility.display-guide.additional-accessibility-information.sign-language`
- `accessibility.display-guide.additional-accessibility-information.tactile-graphics`
- `accessibility.display-guide.additional-accessibility-information.tactile-objects`
- `accessibility.display-guide.additional-accessibility-information.text-to-speech-hinting`

### Legal Considerations
- `accessibility.display-guide.legal-considerations.exempt`
- `accessibility.display-guide.legal-considerations.no-metadata`

### Accessibility Summary
- `accessibility.display-guide.accessibility-summary.no-metadata`

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
  accessibility: {
    "display-guide": {
      ...,
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
    }
  }
};
```
