/* Copyright 2020 Readium Foundation. All rights reserved.
 * Use of this source code is governed by a BSD-style license,
 * available in the LICENSE file present in the Github repository of the project.
 */

//type StringKV = {[key: string]: string};

// export interface ILocalizedString {
//   // Todo: this should be a class with a helper getting lang (with fallback)
//   [key: string]: string;
// }

export class LocalizedString {
  public items: { [key: string]: string };

  constructor(items: string | { [key: string]: string }) {
    this.items =
      typeof items === 'string' ? { undefined_language: items } : items;
  }

  public static fromJSON(json: any): undefined | LocalizedString {
    return json ? new LocalizedString(json) : undefined;
  }

  public toJSON(): any {
    let keys = Object.keys(this.items);
    return keys.length === 1 && keys[0] === 'undefined_language'
      ? this.items['undefined_language']
      : this.items;
  }

  public getAsString(language?: string): string {
    return this.items[language || 'en'] || Object.values(this.items)[0] || '';
  }
}

// export function getLocalizedStringTranslation(localizedString: any, language: string): string {
//   return localizedString[language] ||
//     localizedString["en"] || Object.values(localizedString)[0] || "";
// }

// export function getLocalizedStringFromJSON(value: any): ILocalizedString {
//   return (typeof value == "string") ? { "default": value } : value;
// }
