// Localization.ts
import enUS from 'thorium-locales/publication-metadata/en.json';

export interface L10nString {
  compact: string;
  descriptive: string;
}

export class Localization {
  private static instance: Localization;
  private locale: Record<string, any> = enUS.publication.metadata;

  private constructor() {}

  public static getInstance(): Localization {
    if (!Localization.instance) {
      Localization.instance = new Localization();
    }
    return Localization.instance;
  }

  public setLocale(customLocale: Record<string, any>): void {
    this.locale = customLocale;
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

  public getString(key: string): L10nString {
    const value = this.getNestedValue(this.locale, key);
    
    if (value === undefined) {
      console.warn(`Missing localization for key: ${key}`);
      return { compact: '', descriptive: '' };
    }

    if (typeof value === 'string') {
      return { compact: value, descriptive: value };
    }

    return value;
  }
}

export const localization = Localization.getInstance();
