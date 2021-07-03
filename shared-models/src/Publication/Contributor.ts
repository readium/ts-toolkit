/* Copyright 2020 Readium Foundation. All rights reserved.
 * Use of this source code is governed by a BSD-style license,
 * available in the LICENSE file present in the Github repository of the project.
 */

import { Links } from './Link';
import {
  arrayfromJSONorString,
  numberfromJSON,
  setToArray,
} from '../util/JSONParse';
import { LocalizedString } from './LocalizedString';

/**
 * Contributor Object for the Readium Web Publication Manifest.
 * https://readium.org/webpub-manifest/schema/contributor-object.schema.json
 */
export class Contributor {
  /** The name of the contributor. */
  public readonly name: LocalizedString;

  /** The string used to sort the name of the contributor. */
  public readonly sortAs?: string;

  /** An unambiguous reference to this contributor. */
  public readonly identifier?: string;

  /** The role of the contributor in the publication making. */
  public readonly roles?: Set<string>;

  /** Used to retrieve similar publications for the given contributor. */
  public readonly links?: Links;

  /** The position of the publication in this collection/series, when the contributor represents a collection. */
  public readonly position?: number;

  /**
   * Creates a [Contributor] object.
   */
  constructor(values: {
    name: LocalizedString;
    sortAs?: string;
    identifier?: string;
    roles?: Set<string>;
    links?: Links;
    position?: number;
  }) {
    this.name = values.name;
    this.sortAs = values.sortAs;
    this.identifier = values.identifier;
    this.roles = values.roles;
    this.links = values.links;
    this.position = values.position;
  }

  /**
   * Parses a [Contributor] from its RWPM JSON representation.
   *
   * A contributor can be parsed from a single string, or a full-fledged object.
   */
  public static fromJSON(json: any): Contributor | undefined {
    if (!json) return;
    if (typeof json === 'string') {
      return new Contributor({
        name: LocalizedString.fromJSON(json) as LocalizedString,
      });
    } else {
      if (!json.name) return;
      return new Contributor({
        name: LocalizedString.fromJSON(json.name) as LocalizedString,
        sortAs: json.sortAs,
        identifier: json.identifier,
        roles: json.role
          ? new Set<string>(arrayfromJSONorString(json.role))
          : undefined,
        links: Links.fromJSON(json.links),
        position: numberfromJSON(json.position),
      });
    }
  }

  /**
   * Serializes a [Contributor] to its RWPM JSON representation.
   */
  public toJSON(): any {
    let json: any = { name: this.name.toJSON() };
    if (this.sortAs) json.sortAs = this.sortAs;
    if (this.identifier) json.identifier = this.identifier;
    if (this.roles) json.role = setToArray(this.roles);
    if (this.links) json.links = this.links.toJSON();
    if (this.position) json.position = this.position;
    return json;
  }
}

export class Contributors {
  /**
   * Array of [Contributor] .
   */
  public readonly items: Array<Contributor>;

  /**
   * Creates a [Contributors] object.
   */
  constructor(items: Array<Contributor>) {
    this.items = items;
  }

  /**
   * Parses a [Contributors] from its RWPM JSON representation.
   *
   */
  public static fromJSON(json: any): Contributors | undefined {
    if (!json) return;
    let items = json instanceof Array ? json : [json];
    return new Contributors(
      items
        .map<Contributor>(item => Contributor.fromJSON(item) as Contributor)
        .filter(x => x !== undefined)
    );
  }

  /**
   * Serializes a [Contributors] to its RWPM JSON representation.
   */
  public toJSON(): any {
    return this.items.map(x => x.toJSON());
  }
}
