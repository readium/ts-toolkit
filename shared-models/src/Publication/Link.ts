/* Copyright 2020 Readium Foundation. All rights reserved.
 * Use of this source code is governed by a BSD-style license,
 * available in the LICENSE file present in the Github repository of the project.
 */

import { MediaType } from "../Format/MediaType";
import { Properties } from "./Properties";
import { URITemplate } from "../util/URITemplate";

/*  
    Keeping as ref list of values we know are currently used, per webpub doc:
    https://github.com/readium/webpub-manifest/blob/master/relationships.md
    type LinkRel = "alternate" | "contents" | "cover" | "manifest" | "search" | "self"; 
*/

export interface ILink {
  href: string;
  templated?: boolean;
  type?: string;
  title?: string;
  rel?: Array<string>;
  properties?: Properties;
  height?: number;
  width?: number;
  duration?: number;
  bitrate?: number;
  language?: Array<string>;
  alternate?: Array<ILink>;
  children?: Array<ILink>;
}

/** Link Object for the Readium Web Publication Manifest.
 *  https://readium.org/webpub-manifest/schema/link.schema.json
 */
export class Link implements ILink {

  /** URI or URI template of the linked resource. */
  public href: string;

  /** Indicates that a URI template is used in href. */
  public templated?: boolean;
  
  /** MIME type of the linked resource. */
  public type?: string;
  
  /** Title of the linked resource. */
  public title?: string;
  
  /** Relation between the linked resource and its containing collection. */
  public rels?: Array<string>;
  
  /** Properties associated to the linked resource. */
  public properties: Properties;
  
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
  public alternates: Links;
  
  /** Resources that are children of the linked resource, in the context of a given collection role. */
  public children: Links;
  
  /** MediaType of the linked resource. */
  public mediaType?: MediaType;

  public templateParameters: Set<string>;

  constructor(link: ILink) {
    this.href = link.href;
    this.templated = link.templated;
    this.type = link.type;
    this.title = link.title;
    this.rels = link.rel;
    this.properties = new Properties(link.properties);
    this.height = link.height;
    this.width = link.width;
    this.duration = link.duration;
    this.bitrate = link.bitrate;
    this.languages = link.language;
    this.alternates = link.alternate ? new Links(link.alternate) : new Links([]);
    this.children = link.children ? new Links(link.children) : new Links([]);
    this.mediaType = link.type ? new MediaType(link.type) : undefined;
    this.templateParameters = this.getTemplateParameters();
  }

  /** Computes an absolute URL to the link, relative to the given `baseURL`.
   *  If the link's `href` is already absolute, the `baseURL` is ignored.
   */
  public toAbsoluteHREF(baseUrl: string): string {
    return new URL(this.href, baseUrl).href;
  }

  /** List of URI template parameter keys, if the `Link` is templated. */
  private getTemplateParameters(): Set<string> {
    if (!this.templated) {
      return new Set();
    } else {
      return new URITemplate(this.href).parameters;
    }
  }

  /** Expands the `Link`'s HREF by replacing URI template variables by the given parameters.
   *  See RFC 6570 on URI template: https://tools.ietf.org/html/rfc6570
   */
  public expandTemplate(parameters: { [param: string]: string}): Link {
    // Probably make copy instead of a new one
    return new Link({
      href: new URITemplate(this.href).expand(parameters),
      templated: false
    });
  }
}

/** Parses multiple JSON links into an array of Link. */
export class Links extends Array<Link> {
  constructor(items: Array<ILink> | number) {
    if (items instanceof Array) {
      super(...items.map(item => new Link(item)));
    } else {
      super(items);
    }
    Object.setPrototypeOf(this, new.target.prototype);
  }

  /** Finds the first link with the given relation. */
  public findWithRel(rel: string): Link | null {
    const predicate = (el: Link) => el.rels.includes(rel);
    return this.find(predicate) || null;
  }

  /** Finds all the links with the given relation. */
  public filterByRel(rel: string): Array<Link> {
    const predicate = (el: Link) => el.rels.includes(rel);
    return this.filter(predicate);
  }

  /** Finds the first link matching the given HREF. */
  public findWithHref(href: string): Link | null {
    const predicate = (el: Link) => el.href === href;
    return this.find(predicate) || null;
  }

  /** Finds the index of the first link matching the given HREF. */
  public findIndexWithHref(href: string): number {
    const predicate = (el: Link) => el.href === href;
    return this.findIndex(predicate);
  }

  /** Finds the first link matching the given media type. */
  public findWithMediaType(mediaType: string): Link | null {
    const predicate = (el: Link) => el.mediaType ? el.mediaType.matches(mediaType) : false;
    return this.find(predicate) || null;
  }

  /** Finds all the links matching the given media type. */
  public filterByMediaType(mediaType: string): Array<Link> {
    const predicate = (el: Link) => el.mediaType ? el.mediaType.matches(mediaType) : false;
    return this.filter(predicate);
  }

  /** Finds all the links matching any of the given media types. */
  public filterByMediaTypes(mediaTypes: Array<string>): Array<Link> {
    const predicate = (el: Link) => {
      for (const mediaType of mediaTypes) {
        return el.mediaType ? el.mediaType.matches(mediaType) : false;
      }
      return false;
    };
    return this.filter(predicate);
  }

  /** Returns whether all the resources in the collection are audio clips. */
  public everyIsAudio(): boolean {
    const predicate = (el: Link) => el.mediaType ? el.mediaType.isAudio() : false;
    return this.every(predicate);
  }

  /** Returns whether all the resources in the collection are bitmaps. */
  public everyIsBitmap(): boolean {
    const predicate = (el: Link) => el.mediaType ? el.mediaType.isBitmap() : false;
    return this.every(predicate);
  }

  /** Returns whether all the resources in the collection are HTML documents. */
  public everyIsHTML(): boolean {
    const predicate = (el: Link) => el.mediaType ? el.mediaType.isHTML() : false;
    return this.every(predicate);
  }

  /** Returns whether all the resources in the collection are video clips. */
  public everyIsVideo(): boolean {
    const predicate = (el: Link) => el.mediaType ? el.mediaType.isVideo() : false;
    return this.every(predicate);
  }

  /** Returns whether all the resources in the collection are matching any of the given media types. */
  public everyMatchesMediaType(mediaTypes: string | Array<string>): boolean {
    if (Array.isArray(mediaTypes)) {
      return this.every((el: Link) => {
        for (const mediaType of mediaTypes) {
          return el.mediaType ? el.mediaType.matches(mediaType) : false;
        }
        return false;
      });
    } else {
      return this.every((el: Link) => el.mediaType ? el.mediaType.matches(mediaTypes) : false);
    }
  }
}