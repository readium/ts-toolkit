/* Copyright 2020 Readium Foundation. All rights reserved.
 * Use of this source code is governed by a BSD-style license,
 * available in the LICENSE file present in the Github repository of the project.
 */
import { arrayfromJSONorString } from '../util/JSONParse';
import { Link, Links } from './Link';
import { Metadata } from './Metadata';

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

  //TODO : fix
  //public readonly subcollections: { [collection: string]: CoreCollection };

  constructor(values: {
    context?: Array<string>,
    metadata: Metadata,
    links: Links,
    readingOrder: Links,
    resources?: Links,
    tableOfContents?: Links
  }
  ) {
    this.context = values.context;
    this.metadata = values.metadata;
    this.links = values.links;
    this.readingOrder = values.readingOrder;
    this.resources = values.resources;
    this.tableOfContents = values.tableOfContents;
    //this.subcollections = CoreCollection.makeCollections(json.json);
  }

  public static fromJSON(json: any) : Manifest {
    return new Manifest({
      context: arrayfromJSONorString(json['@context']),
      metadata: Metadata.fromJSON(json.metadata),
      links: Links.fromJSON(json.links) as Links,
      readingOrder: Links.fromJSON(json.readingOrder ? json.readingOrder : json.spine) as Links,
      resources: Links.fromJSON(json.resources),
      tableOfContents: Links.fromJSON(json.toc)
      //this.subcollections = CoreCollection.makeCollections(dictionary.json);
    });
  }

  public toJSON(): any {
    let json: any = {};
    if (this.context) json.context = this.context;
    json.metadata = this.metadata.toJSON();
    json.links = this.links.toJSON();
    json.readingOrder = this.readingOrder.toJSON();
    if (this.resources) json.resources = this.resources.toJSON();
    if (this.tableOfContents) json.toc = this.tableOfContents.toJSON();
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
    let result = [];
    result.push(this.readingOrder.filterByRel(rel));
    if (this.resources) {
      result.push(this.resources.filterByRel(rel));
    }
    result.push(this.links.filterByRel(rel));

    return result.reduce((acc, val) => acc.concat(val), []);
  }

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
