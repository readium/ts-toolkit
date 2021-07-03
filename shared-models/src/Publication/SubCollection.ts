/* Copyright 2020 Readium Foundation. All rights reserved.
 * Use of this source code is governed by a BSD-style license,
 * available in the LICENSE file present in the Github repository of the project.
 */

import { Links } from './Link';

/**
 * Link Object for the Readium Web Publication Manifest.
 * https://readium.org/webpub-manifest/schema/link.schema.json
 */
export class SubCollection {
  public metadata?: Map<string, any>;
  public links: Links;
  public subcollections?: Map<
    string,
    SubCollection | Array<SubCollection> | Links
  >;

  /**
   * Creates a [Link].
   */
  constructor(values: {
    metadata?: Map<string, any>;
    links: Links;
    subcollections?: Map<string, SubCollection | Array<SubCollection> | Links>;
  }) {
    this.metadata = values.metadata;
    this.links = values.links;
    this.subcollections = values.subcollections;
  }

  /**
   * Parses a [Link] from its RWPM JSON representation.
   */
  public static fromJSON(json: any): SubCollection | undefined {
    if (!(json && json.links)) return;
    let links = Links.fromJSON(json.links);

    if (!links) return;

    let metadata = new Map<string, any>();

    if (json.metadata) {
      Object.entries(json.metadata).forEach(([key, value]) => {
        metadata.set(key, value);
      });
    }

    let subcollections = new Map<
      string,
      SubCollection | Array<SubCollection> | Links
    >();

    Object.entries(json).forEach(([key, value]) => {
      if (key !== 'links' && key !== 'metadata') {
        if (value instanceof Array) {
          if (value.length > 0) {
            if (value[0].href) {
              //links
              let obj = Links.fromJSON(value);
              if (obj) {
                subcollections.set(key, obj);
              }
            } else if (value[0].links) {
              //sub collections
              let obj = value
                .map<SubCollection>(
                  item => SubCollection.fromJSON(item) as SubCollection
                )
                .filter(x => x !== undefined);
              if (obj) {
                subcollections.set(key, obj);
              }
            }
          }
        } else if (value instanceof Object) {
          let obj = SubCollection.fromJSON(value);
          if (obj) {
            subcollections.set(key, obj);
          }
        }
      }
    });

    return new SubCollection({
      metadata: metadata.size ? metadata : undefined,
      links: Links.fromJSON(json.links) as Links,
      subcollections: subcollections.size ? subcollections : undefined,
    });
  }

  /**
   * Serializes a [Link] to its RWPM JSON representation.
   */
  public toJSON(): any {
    let json: any = {};

    if (this.metadata) {
      json.metadata = {};
      this.metadata.forEach(
        (value: any, key: string) => (json.metadata[key] = value)
      );
    }

    json.links = this.links.toJSON();

    if (this.subcollections && this.subcollections.size > 0) {
      this.subcollections.forEach((value: any, key: string) => {
        if (value instanceof Array) {
          json[key] = value.map(x => x.toJSON());
        } else {
          json[key] = value.toJSON();
        }
      });
    }

    return json;
  }
}
