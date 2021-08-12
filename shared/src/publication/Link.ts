/* Copyright 2021 Readium Foundation. All rights reserved.
 * Use of this source code is governed by a BSD-style license,
 * available in the LICENSE file present in the Github repository of the project.
 */

import { MediaType } from '../util/mediatype/MediaType';
import { Properties } from './Properties';
import { URITemplate } from '../util/URITemplate';
import {
  arrayfromJSONorString,
  positiveNumberfromJSON,
  setToArray,
} from '../util/JSONParse';
import { LocatorLocations, Locator } from './Locator';

/**
 * Link Object for the Readium Web Publication Manifest.
 * https://readium.org/webpub-manifest/schema/link.schema.json
 */
export class Link {
  /** URI or URI template of the linked resource. */
  public readonly href: string;

  /** Indicates that a URI template is used in href. */
  public readonly templated?: boolean;

  /** MIME type of the linked resource. */
  public readonly type?: string;

  /** Title of the linked resource. */
  public readonly title?: string;

  /** Relation between the linked resource and its containing collection. */
  public readonly rels?: Set<string>;

  /** Properties associated to the linked resource. */
  public properties?: Properties;

  /** Height of the linked resource in pixels. */
  public readonly height?: number;

  /** Width of the linked resource in pixels. */
  public readonly width?: number;

  /** Length of the linked resource in seconds. */
  public readonly duration?: number;

  /** Bitrate of the linked resource in kbps. */
  public readonly bitrate?: number;

  /** Expected language of the linked resource. */
  public readonly languages?: Array<string>;

  /** Alternate resources for the linked resource. */
  public readonly alternates?: Links;

  /** Resources that are children of the linked resource, in the context of a given collection role. */
  public readonly children?: Links;

  /**
   * Creates a [Link].
   */
  constructor(values: {
    href: string;
    templated?: boolean;
    type?: string;
    title?: string;
    rels?: Set<string>;
    properties?: Properties;
    height?: number;
    width?: number;
    duration?: number;
    bitrate?: number;
    languages?: Array<string>;
    alternates?: Links;
    children?: Links;
  }) {
    this.href = values.href;
    this.templated = values.templated;
    this.type = values.type;
    this.title = values.title;
    this.rels = values.rels;
    this.properties = values.properties;
    this.height = values.height;
    this.width = values.width;
    this.duration = values.duration;
    this.bitrate = values.bitrate;
    this.languages = values.languages;
    this.alternates = values.alternates;
    this.children = values.children;
  }

  /**
   * Parses a [Link] from its RWPM JSON representation.
   */
  public static deserialize(json: any): Link | undefined {
    if (!(json && json.href && typeof json.href === 'string')) return;
    return new Link({
      href: json.href,
      templated: json.templated,
      type: json.type,
      title: json.title,
      rels: json.rel
        ? json.rel instanceof Array
          ? new Set<string>(json.rel as Array<string>)
          : new Set<string>([json.rel as string])
        : undefined,
      properties: Properties.deserialize(json.properties),
      height: positiveNumberfromJSON(json.height),
      width: positiveNumberfromJSON(json.width),
      duration: positiveNumberfromJSON(json.duration),
      bitrate: positiveNumberfromJSON(json.bitrate),
      languages: arrayfromJSONorString(json.language),
      alternates: Links.deserialize(json.alternate),
      children: Links.deserialize(json.children),
    });
  }

  /**
   * Serializes a [Link] to its RWPM JSON representation.
   */
  public serialize(): any {
    const json: any = { href: this.href };
    if (this.templated !== undefined) json.templated = this.templated;
    if (this.type !== undefined) json.type = this.type;
    if (this.title !== undefined) json.title = this.title;
    if (this.rels) json.rel = setToArray(this.rels);
    if (this.properties) json.properties = this.properties.serialize();
    if (this.height !== undefined) json.height = this.height;
    if (this.width !== undefined) json.width = this.width;
    if (this.duration !== undefined) json.duration = this.duration;
    if (this.bitrate !== undefined) json.bitrate = this.bitrate;
    if (this.languages) json.language = this.languages;
    if (this.alternates) json.alternate = this.alternates.serialize();
    if (this.children) json.children = this.children.serialize();
    return json;
  }

  /** MediaType of the linked resource. */
  public get mediaType(): MediaType {
    return this.type !== undefined
      ? MediaType.parse({ mediaType: this.type })
      : MediaType.BINARY;
  }

  /** Computes an absolute URL to the link, relative to the given `baseURL`.
   *  If the link's `href` is already absolute, the `baseURL` is ignored.
   */
  public toURL(baseUrl?: string): string | undefined {
    const href = this.href.replace(/^(\/)/, '');
    if (href.length === 0) return;
    let _baseUrl = baseUrl ? baseUrl : '/';

    if (_baseUrl.startsWith('/')) {
      _baseUrl = 'file://' + _baseUrl;
    }

    return new URL(href, _baseUrl).href.replace(/^(file:\/\/)/, '');
  }

  /** List of URI template parameter keys, if the `Link` is templated. */
  public get templateParameters(): Set<string> {
    return this.templated ? new URITemplate(this.href).parameters : new Set();
  }

  /** Expands the `Link`'s HREF by replacing URI template variables by the given parameters.
   *  See RFC 6570 on URI template: https://tools.ietf.org/html/rfc6570
   */
  public expandTemplate(parameters: { [param: string]: string }): Link {
    // Probably make copy instead of a new one
    return new Link({
      href: new URITemplate(this.href).expand(parameters),
      templated: false,
    });
  }

  /**
   * Makes a copy of this [Link] after merging in the given additional other [properties].
   */
  public addProperties(properties: { [key: string]: any }): Link {
    const link = Link.deserialize(this.serialize()) as Link;
    link.properties = link.properties
      ? link.properties?.add(properties)
      : new Properties(properties);
    return link;
  }

  /**
   * Creates a [Locator] from a reading order [Link].
   */
  public get locator(): Locator {
    let parts = this.href.split('#');
    return new Locator({
      href: parts.length > 0 && parts[0] !== undefined ? parts[0] : this.href,
      type: this.type ?? '',
      title: this.title,
      locations: new LocatorLocations({
        fragments: parts.length > 1 && parts[1] !== undefined ? [parts[1]] : [],
      }),
    });
  }
}

/**
 * Parses multiple JSON links into an array of Link.
 */
export class Links {
  public items: Array<Link>;

  /**
   * Creates a [Links].
   */
  constructor(items: Array<Link>) {
    this.items = items;
  }

  /**
   * Creates a list of [Link] from its RWPM JSON representation.
   */
  public static deserialize(json: any): Links | undefined {
    if (!(json && json instanceof Array)) return;
    return new Links(
      json
        .map<Link>(item => Link.deserialize(item) as Link)
        .filter(x => x !== undefined)
    );
  }

  /**
   * Serializes an array of [Link] to its RWPM JSON representation.
   */
  public serialize(): any {
    return this.items.map(x => x.serialize());
  }

  /** Finds the first link with the given relation. */
  public findWithRel(rel: string): Link | undefined {
    const predicate = (el: Link) => el.rels && el.rels.has(rel);
    return this.items.find(predicate);
  }

  /** Finds all the links with the given relation. */
  public filterByRel(rel: string): Array<Link> {
    const predicate = (el: Link) => el.rels && el.rels.has(rel);
    return this.items.filter(predicate);
  }

  /** Finds the first link matching the given HREF. */
  public findWithHref(href: string): Link | undefined {
    const predicate = (el: Link) => el.href === href;
    return this.items.find(predicate);
  }

  /** Finds the index of the first link matching the given HREF. */
  public findIndexWithHref(href: string): number {
    const predicate = (el: Link) => el.href === href;
    return this.items.findIndex(predicate);
  }

  /** Finds the first link matching the given media type. */
  public findWithMediaType(mediaType: string): Link | undefined {
    const predicate = (el: Link) => el.mediaType.matches(mediaType);
    return this.items.find(predicate);
  }

  /** Finds all the links matching the given media type. */
  public filterByMediaType(mediaType: string): Array<Link> {
    const predicate = (el: Link) => el.mediaType.matches(mediaType);
    return this.items.filter(predicate);
  }

  /** Finds all the links matching any of the given media types. */
  public filterByMediaTypes(mediaTypes: Array<string>): Array<Link> {
    const predicate = (el: Link) => {
      for (const mediaType of mediaTypes) {
        if (el.mediaType.matches(mediaType)) {
          return true;
        }
      }
      return false;
    };
    return this.items.filter(predicate);
  }

  /** Returns whether all the resources in the collection are audio clips. */
  public everyIsAudio(): boolean {
    const predicate = (el: Link) => el.mediaType.isAudio;
    return this.items.length > 0 && this.items.every(predicate);
  }

  /** Returns whether all the resources in the collection are bitmaps. */
  public everyIsBitmap(): boolean {
    const predicate = (el: Link) => el.mediaType.isBitmap;
    return this.items.length > 0 && this.items.every(predicate);
  }

  /** Returns whether all the resources in the collection are HTML documents. */
  public everyIsHTML(): boolean {
    const predicate = (el: Link) => el.mediaType.isHTML;
    return this.items.length > 0 && this.items.every(predicate);
  }

  /** Returns whether all the resources in the collection are video clips. */
  public everyIsVideo(): boolean {
    const predicate = (el: Link) => el.mediaType.isVideo;
    return this.items.length > 0 && this.items.every(predicate);
  }

  /** Returns whether all the resources in the collection are matching any of the given media types. */
  public everyMatchesMediaType(mediaTypes: string | Array<string>): boolean {
    if (Array.isArray(mediaTypes)) {
      return (
        this.items.length > 0 &&
        this.items.every((el: Link) => {
          for (const mediaType of mediaTypes) {
            return el.mediaType.matches(mediaType);
          }
          return false;
        })
      );
    } else {
      return (
        this.items.length > 0 &&
        this.items.every((el: Link) => el.mediaType.matches(mediaTypes))
      );
    }
  }

  public filterLinksHasType(): Array<Link> {
    return this.items.filter(x => x.type);
  }
}
