/* Copyright 2020 Readium Foundation. All rights reserved.
 * Use of this source code is governed by a BSD-style license,
 * available in the LICENSE file present in the Github repository of the project.
 */

import { Links } from './Link';
import { LocalizedString } from './LocalizedString';

/**
 * https://github.com/readium/webpub-manifest/tree/master/contexts/default#subjects
 */
export class Subject {
  /** Subject name. */
  public readonly name: LocalizedString;

  /** Provides a string that a machine can sort. */
  public readonly sortAs?: string;

  /** EPUB 3.1 opf:term. */
  public readonly code?: string;

  /** EPUB 3.1 opf:authority. */
  public readonly scheme?: string;

  /** PUsed to retrieve similar publications for the given subjects. */
  public readonly links?: Links;

  /** Creates a [Subject]. */
  constructor(values: {
    name: LocalizedString;
    sortAs?: string;
    code?: string;
    scheme?: string;
    links?: Links;
  }) {
    this.name = values.name;
    this.sortAs = values.sortAs;
    this.code = values.code;
    this.scheme = values.scheme;
    this.links = values.links;
  }

  /**
   * Parses a [Subject] from its RWPM JSON representation.
   *
   * A [Subject] can be parsed from a single string, or a full-fledged object.
   */
  public static fromJSON(json: any): Subject | undefined {
    return json
      ? typeof json === 'string'
        ? new Subject({
            name: LocalizedString.fromJSON(json) as LocalizedString,
          })
        : json.name
        ? new Subject({
            name: LocalizedString.fromJSON(json.name) as LocalizedString,
            sortAs: json.sortAs,
            code: json.code,
            scheme: json.scheme,
            links: Links.fromJSON(json.links),
          })
        : undefined
      : undefined;
  }

  /**
   * Serializes a [Subject] to its RWPM JSON representation.
   */
  public toJSON(): any {
    let json: any = { name: this.name.toJSON() };
    if (this.sortAs) json.sortAs = this.sortAs;
    if (this.code) json.code = this.code;
    if (this.scheme) json.scheme = this.scheme;
    if (this.links) json.links = this.links.toJSON();
    return json;
  }
}

/**
 * https://github.com/readium/webpub-manifest/blob/master/schema/subject.schema.json
 *
 * Collection of [Subject]
 */
export class Subjects {
  /**
   * Array of [Subject] items.
   */
  public readonly items: Array<Subject>;

  /** Creates an Array of [Subject]. */
  constructor(items: Array<Subject>) {
    this.items = items;
  }

  /**
   * Parses a [Subjects] from its RWPM JSON representation.
   */
  public static fromJSON(json: any): Subjects | undefined {
    if (!json) return;
    let items = json instanceof Array ? json : [json];
    return new Subjects(
      items
        .map<Subject>(item => Subject.fromJSON(item) as Subject)
        .filter(x => x !== undefined)
    );
  }

  /**
   * Serializes a [Subjects] to its RWPM JSON representation.
   */
  public toJSON(): any {
    return this.items.map(x => x.toJSON());
  }
}
