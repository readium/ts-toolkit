import { Localization } from '../../src/publication/accessibility/Localization';

describe('Localization', () => {
  // Reset the singleton instance before each test
  beforeEach(() => {
    // @ts-ignore - Accessing private member for testing
    Localization.instance = undefined;
  });

  it('should be a singleton', () => {
    const instance1 = Localization;
    const instance2 = Localization;
    expect(instance1).toBe(instance2);
  });

  it('should have English as default locale', () => {
    const l10n = Localization;
    expect(l10n.getCurrentLocale()).toBe('en');
  });

  it('should register a new locale', () => {
    const l10n = Localization;
    const testLocale = {
      test: {
        key: {
          compact: 'Test',
          descriptive: 'Test Description'
        }
      }
    };

    l10n.registerLocale('test', testLocale);
    expect(l10n.setLocale('test')).toBe(true);
    expect(l10n.getCurrentLocale()).toBe('test');
    expect(l10n.getString('test.key').compact).toBe('Test');
    expect(l10n.getString('test.key').descriptive).toBe('Test Description');
  });

  it('should fall back to English when key is missing', () => {
    const l10n = Localization;
    
    // First get the English value for our test key
    const testKey = 'publication.metadata.accessibility.hazards.none';
    const englishValue = l10n.getString(testKey);
    
    // Register a test locale that doesn't have our test key
    const testLocale = {
      test: {
        someKey: {
          compact: 'Test',
          descriptive: 'Test Description'
        }
      }
    };
    
    // Register the test locale and switch to it
    l10n.registerLocale('test', testLocale);
    l10n.setLocale('test');
    
    // Should return the test value for a key that exists in the test locale
    const testResult = l10n.getString('test.someKey');
    expect(testResult).toEqual({
      compact: 'Test',
      descriptive: 'Test Description'
    });
    
    // Should fall back to English for a key that doesn't exist in the test locale
    const result = l10n.getString(testKey);
    expect(result).toEqual(englishValue);
  });

  it('should handle nested keys', () => {
    const l10n = Localization;
    const key = 'publication.metadata.accessibility.hazards.none';
    const result = l10n.getString(key);
    
    expect(result).toHaveProperty('compact');
    expect(result).toHaveProperty('descriptive');
    expect(typeof result.compact).toBe('string');
    expect(typeof result.descriptive).toBe('string');
  });

  it('should return empty strings for invalid keys', () => {
    const l10n = Localization;
    const result = l10n.getString('invalid.key.that.does.not.exist');
    
    expect(result).toEqual({
      compact: '',
      descriptive: ''
    });
  });

  it('should list available locales', () => {
    const l10n = Localization;
    const locales = l10n.getAvailableLocales();
    
    expect(locales).toContain('en');
    expect(locales).toContain('fr');
    expect(locales.length).toBeGreaterThanOrEqual(2);
  });
});
