/* Copyright 2020 Readium Foundation. All rights reserved.
 * Use of this source code is governed by a BSD-style license,
 * available in the LICENSE file present in the Github repository of the project.
 */

import { CoreCollection } from "./CoreCollection";
import { JSONDictionary } from "./Publication+JSON";
import { Link, Links } from "./Link";
import { Metadata } from "./Metadata";

/** Holds the metadata of a Readium publication, as described in 
 *  the Readium Web Publication Manifest.
 *  See. https://readium.org/webpub-manifest/
 */
export class Manifest {
  public readonly context: Array<string>;
  public readonly metadata: Metadata;
  public readonly links: Links;

  /** Identifies a list of resources in reading order for the publication. */
  public readonly readingOrder: Links;

  /** Identifies resources that are necessary for rendering the publication. */
  public readonly resources: Links;

  /** Identifies the collection that contains a table of contents. */
  public readonly tableOfContents: Links;

  public readonly subcollections: {[collection: string]: CoreCollection}

  constructor(manifestJSON: any) {
    const json = new JSONDictionary(manifestJSON);

    this.context = json.parseArray("@context");
    this.metadata = new Metadata(json.parseRaw("metadata"));
    this.links = new Links(json.parseArray("links"));
    this.readingOrder = new Links(json.parseArray("readingOrder"));
    this.resources = new Links(json.parseArray("resources"));
    this.tableOfContents = new Links(json.parseArray("toc"));
    this.subcollections = CoreCollection.makeCollections(json.json);
  }

  /** Finds the first link with the given relation in the manifest's links. */
  public linkWithRel(rel: string): Link | null {
    const links: Array<Links> = [this.readingOrder, this.resources, this.links];
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
    result.push(this.readingOrder.filterByRel(rel), this.resources.filterByRel(rel), this.links.filterByRel(rel));
    return result.reduce((acc, val) => acc.concat(val), []);
  }
}