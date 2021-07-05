/* Copyright 2020 Readium Foundation. All rights reserved.
 * Use of this source code is governed by a BSD-style license,
 * available in the LICENSE file present in the Github repository of the project.
 */

import { Link, Links } from './Link';
import { Manifest } from './Manifest';
import { Metadata } from './Metadata';
import { PublicationCollection } from './PublicationCollection';

/** Shared model for a Readium Publication. */
export class Publication {
  /** The manifest holding the publication metadata extracted from the publication file */
  public manifest: Manifest;

  // Shortcuts to manifest properties
  public readonly context?: Array<string>;
  public readonly metadata: Metadata;
  public readonly links: Links;
  /** Identifies a list of resources in reading order for the publication. */
  public readonly readingOrder: Links;
  /** Identifies resources that are necessary for rendering the publication. */
  public readonly resources?: Links;
  /** Identifies the collection that contains a table of contents. */
  public readonly tableOfContents?: Links;
  /** Identifies the collection that contains sub collections. */
  public readonly subcollections?: Map<string, Array<PublicationCollection>>;

  constructor(manifest: Manifest) {
    this.manifest = manifest;
    this.context = manifest.context;
    this.metadata = manifest.metadata;
    this.links = manifest.links;
    this.readingOrder = manifest.readingOrder;
    this.resources = manifest.resources;
    this.tableOfContents = manifest.tableOfContents;
    this.subcollections = manifest.subcollections;
  }

  /** The URL where this publication is served, computed from the `Link` with `self` relation.
   *  e.g. https://provider.com/pub1293/manifest.json gives https://provider.com/pub1293/
   */
  public baseURL(): string | null {
    const selfLink = this.links.items.find(
      el => el.rels && el.rels.has('self')
    );
    if (selfLink) {
      return selfLink.href;
    } else {
      return null;
    }
  }

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
        const arr = [];
        for (const link of item.items) {
          if (link.alternates) {
            arr.push(link.alternates);
          }
          if (link.children) {
            arr.push(link.children);
          }
        }
        return arr;
      });

      find(children);

      return result;
    };

    const links: Array<Links> = [];
    links.push(this.readingOrder);
    if (this.resources) {
      links.push(this.resources);
    }
    links.push(this.links);

    const link = find(links);

    if (link !== null) {
      return link;
    }

    const shortHref = href.split(/[#]/)[0];

    this.linkWithHref(shortHref);

    return link;
  }

  /**
   * Returns the [links] of the first child [PublicationCollection] with the given role, or an
   * empty list.
   */
  public linksWithRole(role: string): Links | undefined {
    const list = this.subcollections?.get(role);
    return list && list.length > 0 ? list[0].links : undefined;
  }

  //TODO: remove
  // /** Finds the first link with the given relation in the publication's links. */
  // public linkWithRel(rel: string): Link | null {
  //   return this.linkWithRel(rel);
  // }

  // /** Finds all the links with the given relation in the publication's links. */
  // public linksWithRel(rel: string): Array<Link> {
  //   return this.linksWithRel(rel);
  // }

  /** EPUB Web Publication Extension
   *  https://readium.org/webpub-manifest/schema/extensions/epub/subcollections.schema.json
   */
}
