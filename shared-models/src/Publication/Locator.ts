/* Copyright 2020 Readium Foundation. All rights reserved.
 * Use of this source code is governed by a BSD-style license,
 * available in the LICENSE file present in the Github repository of the project.
 */

import { arrayfromJSONorString, numberfromJSON } from '../util/JSONParse';

export interface IDOMRangePoint {
  cssSelector: string;
  textNodeIndex: number;
  charOffset?: number;
}

export interface IDOMRange {
  start: IDOMRangePoint;
  end?: IDOMRangePoint;
}

/**
 * Provides a precise location in a publication in a format that can be stored and shared.
 *
 * There are many different use cases for locators:
 *  - getting back to the last position in a publication
 *  - bookmarks
 *  - highlights & annotations
 *  - search results
 *  - human-readable (and shareable) reference in a publication
 *
 * https://github.com/readium/architecture/tree/master/locators
 */
export class Locator {
  /** The URI of the resource that the Locator Object points to. */
  public href: string;

  /** The media type of the resource that the Locator Object points to. */
  public type: string;

  /** The title of the chapter or section which is more relevant in the context of this locator. */
  public title?: string;

  /** One or more alternative expressions of the location. */
  public locations: Locations;

  /** Textual context of the locator. */
  public text?: Text;

  /**
   * Creates a [Locator].
   */
  constructor(values: {
    href: string;
    type: string;
    title?: string;
    locations?: Locations;
    text?: Text;
  }) {
    this.href = values.href;
    this.type = values.type;
    this.title = values.title;
    this.locations = values.locations ? values.locations : new Locations({});
    this.text = values.text; // ? values.text : new IText({});
  }

  /**
   * Parses a [Link] from its RWPM JSON representation.
   */
  public static deserialize(json: any): Locator | undefined {
    if (!(json && json.href && json.type)) return;
    return new Locator({
      href: json.href,
      type: json.type,
      title: json.title,
      locations: Locations.deserialize(json.locations),
      text: Text.deserialize(json.text),
    });
  }

  /**
   * Serializes a [Link] to its RWPM JSON representation.
   */
  public serialize(): any {
    const json: any = { href: this.href, type: this.type };
    if (this.title !== undefined) json.title = this.title;
    if (this.locations) json.locations = this.locations.serialize();
    if (this.text) json.text = this.text.serialize();
    return json;
  }
}

/**
 * One or more alternative expressions of the location.
 * https://github.com/readium/architecture/tree/master/models/locators#the-location-object
 */
export class Locations {
  /** Contains one or more fragment in the resource referenced by the `Locator`. */
  public fragments: Array<string>;

  /** Progression in the resource expressed as a percentage (between 0 and 1). */
  public progression?: number;

  /** Progression in the publication expressed as a percentage (between 0 and 1). */
  public totalProgression?: number;

  /** An index in the publication (>= 1).*/
  public position?: number;

  /** Additional locations for extensions. */
  public otherLocations?: Map<string, any>;

  /**
   * Creates a [Locations].
   */
  constructor(values: {
    fragments?: Array<string>;
    progression?: number;
    totalProgression?: number;
    position?: number;
    otherLocations?: Map<string, any>;
  }) {
    this.fragments = values.fragments ? values.fragments : new Array<string>();
    this.progression = values.progression;
    this.totalProgression = values.totalProgression;
    this.position = values.position;
    this.otherLocations = values.otherLocations;
  }

  /**
   * Parses a [Locations] from its RWPM JSON representation.
   */
  public static deserialize(json: any): Locations | undefined {
    if (!json) return;
    const progression = numberfromJSON(json.progression);
    const totalProgression = numberfromJSON(json.totalProgression);
    const position = numberfromJSON(json.position);

    const otherLocations = new Map<string, any>();

    const reservedKeys = new Set([
      'fragments',
      'progression',
      'totalProgression',
      'position',
    ]);
    Object.entries(json).forEach(([key, value]) => {
      if (!reservedKeys.has(key)) {
        otherLocations.set(key, value);
      }
    });

    return new Locations({
      fragments: arrayfromJSONorString(json.fragments),
      progression:
        progression && progression >= 0 && progression <= 1
          ? progression
          : undefined,
      totalProgression:
        totalProgression && totalProgression >= 0 && totalProgression <= 1
          ? totalProgression
          : undefined,
      position: position && position > 0 ? position : undefined,
      otherLocations: otherLocations.size === 0 ? undefined : otherLocations,
    });
  }

  /**
   * Serializes a [Locations] to its RWPM JSON representation.
   */
  public serialize(): any {
    const json: any = {};
    if (this.fragments) json.fragments = this.fragments;
    if (this.progression !== undefined) json.progression = this.progression;
    if (this.totalProgression !== undefined)
      json.totalProgression = this.totalProgression;
    if (this.position !== undefined) json.position = this.position;
    if (this.otherLocations) {
      this.otherLocations.forEach(([key, value]) => (json[key] = value));
    }
    return json;
  }

  //TODO :Extend
  /** otherLocators currently in use in Thorium/R2D2BC */
  // cssSelector?: string;
  // partialCfi?: string;
  // domRange?: IDOMRange;
}

export class Text {
  public after?: string;
  public before?: string;
  public highlight?: string;

  /**
   * Creates a [Text].
   */
  constructor(values: { after?: string; before?: string; highlight?: string }) {
    this.after = values.after;
    this.before = values.before;
    this.highlight = values.highlight;
  }

  /**
   * Parses a [Locations] from its RWPM JSON representation.
   */
  public static deserialize(json: any): Text | undefined {
    if (!json) return;
    return new Text({
      after: json.after,
      before: json.before,
      highlight: json.highlight,
    });
  }

  /**
   * Serializes a [Locations] to its RWPM JSON representation.
   */
  public serialize(): any {
    const json: any = {};
    if (this.after !== undefined) json.after = this.after;
    if (this.before !== undefined) json.before = this.before;
    if (this.highlight !== undefined) json.highlight = this.highlight;
    return json;
  }
}
