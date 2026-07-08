/* Copyright 2021 Readium Foundation. All rights reserved.
 * Use of this source code is governed by a BSD-style license,
 * available in the LICENSE file present in the Github repository of the project.
 */

import { Link, Links } from './Link.ts';
import { Locator } from './Locator.ts';
import { Manifest } from './Manifest.ts';
import { Metadata } from './Metadata.ts';
import { EmptyFetcher, Fetcher } from '../fetcher/Fetcher.ts';
import { PublicationCollection } from './PublicationCollection.ts';
import { Resource } from '../fetcher/Resource.ts';
import { GuidedNavigationDocument } from "./GuidedNavigation.ts";
import { MediaType, URITemplate } from "../util/index.ts";
import { Timeline } from './services/timeline/Timeline.ts';

/** Shared model for a Readium Publication. */
export class Publication {
  /** The manifest holding the publication metadata extracted from the publication file */
  public manifest: Manifest;
  private readonly fetcher: Fetcher = new EmptyFetcher();
  private _timeline: Timeline | undefined;

  // Shortcuts to manifest properties
  public readonly context?: Array<string>;
  public readonly metadata: Metadata;
  public readonly links?: Links;
  /** Identifies a list of resources in reading order for the publication. */
  public readonly readingOrder: Links;
  /** Identifies resources that are necessary for rendering the publication. */
  public readonly resources?: Links;
  /** Identifies the collection that contains a table of contents. */
  public readonly toc?: Links;
  /** Identifies the collection that contains sub collections. */
  public readonly subcollections?: Map<string, Array<PublicationCollection>>;

  constructor(values: { manifest: Manifest; fetcher?: Fetcher }) {
    if (values.fetcher) this.fetcher = values.fetcher;
    this.manifest = values.manifest;
    this.context = values.manifest.context;
    this.metadata = values.manifest.metadata;
    this.links = values.manifest.links;
    this.readingOrder = values.manifest.readingOrder;
    this.resources = values.manifest.resources;
    this.toc = values.manifest.toc;
    this.subcollections = values.manifest.subcollections;
  }

  /**
   * Returns the publication's timeline, built from its reading order and table of contents.
   * The result is cached after the first call.
   */
  public get timeline(): Timeline {
    if (!this._timeline) this._timeline = Timeline.build(this);
    return this._timeline;
  }

  /** The URL where this publication is served, computed from the `Link` with `self` relation.
   *  e.g. https://provider.com/pub1293/manifest.json gives https://provider.com/pub1293/
   */
  public get baseURL(): string | undefined {
    return this.manifest.baseURL;
  }

  /** Finds the first Link having the given `href` in the publication's links. */
  public linkWithHref(href: string): Link | undefined {
    return this.manifest.linkWithHref(href);
  }

  /**
   * Returns the [links] of the first child [PublicationCollection] with the given role, or an
   * empty list.
   */
  public linksWithRole(role: string): Links | undefined {
    const list = this.subcollections?.get(role);
    return list && list.length > 0 ? list[0].links : undefined;
  }

  /** Finds all the links with the given relation in the publication's links. */
  public linksWithRel(rel: string): Array<Link> {
    return this.manifest.linksWithRel(rel);
  }

  /**
   * Finds the first [Link] having the given [rel] in the publications's links.
   */
  public linkWithRel(rel: string): Link | undefined {
    return this.manifest.linkWithRel(rel);
  }

  /**
   * Gets the cover image for the publication.
   * First looks for rel='cover' in links/resources/readingOrder,
   * then falls back to any image (JPEG, PNG, GIF, AVIF, SVG).
   */
  public getCover(): Link | undefined {
    const locations = [
      this.links,
      this.resources,
      this.readingOrder
    ].filter(Boolean) as Links[];

    // First, look for explicit cover relationship
    for (const location of locations) {
      const cover = location.items.find(link => link.rels?.has('cover'));
      if (cover) return cover;
    }

    // Fallback to any image (including SVG which is not bitmap)
    for (const location of locations) {
      const image = location.items.find(link => 
        link.mediaType.isBitmap || 
        link.mediaType.matches(MediaType.SVG)
      );
      if (image) return image;
    }

    return undefined;
  }

  public async positionsFromManifest(): Promise<Locator[]> {
    const positionListLink = this.manifest.links?.findWithMediaType(
      'application/vnd.readium.position-list+json'
    );
    if (positionListLink === undefined) return [];
    const positionListJSON = (await this.get(
      positionListLink
    ).readAsJSON()) as { positions: unknown[] | null, total: number };
    if(!positionListJSON['total']) return [];
    return (positionListJSON['positions'] as unknown[]) // Get the array for the positions key
      .map(pos => Locator.deserialize(pos)) // Parse locators
      .filter(l => l !== undefined) as Locator[]; // Filter out failures
  }

  public async guideForLink(link: Link): Promise<GuidedNavigationDocument | undefined> {
    const findGNLink = (l: Link): Link | undefined => l.alternates?.findWithMediaType(
      'application/guided-navigation+json'
    );

    let guidedNavigationLink = findGNLink(link);
    if(!guidedNavigationLink) {
      // If provided link doesn't have a guided navigation link,
      // search through the manfiest for a matching Link based on the `href`
      const foundLink = this.linkWithHref(link.href);
      if (foundLink !== undefined) {
        // A Link was found, attempt to find a guided navigation link
        guidedNavigationLink = findGNLink(foundLink);
      }
    }

    if(!guidedNavigationLink) {
      // Still unable to find a guided navigation link, try to use the manifest's global document
      guidedNavigationLink = this.manifest.links?.findWithMediaType(
        'application/guided-navigation+json'
      );
    }

    // Unable to find any guided navigation Link, give up
    if(!guidedNavigationLink) return;

    let href = guidedNavigationLink.href;
    if(guidedNavigationLink.templated) {
      // The manifest's guided navigation link is templated, expand it
      const template = new URITemplate(href);
      const params: { [param: string]: string } = {};
      if(template.parameters.has('ref')) {
        // The template has a `ref` parameter that could be used to reduce the returned doc's size
        params['ref'] = link.href;
      }
      href = new URITemplate(href).expand(params);
    }

    // Fetch the guided navigation document
    const guidedNavigationJSON = (await this.get(new Link({
      href,
    })).readAsJSON());
    return GuidedNavigationDocument.deserialize(guidedNavigationJSON);
  }

  /**
   * Returns the resource targeted by the given non-templated [link].
   */
  public get(link: Link): Resource {
    // TODO warn about expanding templated links
    return this.fetcher.get(link);
  }
}
