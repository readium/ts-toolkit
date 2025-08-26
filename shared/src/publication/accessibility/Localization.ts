// Localization.ts
import enUS from './locales/en.json';
import frFR from './locales/fr.json';

export interface L10nString {
  compact: string;
  descriptive: string;
}

type LocaleData = Record<string, any>;

class LocalizationImpl {
  private static instance: LocalizationImpl;
  private currentLocaleCode: string = 'en';
  private locale: LocaleData = enUS;
  private availableLocales: Record<string, LocaleData> = {
    'en': enUS,
    'fr': frFR
  };

  private constructor() {}

  public static getInstance(): LocalizationImpl {
    if (!LocalizationImpl.instance) {
      LocalizationImpl.instance = new LocalizationImpl();
    }
    return LocalizationImpl.instance;
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
    this.availableLocales[localeCode] = localeData;
  }

  /**
   * Sets the current locale by language code
   * @param localeCode BCP 47 language code (e.g., 'en', 'fr-FR')
   * @returns boolean indicating if the locale was set successfully
   */
  public setLocale(localeCode: string): boolean {
    if (!(localeCode in this.availableLocales)) {
      console.warn(`Locale '${localeCode}' is not available`);
      return false;
    }
    this.locale = this.availableLocales[localeCode];
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
    return Object.keys(this.availableLocales);
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
      value = this.getNestedValue(this.availableLocales['en'], key);
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