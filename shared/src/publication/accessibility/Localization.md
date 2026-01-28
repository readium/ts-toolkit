# Accessibility Metadata Localization

This document explains how to use and customize the localization system for accessibility metadata in the `@readium/shared` package.

## Overview

The localization system allows consumers to provide their own translations for accessibility metadata strings while falling back to English if none is provided. The system uses a singleton pattern for easy access throughout the application and supports multiple registered locales.

## Default Behavior

By default, the system uses English (`en`) locale strings that are bundled with the package. These strings are included in the package and cover all accessibility metadata display needs. The system supports the following locales out of the box:

- `en` - English
- `fr` - French
- `ar` - Arabic
- `da` - Danish
- `it` - Italian
- `pt_PT` - Portuguese (Portugal)
- `sv` - Swedish

## Using the Localization System

### Registering Custom Locales

You can register new locales or override existing ones using the `registerLocale` method:

```typescript
// Register a new locale
Localization.registerLocale('es', {
  conformance: {
    aaa: {
      compact: "WCAG 2.1 Nivel AAA",
      descriptive: "Esta publicación cumple con WCAG 2.1 Nivel AAA."
    }
  }
});

// Or override an existing locale
Localization.registerLocale('en', {
  conformance: {
    aaa: {
      compact: "WCAG 2.1 Level AAA (Custom)",
      descriptive: "This publication conforms to WCAG 2.1 Level AAA (Custom)."
    }
  }
});
```

### Setting the Current Locale

```typescript
// Set the current locale by language code (returns a Promise<boolean>)
const success = await Localization.setLocale('es');

// Or using promises
Localization.setLocale('es')
  .then(success => {
    if (success) {
      console.log('Locale set successfully');
    } else {
      console.log('Locale not available');
    }
  });
```

> **Note:** `setLocale` is an async operation as it may need to load the locale data. Make sure to `await` the result or handle the Promise accordingly.

### Getting Localized Strings

```typescript
// Get a localized string
const text = Localization.getString('conformance.aaa');
// Returns: { compact: "WCAG 2.1 Nivel AAA", descriptive: "..." }
```

### Getting Available Locales

```typescript
// Get list of available locale codes
const availableLocales = Localization.getAvailableLocales();
// Returns: ['en', 'fr', 'es', ...]

// Get current locale code
const currentLocale = Localization.getCurrentLocale();
// Returns: 'es'
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
    aaa: "This publication conforms to WCAG 2.1 Level AAA",
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

When a string is not found in the current locale, the system will automatically fall back to the English (`en`) version if available. If the string is not found in either locale, an empty string will be returned and a warning will be logged to the console.

## Preloading Locales

For better performance, you can preload locales that will be needed later:

```typescript
// Preload a specific locale
await Localization.loadLocale('fr');

// Check if a locale is already loaded
if (Localization.getCurrentLocale() === 'fr') {
  // Locale is loaded and ready to use
}
```

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
3. **Handle missing translations gracefully** - the system will log warnings for missing keys.

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
    aaa: "This publication conforms to WCAG 2.1 Level AAA",
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
