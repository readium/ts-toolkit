// Localization.ts

import { SUPPORTED_LANGUAGES } from './SupportedLanguages.ts';
// Static import for English (default locale)
import enLocale from '@edrlab/thorium-locales/publication-metadata/en.json';

export interface L10nString {
  compact: string;
  descriptive: string;
}

type LocaleValue = string | L10nString | LocaleData;
interface LocaleData {
  [key: string]: LocaleValue | LocaleValue[];
}

// Dynamic imports for non-English locales
const jsonLoaders: Record<string, () => Promise<{ default: any }>> = {
  'fr': () => import('@edrlab/thorium-locales/publication-metadata/fr.json'),
  'ar': () => import('@edrlab/thorium-locales/publication-metadata/ar.json'),
  'da': () => import('@edrlab/thorium-locales/publication-metadata/da.json'),
//  'el': () => import('@edrlab/thorium-locales/publication-metadata/el.json'),
//  'et': () => import('@edrlab/thorium-locales/publication-metadata/et.json'),
  'it': () => import('@edrlab/thorium-locales/publication-metadata/it.json'),
  'pt_PT': () => import('@edrlab/thorium-locales/publication-metadata/pt_PT.json'),
  'sv': () => import('@edrlab/thorium-locales/publication-metadata/sv.json'),
//  'tr': () => import('@edrlab/thorium-locales/publication-metadata/tr.json'),
//  'uk': () => import('@edrlab/thorium-locales/publication-metadata/uk.json')
};

// Extract English accessibility data
const englishAccessibilityData = enLocale?.publication?.metadata?.accessibility?.['display-guide'] || {};

class LocalizationImpl {
  private static instance: LocalizationImpl;
  private currentLocaleCode: string = 'en';
  private locale: LocaleData = englishAccessibilityData;
  private loadedLocales: Record<string, LocaleData> = {};

  private constructor() {
    // Load English into loaded locales since it's our default
    this.loadedLocales['en'] = englishAccessibilityData;
  }

  public static getInstance(): LocalizationImpl {
    if (!LocalizationImpl.instance) {
      LocalizationImpl.instance = new LocalizationImpl();
    }
    return LocalizationImpl.instance;
  }

  /**
   * Loads a locale dynamically
   * @param localeCode BCP 47 language code (e.g., 'en', 'fr')
   * @returns Promise indicating if the locale was loaded successfully
   */
  public async loadLocale(localeCode: string): Promise<boolean> {
    // Check if locale is enabled
    if (!SUPPORTED_LANGUAGES.includes(localeCode)) {
      console.warn(`Locale '${localeCode}' is not enabled`);
      return false;
    }

    // Skip if already loaded
    if (localeCode in this.loadedLocales) {
      return true;
    }

    try {
      // Check if we have a loader for this locale
      if (!(localeCode in jsonLoaders)) {
        console.warn(`Locale file not found for: ${localeCode}`);
        return false;
      }

      const localeModule = await jsonLoaders[localeCode]();
      const data = localeModule.default;

      // Extract the accessibility.display-guide part
      const accessibilityData = data?.publication?.metadata?.accessibility?.['display-guide'];

      if (accessibilityData) {
        this.loadedLocales[localeCode] = accessibilityData;
        return true;
      } else {
        console.warn(`No accessibility strings found in locale ${localeCode}`);
        return false;
      }
    } catch (error) {
      console.warn(`Failed to load locale ${localeCode}:`, error);
      return false;
    }
  }

  /**
   * Registers a new locale or updates an existing one
   * @param localeCode BCP 47 language code (e.g., 'en', 'fr-FR')
   * @param localeData The locale data to register
   */
  public registerLocale(localeCode: string, localeData: LocaleData): void {
    if (!localeCode || typeof localeCode !== 'string') {
      throw new Error('Locale code must be a non-empty string');
    }
    this.loadedLocales[localeCode] = localeData;
  }

  /**
   * Sets the current locale by language code, loading it dynamically if needed
   * @param localeCode BCP 47 language code (e.g., 'en', 'fr')
   * @returns Promise indicating if the locale was set successfully
   */
  public async setLocale(localeCode: string): Promise<boolean> {
    if (!(localeCode in this.loadedLocales)) {
      await this.loadLocale(localeCode);
    }

    if (!(localeCode in this.loadedLocales)) {
      console.warn(`Locale '${localeCode}' is not available`);
      return false;
    }

    this.locale = this.loadedLocales[localeCode];
    this.currentLocaleCode = localeCode;
    return true;
  }

  /**
   * Gets the current locale code (BCP 47)
   */
  public getCurrentLocale(): string {
    return this.currentLocaleCode;
  }

  /**
   * Gets a list of available locale codes
   */
  public getAvailableLocales(): string[] {
    return SUPPORTED_LANGUAGES;
  }

  private getNestedValue(obj: any, path: string): string | L10nString | undefined {
    const parts = path.split('.');
    let current = obj;

    for (const part of parts) {
      if (current === null || current === undefined) {
        return undefined;
      }
      current = current[part];
    }

    return current;
  }

  /**
   * Gets a localized string by key
   * @param key The key for the string to retrieve
   * @returns The localized string as a [L10nString], or an empty string if not found
   */
  public getString(key: string): L10nString {
    // First try the current locale
    let value = this.getNestedValue(this.locale, key);

    // If not found and current locale is not English, try falling back to English
    if (value === undefined && this.currentLocaleCode !== 'en') {
      value = this.getNestedValue(this.loadedLocales['en'], key);
    }

    // If we have a value, return it with proper formatting
    if (value !== undefined) {
      return typeof value === 'string'
        ? { compact: value, descriptive: value }
        : value;
    }

    // If we get here, the key wasn't found in either locale
    console.warn(`Missing localization for key: ${key}`);
    return { compact: '', descriptive: '' };
  }
}

/**
 * The singleton instance of the [Localization] class.
 */
export const Localization = LocalizationImpl.getInstance();
