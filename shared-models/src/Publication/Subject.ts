/* Copyright 2020 Readium Foundation. All rights reserved.
 * Use of this source code is governed by a BSD-style license,
 * available in the LICENSE file present in the Github repository of the project.
 */

import { LocalizedString } from './LocalizedString';

/** https://github.com/readium/webpub-manifest/tree/master/contexts/default#subjects */
// export interface Subject {
//   name: string | LocalizedString;
//   sortAs?: string;
//   code?: string;
//   scheme?: string;
//   links?: Array<Link>;
// }

/**
 * https://github.com/readium/webpub-manifest/blob/master/schema/subject-object.schema.json
 *
 * name The name of the subject.
 * sortAs Provides a string that a machine can sort.
 * scheme EPUB 3.1 opf:authority.
 * code EPUB 3.1 opf:term.
 * links Used to retrieve similar publications for the given subjects.
 */
export class Subject {
  public readonly name: LocalizedString;
  public readonly sortAs?: string;
  public readonly code?: string;
  public readonly scheme?: string;

  // sortAs?: string;
  // code?: string;
  // scheme?: string;
  // links?: Array<Link>;

  constructor(values: { name: LocalizedString }) {
    //TODO : add other members
    this.name = values.name;
  }

  public static fromJSON(json: any): Subject | undefined {
    return json
      ? typeof json == 'string'
        ? new Subject({
            name: LocalizedString.fromJSON(json) as LocalizedString,
          })
        : new Subject({
            name: LocalizedString.fromJSON(json.name) as LocalizedString,
          })
      : undefined;
  }

  public toJSON(): any {
    return { name: this.name.toJSON() };
  }
}

/**
 * https://github.com/readium/webpub-manifest/blob/master/schema/subject.schema.json
 *
 * Collection of [Subject]
 */
export class Subjects {
  public readonly items: Array<Subject>;

  constructor(items: Array<Subject>) {
    this.items = items;
  }

  public static fromJSON(json: any): Subjects | undefined {
    if (json) {
      let items = json instanceof Array ? json : [json];
      return new Subjects(
        items.map<Subject>(item => Subject.fromJSON(item) as Subject)
      );
    } else {
      return undefined;
    }
  }

  public toJSON(): any {
    return this.items.map(x => x.toJSON());
  }
}
