/* Copyright 2021 Readium Foundation. All rights reserved.
 * Use of this source code is governed by a BSD-style license,
 * available in the LICENSE file present in the Github repository of the project.
 */

/**
 * Represents a string with multiple translations indexed by a BCP 47 language tag.
 */
export class LocalizedString {
  public readonly translations: { [key: string]: string };

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

  /**
   * Parses a [LocalizedString] from its RWPM JSON representation.
   *
   * "anyOf": [
   *   {
   *     "type": "string"
   *   },
   *   {
   *     "description": "The language in a language map must be a valid BCP 47 tag.",
   *     "type": "object",
   *     "patternProperties": {
   *       "^((?<grandfathered>(en-GB-oed|i-ami|i-bnn|i-default|i-enochian|i-hak|i-klingon|i-lux|i-mingo|i-navajo|i-pwn|i-tao|i-tay|i-tsu|sgn-BE-FR|sgn-BE-NL|sgn-CH-DE)|(art-lojban|cel-gaulish|no-bok|no-nyn|zh-guoyu|zh-hakka|zh-min|zh-min-nan|zh-xiang))|((?<language>([A-Za-z]{2,3}(-(?<extlang>[A-Za-z]{3}(-[A-Za-z]{3}){0,2}))?)|[A-Za-z]{4}|[A-Za-z]{5,8})(-(?<script>[A-Za-z]{4}))?(-(?<region>[A-Za-z]{2}|[0-9]{3}))?(-(?<variant>[A-Za-z0-9]{5,8}|[0-9][A-Za-z0-9]{3}))*(-(?<extension>[0-9A-WY-Za-wy-z](-[A-Za-z0-9]{2,8})+))*(-(?<privateUse>x(-[A-Za-z0-9]{1,8})+))?)|(?<privateUse2>x(-[A-Za-z0-9]{1,8})+))$": {
   *         "type": "string"
   *       }
   *     },
   *     "additionalProperties": false,
   *     "minProperties": 1
   *   }
   * ]
   */
  public static deserialize(json: any): undefined | LocalizedString {
    if (!(json && (typeof json === 'string' || json.constructor === Object)))
      return;
    return new LocalizedString(json);
  }

  public serialize(): any {
    return this.translations;
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
