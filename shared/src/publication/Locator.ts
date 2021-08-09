/* Copyright 2021 Readium Foundation. All rights reserved.
 * Use of this source code is governed by a BSD-style license,
 * available in the LICENSE file present in the Github repository of the project.
 */

import { arrayfromJSONorString, numberfromJSON } from '../util/JSONParse';

/**
 * One or more alternative expressions of the location.
 * https://github.com/readium/architecture/tree/master/models/locators#the-location-object
 */
export class LocatorLocations {
  /** Contains one or more fragment in the resource referenced by the `Locator`. */
  public readonly fragments: Array<string>;

  /** Progression in the resource expressed as a percentage (between 0 and 1). */
  public readonly progression?: number;

  /** Progression in the publication expressed as a percentage (between 0 and 1). */
  public readonly totalProgression?: number;

  /** An index in the publication (>= 1).*/
  public readonly position?: number;

  /** Additional locations for extensions. */
  public readonly otherLocations?: Map<string, any>;

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
  public static deserialize(json: any): LocatorLocations | undefined {
    if (!json) return;
    const progression = numberfromJSON(json.progression);
    const totalProgression = numberfromJSON(json.totalProgression);
    const position = numberfromJSON(json.position);

    const otherLocations = new Map<string, any>();

    const reservedKeys = new Set([
      'fragment',
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

    return new LocatorLocations({
      fragments: arrayfromJSONorString(json.fragments || json.fragment),
      progression:
        progression !== undefined && progression >= 0 && progression <= 1
          ? progression
          : undefined,
      totalProgression:
        totalProgression !== undefined &&
        totalProgression >= 0 &&
        totalProgression <= 1
          ? totalProgression
          : undefined,
      position: position !== undefined && position > 0 ? position : undefined,
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
      this.otherLocations.forEach((value, key) => (json[key] = value));
    }
    return json;
  }
}

export class LocatorText {
  public readonly after?: string;
  public readonly before?: string;
  public readonly highlight?: string;

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
  public static deserialize(json: any): LocatorText | undefined {
    if (!json) return;
    return new LocatorText({
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
  public readonly href: string;

  /** The media type of the resource that the Locator Object points to. */
  public readonly type: string;

  /** The title of the chapter or section which is more relevant in the context of this locator. */
  public readonly title?: string;

  /** One or more alternative expressions of the location. */
  public readonly locations: LocatorLocations;

  /** Textual context of the locator. */
  public readonly text?: LocatorText;

  /**
   * Creates a [Locator].
   */
  constructor(values: {
    href: string;
    type: string;
    title?: string;
    locations?: LocatorLocations;
    text?: LocatorText;
  }) {
    this.href = values.href;
    this.type = values.type;
    this.title = values.title;
    this.locations = values.locations
      ? values.locations
      : new LocatorLocations({});
    this.text = values.text;
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
      locations: LocatorLocations.deserialize(json.locations),
      text: LocatorText.deserialize(json.text),
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

  /**
   * Shortcut to get a copy of the [Locator] with different [Locations] sub-properties.
   */
  public copyWithLocations(values: any): Locator {
    return new Locator({
      href: this.href,
      type: this.type,
      title: this.title,
      text: this.text,
      locations: new LocatorLocations({ ...this.locations, ...values }),
    });
  }
}
