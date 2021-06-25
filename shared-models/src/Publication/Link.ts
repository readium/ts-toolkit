/* Copyright 2020 Readium Foundation. All rights reserved.
 * Use of this source code is governed by a BSD-style license,
 * available in the LICENSE file present in the Github repository of the project.
 */

import { MediaType } from '../Format/MediaType';
import { Properties } from './Properties';
import { URITemplate } from '../util/URITemplate';
// import { JSONDictionary } from './Publication+JSON';

/*  
    Keeping as ref list of values we know are currently used, per webpub doc:
    https://github.com/readium/webpub-manifest/blob/master/relationships.md
    type LinkRel = "alternate" | "contents" | "cover" | "manifest" | "search" | "self"; 
*/

// export interface ILink {
//   href: string;
//   templated?: boolean;
//   type?: string;
//   title?: string;
//   rel?: Array<string>;
//   properties?: Properties;
//   height?: number;
//   width?: number;
//   duration?: number;
//   bitrate?: number;
//   language?: Array<string>;
//   alternate?: Array<ILink>;
//   children?: Array<ILink>;
// }

/** Link Object for the Readium Web Publication Manifest.
 *  https://readium.org/webpub-manifest/schema/link.schema.json
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

  // public templateParameters: Set<string>;

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

    // this.href = link.href;
    // this.templated = link.templated;
    // this.type = link.type;
    // this.title = link.title;
    // this.rels = new Set(link.rel);
    // this.properties = new Properties(link.properties);
    // this.height = link.height;
    // this.width = link.width;
    // this.duration = link.duration;
    // this.bitrate = link.bitrate;
    // this.languages = link.languages;
    // this.alternates = link.alternates
    //   ? new Links(link.alternate)
    //   : new Links([]);
    // this.children = link.children ? new Links(link.children) : new Links([]);
    // this.mediaType = link.type ? new MediaType(link.type) : undefined;
    // this.templateParameters = this.getTemplateParameters();
  }

  public static fromJSON(json: any): Link | undefined {
    if (json) {
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
        properties: Properties.fromJSON(json.properties),
        height: json.height,
        width: json.width,
        duration: json.duration,
        bitrate: json.bitrate,
        languages: json.language,
        alternates: Links.fromJSON(json.alternate),
        children: Links.fromJSON(json.children),
      });
    } else {
      return undefined;
    }
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
    if (this.languages) json.languages = this.languages;
    if (this.alternates) json.alternates = this.alternates.toJSON();
    if (this.children) json.children = this.children.toJSON();
    return json;
  }

  /** Computes an absolute URL to the link, relative to the given `baseURL`.
   *  If the link's `href` is already absolute, the `baseURL` is ignored.
   */
  public toAbsoluteHREF(baseUrl: string): string {
    return new URL(this.href, baseUrl).href;
  }

  /** List of URI template parameter keys, if the `Link` is templated. */
  // private getTemplateParameters(): Set<string> {
  //   if (!this.templated) {
  //     return new Set();
  //   } else {
  //     return new URITemplate(this.href).parameters;
  //   }
  // }

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
}

/** Parses multiple JSON links into an array of Link. */
export class Links {
  public readonly items: Array<Link>;

  constructor(items: Array<Link>) {
    this.items = items;
  }

  public static fromJSON(json: any): Links | undefined {
    if (json && json instanceof Array) {
      return new Links(json.map<Link>(item => Link.fromJSON(item) as Link));
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
      el.mediaType ? el.mediaType.isHTML() : false;
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
