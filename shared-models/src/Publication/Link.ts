/* Copyright 2020 Readium Foundation. All rights reserved.
 * Use of this source code is governed by a BSD-style license,
 * available in the LICENSE file present in the Github repository of the project.
 */

import { MediaType } from '../util/mediatype/MediaType';
import { Properties } from './Properties';
import { URITemplate } from '../util/URITemplate';
import {
  arrayfromJSONorString,
  positiveNumberfromJSON,
} from '../util/JSONParse';

/**
 * Link Object for the Readium Web Publication Manifest.
 * https://readium.org/webpub-manifest/schema/link.schema.json
 *
 * href URI or URI template of the linked resource.
 * type MIME type of the linked resource.
 * templated Indicates that a URI template is used in href.
 * title Title of the linked resource.
 * rels Relation between the linked resource and its containing collection.
 * properties Properties associated to the linked resource.
 * height Height of the linked resource in pixels.
 * width Width of the linked resource in pixels.
 * bitrate Bitrate of the linked resource in kbps.
 * duration Length of the linked resource in seconds.
 * languages Expected language of the linked resource (BCP 47 tag).
 * alternates Alternate resources for the linked resource.
 * children Resources that are children of the linked resource, in the context of a given
 *     collection role.
 */
export class Link {
  /** URI or URI template of the linked resource. */
  public href: string;

  /** Indicates that a URI template is used in href. */
  public templated?: boolean;

  /** MIME type of the linked resource. */
  public type?: string;

  /** Title of the linked resource. */
  public title?: string;

  /** Relation between the linked resource and its containing collection. */
  public rels?: Set<string>;

  /** Properties associated to the linked resource. */
  public properties?: Properties;

  /** Height of the linked resource in pixels. */
  public height?: number;

  /** Width of the linked resource in pixels. */
  public width?: number;

  /** Length of the linked resource in seconds. */
  public duration?: number;

  /** Bitrate of the linked resource in kbps. */
  public bitrate?: number;

  /** Expected language of the linked resource. */
  public languages?: Array<string>;

  /** Alternate resources for the linked resource. */
  public alternates?: Links;

  /** Resources that are children of the linked resource, in the context of a given collection role. */
  public children?: Links;

  /** MediaType of the linked resource. */
  public mediaType?: MediaType;

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

  public static fromJSON(json: any): Link | undefined {
    return json && json.href && typeof json.href === 'string'
      ? new Link({
          href: json.href,
          templated: json.templated,
          type: json.type,
          title: json.title,
          rels: json.rel
            ? json.rel instanceof Array
              ? new Set<string>(json.rel as Array<string>)
              : new Set<string>([json.rel as string])
            : undefined,
          properties: Properties.fromJSON(json.properties),
          height: positiveNumberfromJSON(json.height),
          width: positiveNumberfromJSON(json.width),
          duration: positiveNumberfromJSON(json.duration),
          bitrate: positiveNumberfromJSON(json.bitrate),
          languages: arrayfromJSONorString(json.language),
          alternates: Links.fromJSON(json.alternate),
          children: Links.fromJSON(json.children),
        })
      : undefined;
  }

  public toJSON(): any {
    let json: any = { href: this.href };
    if (this.templated) json.templated = this.templated;
    if (this.type) json.type = this.type;
    if (this.title) json.title = this.title;
    if (this.rels) {
      let relList = new Array<string>();
      this.rels.forEach(x => relList.push(x));
      json.rel = relList;
    }
    if (this.properties) json.properties = this.properties.toJSON();
    if (this.height) json.height = this.height;
    if (this.width) json.width = this.width;
    if (this.duration) json.duration = this.duration;
    if (this.bitrate) json.bitrate = this.bitrate;
    if (this.languages) json.language = this.languages;
    if (this.alternates) json.alternate = this.alternates.toJSON();
    if (this.children) json.children = this.children.toJSON();
    return json;
  }

  /** Computes an absolute URL to the link, relative to the given `baseURL`.
   *  If the link's `href` is already absolute, the `baseURL` is ignored.
   */
  public toAbsoluteHREF(baseUrl?: string): string | undefined {
    let href = this.href.replace(/^(\/)/, '');
    if (href.length === 0) return undefined;
    let _baseUrl = baseUrl ? baseUrl : '/';

    if (_baseUrl.startsWith('/')) {
      _baseUrl = 'file://' + _baseUrl;
    }

    return new URL(href, _baseUrl).href.replace(/^(file:\/\/)/, '');
  }

  /** List of URI template parameter keys, if the `Link` is templated. */
  public getTemplateParameters(): Set<string> {
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
    let link = Link.fromJSON(this.toJSON()) as Link;
    link.properties = link.properties
      ? link.properties?.add(properties)
      : new Properties(properties);
    return link;
  }
}

/** Parses multiple JSON links into an array of Link. */
export class Links {
  public readonly items: Array<Link>;

  constructor(items: Array<Link>) {
    this.items = items;
  }

  public static fromJSON(json: any): Links | undefined {
    if (json && json instanceof Array) {
      return new Links(
        json
          .map<Link>(item => Link.fromJSON(item) as Link)
          .filter(x => x !== undefined)
      );
    } else {
      return undefined;
    }
  }

  public toJSON(): any {
    return this.items.map(x => x.toJSON());
  }

  /** Finds the first link with the given relation. */
  public findWithRel(rel: string): Link | null {
    const predicate = (el: Link) => el.rels && el.rels.has(rel);
    return this.items.find(predicate) || null;
  }

  /** Finds all the links with the given relation. */
  public filterByRel(rel: string): Array<Link> {
    const predicate = (el: Link) => el.rels && el.rels.has(rel);
    return this.items.filter(predicate);
  }

  /** Finds the first link matching the given HREF. */
  public findWithHref(href: string): Link | null {
    const predicate = (el: Link) => el.href === href;
    return this.items.find(predicate) || null;
  }

  /** Finds the index of the first link matching the given HREF. */
  public findIndexWithHref(href: string): number {
    const predicate = (el: Link) => el.href === href;
    return this.items.findIndex(predicate);
  }

  /** Finds the first link matching the given media type. */
  public findWithMediaType(mediaType: string): Link | null {
    const predicate = (el: Link) =>
      el.mediaType ? el.mediaType.matches(mediaType) : false;
    return this.items.find(predicate) || null;
  }

  /** Finds all the links matching the given media type. */
  public filterByMediaType(mediaType: string): Array<Link> {
    const predicate = (el: Link) =>
      el.mediaType ? el.mediaType.matches(mediaType) : false;
    return this.items.filter(predicate);
  }

  /** Finds all the links matching any of the given media types. */
  public filterByMediaTypes(mediaTypes: Array<string>): Array<Link> {
    const predicate = (el: Link) => {
      for (const mediaType of mediaTypes) {
        return el.mediaType ? el.mediaType.matches(mediaType) : false;
      }
      return false;
    };
    return this.items.filter(predicate);
  }

  /** Returns whether all the resources in the collection are audio clips. */
  public everyIsAudio(): boolean {
    const predicate = (el: Link) =>
      el.mediaType ? el.mediaType.isAudio() : false;
    return this.items.every(predicate);
  }

  /** Returns whether all the resources in the collection are bitmaps. */
  public everyIsBitmap(): boolean {
    const predicate = (el: Link) =>
      el.mediaType ? el.mediaType.isBitmap() : false;
    return this.items.every(predicate);
  }

  /** Returns whether all the resources in the collection are HTML documents. */
  public everyIsHTML(): boolean {
    const predicate = (el: Link) =>
      el.mediaType ? el.mediaType.isHtml() : false;
    return this.items.every(predicate);
  }

  /** Returns whether all the resources in the collection are video clips. */
  public everyIsVideo(): boolean {
    const predicate = (el: Link) =>
      el.mediaType ? el.mediaType.isVideo() : false;
    return this.items.every(predicate);
  }

  /** Returns whether all the resources in the collection are matching any of the given media types. */
  public everyMatchesMediaType(mediaTypes: string | Array<string>): boolean {
    if (Array.isArray(mediaTypes)) {
      return this.items.every((el: Link) => {
        for (const mediaType of mediaTypes) {
          return el.mediaType ? el.mediaType.matches(mediaType) : false;
        }
        return false;
      });
    } else {
      return this.items.every((el: Link) =>
        el.mediaType ? el.mediaType.matches(mediaTypes) : false
      );
    }
  }
}
