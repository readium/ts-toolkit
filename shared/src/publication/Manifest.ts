/* Copyright 2021 Readium Foundation. All rights reserved.
 * Use of this source code is governed by a BSD-style license,
 * available in the LICENSE file present in the Github repository of the project.
 */

import { Metadata } from './Metadata';
import { Link, Links } from './Link';
import { arrayfromJSONorString } from '../util/JSONParse';
import { PublicationCollection } from './PublicationCollection';
import { MediaType } from '../util/mediatype/MediaType';
import { Locator, LocatorLocations } from "./Locator";

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
      subcollections: PublicationCollection.deserializeCollections({
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
    PublicationCollection.serializeCollection(json, this.subcollections);
    return json;
  }

  /** Finds the first link with the given relation in the manifest's links. */
  public linkWithRel(rel: string): Link | undefined {
    const links = new Array<Links>();
    links.push(this.readingOrder);
    if (this.resources) {
      links.push(this.resources);
    }
    links.push(this.links);

    let result: Link | undefined;

    for (const collection of links) {
      result = collection.findWithRel(rel);
      if (result !== undefined) {
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

  /**
   * Creates a new [Locator] object from a [Link] to a resource of this manifest.
   * Returns null if the resource is not found in this manifest.
   */
  public locatorFromLink(link: Link): Locator | undefined {
    const components = link.href.split("#");
    const href = components.length == 2 ? components[0] : link.href;
    const resourceLink = this.linkWithHref(href);
    if(!resourceLink) return undefined;
    const type = resourceLink.type;
    if(!type) return undefined;
    const fragment = components.length == 2 ? components[1] : undefined;

    return new Locator({
      href,
      type,
      title: resourceLink.title ?? link.title,
      locations: new LocatorLocations({
        fragments: fragment ? [fragment] : undefined,
        progression: fragment ? undefined : 0.0,
      })
    });
  }

  /** Finds the first Link having the given `href` in the publication's links. */
  public linkWithHref(href: string): Link | undefined {
    const find = (links: Array<Links>): Link | undefined => {
      let result = undefined;

      for (const collection of links) {
        result = collection.findWithHref(href);
        if (result !== undefined) {
          return result;
        }
      }

      const children = new Array<Links>();

      links.forEach(item => {
        const arr = [];
        for (const link of item.items) {
          if (link.alternates) {
            arr.push(link.alternates);
          }
          if (link.children) {
            arr.push(link.children);
          }
        }
        children.push(...arr);
      });

      if (children.length > 0) {
        result = find(children);
      }

      return result;
    };

    const links: Array<Links> = [];
    links.push(this.readingOrder);
    if (this.resources) {
      links.push(this.resources);
    }
    links.push(this.links);

    const link = find(links);

    if (link !== undefined) {
      return link;
    }

    const parts = href.split(/[#]/);

    if (parts.length < 2) return;

    const shortHref = parts[0];

    return this.linkWithHref(shortHref);
  }

  /** The URL where this publication is served, computed from the `Link` with `self` relation.
   *  e.g. https://provider.com/pub1293/manifest.json gives https://provider.com/pub1293/
   */
  public get baseURL(): string | undefined {
    const selfLink = this.links.items.find(
      el => el.rels && el.rels.has('self')
    );
    if (selfLink) {
      let href = selfLink.href;
      if (href) {
        const li = href.lastIndexOf('/');
        const lastpart = li === -1 ? undefined : href.substring(li + 1);

        href = href.replace(new RegExp('/?$query$'), '');
        href = href.replace(new RegExp('//$'), '');
        if (lastpart) {
          href = href.replace(new RegExp(lastpart + '$'), '');
        }
      }
      return href;
    }
    return undefined;
  }

  /**
   * Sets the URL where this [Publication]'s RWPM manifest is served.
   */
  public setSelfLink(href: string): void {
    this.links.items = this.links.items.filter(
      x => x.rels === undefined || !x.rels?.has('self')
    );
    this.links.items.push(
      new Link({
        href,
        type: MediaType.READIUM_WEBPUB_MANIFEST.string,
        rels: new Set<string>(['self']),
      })
    );
  }
}
