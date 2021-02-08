/* Copyright 2020 Readium Foundation. All rights reserved.
 * Use of this source code is governed by a BSD-style license,
 * available in the LICENSE file present in the Github repository of the project.
 */

import { CoreCollection } from "./CoreCollection";
import { Link, Links } from "./Link";
import { Manifest } from "./Manifest";
import { Metadata } from "./Metadata";

/** Shared model for a Readium Publication. */
export class Publication {
  private manifest: Manifest;

  // Aliases
  public metadata: Metadata;
  public links: Links;
  public readingOrder: Links;
  public resources: Links;
  public tableOfContents: Links;
  public subcollections: {[collection: string]: CoreCollection};

  constructor(manifest: Manifest) {
    this.manifest = manifest;

    this.metadata = this.manifest.metadata;
    this.links = this.manifest.links;
    /** Identifies a list of resources in reading order for the publication. */
    this.readingOrder = this.manifest.readingOrder;
    /** Identifies resources that are necessary for rendering the publication. */
    this.resources = this.manifest.resources;
    /** Identifies the collection that contains a table of contents. */
    this.tableOfContents = this.manifest.tableOfContents;
    this.subcollections = this.manifest.subcollections;
  }

  /** The URL where this publication is served, computed from the `Link` with `self` relation.
   *  e.g. https://provider.com/pub1293/manifest.json gives https://provider.com/pub1293/
   */
  public baseURL(): string | null {
    const selfLink = this.manifest.links.find(el => el.rels.has("self"));
    if (selfLink) {
      return selfLink.href;
    } else {
      return null;
    }
  };

  /** Finds the first Link having the given `href` in the publication's links. */
  public linkWithHref(href: string): Link | null {
    const find = (links: Array<Links>): Link | null => {
      let result = null;

      for (const collection of links) {
        result = collection.findWithHref(href);
        if (result !== null) {
          return result;
        }
      }

      const children: Array<Links> = links.flatMap(item => {
        let arr = [];
        for (const link of item) {
          if (link.alternates) {
            arr.push(link.alternates)
          }
          if (link.children) {
            arr.push(link.children)
          }
        }
        return arr;
      });

      find(children);

      return result;
    }

    const links: Array<Links> = [this.manifest.readingOrder, this.manifest.resources, this.manifest.links];

    const link = find(links);

    if (link !== null) {
      return link;
    }

    const shortHref = href.split(/[#\?]/)[0];

    this.linkWithHref(shortHref);

    return link;
  }

  /** Finds the first link with the given relation in the publication's links. */
  public linkWithRel(rel: string): Link | null {
    return this.manifest.linkWithRel(rel);
  }

  /** Finds all the links with the given relation in the publication's links. */
  public linksWithRel(rel: string): Array<Link> {
    return this.manifest.linksWithRel(rel);
  }
}