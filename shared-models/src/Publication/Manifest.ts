/* Copyright 2020 Readium Foundation. All rights reserved.
 * Use of this source code is governed by a BSD-style license,
 * available in the LICENSE file present in the Github repository of the project.
 */

import { Metadata } from './Metadata';
import { Link, Links } from './Link';
import { arrayfromJSONorString } from '../util/JSONParse';
import { PublicationCollection } from './PublicationCollection';

/** Holds the metadata of a Readium publication, as described in
 *  the Readium Web Publication Manifest.
 *  See. https://readium.org/webpub-manifest/
 */
export class Manifest {
  public readonly context?: Array<string>;

  public readonly metadata: Metadata;

  public readonly links: Links;

  /** Identifies a list of resources in reading order for the publication. */
  public readonly readingOrder: Links;

  /** Identifies resources that are necessary for rendering the publication. */
  public readonly resources?: Links;

  /** Identifies the collection that contains a table of contents. */
  public readonly tableOfContents?: Links;

  public readonly subcollections?: Map<string, Array<PublicationCollection>>;

  constructor(values: {
    context?: Array<string>;
    metadata: Metadata;
    links: Links;
    readingOrder: Links;
    resources?: Links;
    tableOfContents?: Links;
    subcollections?: Map<string, Array<PublicationCollection>>;
  }) {
    this.context = values.context;
    this.metadata = values.metadata;
    this.links = values.links;
    this.readingOrder = values.readingOrder;
    this.resources = values.resources;
    this.tableOfContents = values.tableOfContents;
    this.subcollections = values.subcollections;
  }

  /**
   * Parses a [Publication] from its RWPM JSON representation.
   *
   * https://readium.org/webpub-manifest/
   * https://readium.org/webpub-manifest/schema/publication.schema.json
   */
  public static deserialize(json: any): Manifest | undefined {
    if (!json) return;

    const metadata = Metadata.deserialize(json.metadata);

    if (!metadata) return;

    const links = Links.deserialize(json.links);

    if (!links) return;

    const readingOrder = Links.deserialize(
      json.readingOrder ? json.readingOrder : json.spine
    );

    if (!readingOrder) return;

    return new Manifest({
      context: arrayfromJSONorString(json['@context']),
      metadata,
      links,
      readingOrder,
      resources: Links.deserialize(json.resources),
      tableOfContents: Links.deserialize(json.toc),
      subcollections: PublicationCollection.collectionsFromJSON({
        sub: json.sub,
      }),
    });
  }

  /**
   * Serializes a [Publication] to its RWPM JSON representation.
   */
  public serialize(): any {
    const json: any = {};
    if (this.context !== undefined) json['@context'] = this.context;
    json.metadata = this.metadata.serialize();
    json.links = this.links.serialize();
    json.readingOrder = this.readingOrder.serialize();
    if (this.resources) json.resources = this.resources.serialize();
    if (this.tableOfContents) json.toc = this.tableOfContents.serialize();
    PublicationCollection.appendCollectionToJSON(json, this.subcollections);
    return json;
  }

  /** Finds the first link with the given relation in the manifest's links. */
  public linkWithRel(rel: string): Link | null {
    const links = new Array<Links>();
    links.push(this.readingOrder);
    if (this.resources) {
      links.push(this.resources);
    }
    links.push(this.links);

    //[this.readingOrder, this.resources , this.links];

    let result = null;

    for (const collection of links) {
      result = collection.findWithRel(rel);
      if (result !== null) {
        return result;
      }
    }

    return result;
  }

  /** Finds all the links with the given relation in the manifest's links. */
  public linksWithRel(rel: string): Array<Link> {
    const result = [];
    result.push(this.readingOrder.filterByRel(rel));
    if (this.resources) {
      result.push(this.resources.filterByRel(rel));
    }
    result.push(this.links.filterByRel(rel));

    return result.reduce((acc, val) => acc.concat(val), []);
  }

  //TODO : remove
  // private getAllLinks() : Array<Links> {
  //   const result = new Array<Links>();
  //   result.push(this.readingOrder);
  //   if (this.resources) {
  //     result.push(this.resources);
  //   }
  //   result.push(this.links);
  //   return result;
  // }
}
