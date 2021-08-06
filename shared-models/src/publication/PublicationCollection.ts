/* Copyright 2021 Readium Foundation. All rights reserved.
 * Use of this source code is governed by a BSD-style license,
 * available in the LICENSE file present in the Github repository of the project.
 */

import { Links } from './Link';

/**
 * Core Collection Model
 *
 * https://readium.org/webpub-manifest/schema/subcollection.schema.json
 * Can be used as extension point in the Readium Web Publication Manifest.
 */
export class PublicationCollection {
  public metadata?: Map<string, any>;
  public links: Links;
  public subcollections?: Map<string, Array<PublicationCollection>>;

  /**
   * Creates a [PublicationCollection].
   */
  constructor(values: {
    metadata?: Map<string, any>;
    links: Links;
    subcollections?: Map<string, Array<PublicationCollection>>;
  }) {
    this.metadata = values.metadata;
    this.links = values.links;
    this.subcollections = values.subcollections;
  }

  /**
   * Parses a [PublicationCollection] from its RWPM JSON representation.
   */
  public static deserialize(json: any): PublicationCollection | undefined {
    if (!json) return;

    let links: Links | undefined;
    let metadata: Map<string, any> | undefined;
    let subcollections: Map<string, Array<PublicationCollection>> | undefined;

    if (json instanceof Array) {
      // Parses an array of links.
      links = Links.deserialize(json);
    } else if (json instanceof Object) {
      // Parses a sub-collection object.
      links = Links.deserialize(json.links);

      metadata = new Map<string, any>();

      if (json.metadata) {
        Object.entries(json.metadata).forEach(([key, value]) => {
          metadata?.set(key, value);
        });
      }

      subcollections = PublicationCollection.deserializeCollections(json);
    } else {
      return;
    }

    if (!links || links.items.length === 0) return;

    return new PublicationCollection({
      metadata: metadata?.size ? metadata : undefined,
      links,
      subcollections: subcollections?.size ? subcollections : undefined,
    });
  }

  /**
   * Parses a map of [PublicationCollection] indexed by their roles from its RWPM JSON representation.
   *
   */
  public static deserializeCollections(
    json: any
  ): Map<string, Array<PublicationCollection>> | undefined {
    if (!json) return;
    const collections = new Map<string, Array<PublicationCollection>>();
    Object.entries(json).forEach(([role, subJSON]) => {
      if (role !== 'links' && role !== 'metadata') {
        // Parses a list of links or a single collection object.
        const collection = PublicationCollection.deserialize(subJSON);

        if (collection) {
          const list = new Array<PublicationCollection>();
          list.push(collection);
          collections.set(role, list);
        } else if (subJSON instanceof Array) {
          // Parses a list of collection objects.
          const list = subJSON
            .map<PublicationCollection>(
              item =>
                PublicationCollection.deserialize(item) as PublicationCollection
            )
            .filter(x => x !== undefined);

          collections.set(role, list);
        }
      }
    });

    return collections.size ? collections : undefined;
  }

  /**
   * Serializes a [PublicationCollection] to its RWPM JSON representation.
   */
  public serialize(): any {
    const json: any = {};

    if (this.metadata) {
      json.metadata = {};
      this.metadata.forEach(
        (value: any, key: string) => (json.metadata[key] = value)
      );
    }

    if (this.links.items.length) {
      json.links = this.links.serialize();
    }

    PublicationCollection.serializeCollection(json, this.subcollections);

    return json;
  }

  public static serializeCollection(
    json: any,
    subcollections?: Map<string, Array<PublicationCollection>>
  ) {
    if (subcollections && subcollections.size > 0) {
      subcollections.forEach(
        (value: Array<PublicationCollection>, key: string) => {
          if (value.length === 1) {
            json[key] = value[0].serialize();
          } else {
            json[key] = value.map(x => x.serialize());
          }
        }
      );
    }
  }
}
