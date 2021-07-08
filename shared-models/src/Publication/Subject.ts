/* Copyright 2021 Readium Foundation. All rights reserved.
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
  public static deserialize(json: any): Subject | undefined {
    if (!json) return;

    if (typeof json === 'string') {
      return new Subject({
        name: LocalizedString.deserialize(json) as LocalizedString,
      });
    } else {
      if (!json.name) return;
      return new Subject({
        name: LocalizedString.deserialize(json.name) as LocalizedString,
        sortAs: json.sortAs,
        code: json.code,
        scheme: json.scheme,
        links: Links.deserialize(json.links),
      });
    }
  }

  /**
   * Serializes a [Subject] to its RWPM JSON representation.
   */
  public serialize(): any {
    const json: any = { name: this.name.serialize() };
    if (this.sortAs !== undefined) json.sortAs = this.sortAs;
    if (this.code !== undefined) json.code = this.code;
    if (this.scheme !== undefined) json.scheme = this.scheme;
    if (this.links) json.links = this.links.serialize();
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
  public static deserialize(json: any): Subjects | undefined {
    if (!json) return;
    const items = json instanceof Array ? json : [json];
    return new Subjects(
      items
        .map<Subject>(item => Subject.deserialize(item) as Subject)
        .filter(x => x !== undefined)
    );
  }

  /**
   * Serializes a [Subjects] to its RWPM JSON representation.
   */
  public serialize(): any {
    return this.items.map(x => x.serialize());
  }
}
