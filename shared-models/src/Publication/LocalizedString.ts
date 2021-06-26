/* Copyright 2020 Readium Foundation. All rights reserved.
 * Use of this source code is governed by a BSD-style license,
 * available in the LICENSE file present in the Github repository of the project.
 */

import { typeIs } from '../util/TypeCheckers';

/**
 * Represents a string with multiple translations indexed by a BCP 47 language tag.
 */
export class LocalizedString {
  public translations: { [key: string]: string };

  public static readonly UNDEFINED_LANGUAGE = 'undefined';
  public static readonly LANGUAGE_EN = 'en';

  /**
   * translations can be a string or a collection of language/translation pairs,
   * for a single string the language is assumed to be undefined
   */
  constructor(translations: string | { [key: string]: string }) {
    this.translations =
      typeof translations === 'string'
        ? { [LocalizedString.UNDEFINED_LANGUAGE]: translations }
        : translations;
  }

  public static fromJSON(json: any): undefined | LocalizedString {
    return typeIs(json, [String, Object])
      ? new LocalizedString(json)
      : undefined;
  }

  public toJSON(): any {
    let keys = Object.keys(this.translations);
    return keys.length === 1 && keys[0] === LocalizedString.UNDEFINED_LANGUAGE
      ? this.translations[LocalizedString.UNDEFINED_LANGUAGE]
      : this.translations;
  }

  /**
   * Returns the first translation for the given [language] BCP–47 tag.
   * If not found, then fallback:
   *    1. on the undefined language
   *    2. on the English language
   *    3. the first translation found
   *    4. returns empty string
   */
  public getTranslation(language?: string): string {
    return (
      this.translations[language || LocalizedString.UNDEFINED_LANGUAGE] ||
      this.translations[LocalizedString.UNDEFINED_LANGUAGE] ||
      this.translations[LocalizedString.LANGUAGE_EN] ||
      (Object.values(this.translations).length === 0
        ? ''
        : Object.values(this.translations)[0])
    );
  }
}
