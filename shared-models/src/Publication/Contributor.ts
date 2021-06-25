/* Copyright 2020 Readium Foundation. All rights reserved.
 * Use of this source code is governed by a BSD-style license,
 * available in the LICENSE file present in the Github repository of the project.
 */

import { Links } from '..';
import { LocalizedString } from './LocalizedString';

/** https://readium.org/webpub-manifest/schema/contributor-object.schema.json */
// export interface IContributor {
//   /** The name of the contributor. */
//   name: string | ILocalizedString;

//   /** The string used to sort the name of the contributor. */
//   sortAs?: string;

//   /** An unambiguous reference to this contributor. */
//   identifier?: string;

//   /** The role of the contributor in the publication making. */
//   role?: Array<string>;

//   /** Used to retrieve similar publications for the given contributor. */
//   links?: Array<ILink>;

//   /** The position of the publication in this collection/series, when the contributor represents a collection. */
//   position?: number;
// }

//export type Contributor = string | IContributor | Array<string | IContributor>;

//TODO : to be implemented
export class Contributor {
  /** The name of the contributor. */
  public readonly name: LocalizedString;

  /** The string used to sort the name of the contributor. */
  public readonly sortAs?: string;

  /** An unambiguous reference to this contributor. */
  public readonly identifier?: string;

  /** The role of the contributor in the publication making. */
  public readonly role?: Array<string>;

  /** Used to retrieve similar publications for the given contributor. */
  public readonly links?: Links;

  /** The position of the publication in this collection/series, when the contributor represents a collection. */
  public readonly position?: number;

  constructor(values: { name: LocalizedString }) {
    //TODO : add other members
    this.name = values.name;
  }

  public static fromJSON(json: any): Contributor | undefined {
    return json
      ? typeof json == 'string'
        ? new Contributor({
            name: LocalizedString.fromJSON(json) as LocalizedString,
          })
        : new Contributor({
            name: LocalizedString.fromJSON(json.name) as LocalizedString,
          })
      : undefined;
  }

  public toJSON(): any {
    return { name: this.name.toJSON() };
  }
}

export class Contributors {
  public readonly items: Array<Contributor>;

  constructor(items: Array<Contributor>) {
    this.items = items;
  }

  public static fromJSON(json: any): Contributors | undefined {
    if (json) {
      let items = json instanceof Array ? json : [json];
      return new Contributors(
        items.map<Contributor>(
          item => Contributor.fromJSON(item) as Contributor
        )
      );
    } else {
      return undefined;
    }
  }

  public toJSON(): any {
    return this.items.map(x => x.toJSON());
  }
}
