/* Copyright 2021 Readium Foundation. All rights reserved.
 * Use of this source code is governed by a BSD-style license,
 * available in the LICENSE file present in the Github repository of the project.
 */

import { numberfromJSON } from '../util/JSONParse';
import { Links } from './Link';
import { LocalizedString } from './LocalizedString';
import { Locator } from './Locator';

/**
 * Holds the metadata of a `LocatorCollection`.
 */
export class LocatorCollectionMetadata {
  public title?: LocalizedString;

  /** numberOfItems Indicates the total number of locators in the collection. */
  public numberOfItems?: number;

  public otherMetadata?: Map<string, any>;

  /**
   * Creates a [LocatorMetadata].
   */
  constructor(values: {
    title?: LocalizedString;
    numberOfItems?: number;
    otherMetadata?: Map<string, any>;
  }) {
    this.title = values.title;
    this.numberOfItems = values.numberOfItems;
    this.otherMetadata = values.otherMetadata;
  }

  /**
   * Parses a [LocatorMetadata] from its RWPM JSON representation.
   */
  public static deserialize(json: any): LocatorCollectionMetadata | undefined {
    if (!json) return;

    const otherMetadata = new Map<string, any>();

    const reservedKeys = new Set(['title', 'numberOfItems']);
    Object.entries(json).forEach(([key, value]) => {
      if (!reservedKeys.has(key)) {
        otherMetadata.set(key, value);
      }
    });

    return new LocatorCollectionMetadata({
      title: LocalizedString.deserialize(json.title),
      numberOfItems: numberfromJSON(json.numberOfItems),
      otherMetadata: otherMetadata.size === 0 ? undefined : otherMetadata,
    });
  }

  /**
   * Serializes a [LocatorMetadata] to its RWPM JSON representation.
   */
  public serialize(): any {
    const json: any = {};
    if (this.title) json.title = this.title.serialize();
    if (this.numberOfItems !== undefined)
      json.numberOfItems = this.numberOfItems;
    if (this.otherMetadata) {
      this.otherMetadata.forEach((value, key) => (json[key] = value));
    }
    return json;
  }
}

/**
 * Represents a sequential list of `Locator` objects.
 *
 * For example, a search result or a list of positions.
 */
export class LocatorCollection {
  public metadata: LocatorCollectionMetadata;
  public links: Links;
  public locators: Array<Locator>;

  /**
   * Creates a [LocatorCollection].
   */
  constructor(values: {
    metadata?: LocatorCollectionMetadata;
    links?: Links;
    locators?: Array<Locator>;
  }) {
    this.metadata = values.metadata ?? new LocatorCollectionMetadata({});
    this.links = values.links ?? new Links([]);
    this.locators = values.locators ?? [];
  }

  /**
   * Parses a [LocatorCollection] from its RWPM JSON representation.
   */
  public static deserialize(json: any): LocatorCollection | undefined {
    if (!json) return;

    let locators: Array<Locator> | undefined;

    let jsonList = json.locators;

    if (jsonList && jsonList instanceof Array) {
      locators = jsonList
        .map<Locator>(x => Locator.deserialize(x) as Locator)
        .filter(x => x !== undefined);
    }

    return new LocatorCollection({
      metadata: LocatorCollectionMetadata.deserialize(json.metadata),
      links: Links.deserialize(json.links),
      locators,
    });
  }

  /**
   * Serializes a [LocatorCollection] to its RWPM JSON representation.
   */
  public serialize(): any {
    const json: any = {};
    if (this.metadata) {
      let serializedMetadata = this.metadata.serialize();
      if (serializedMetadata && Object.keys(serializedMetadata).length > 0)
        json.metadata = serializedMetadata;
    }
    if (this.links && this.links.items.length > 0)
      json.links = this.links.serialize();
    if (this.locators) json.locators = this.locators.map(x => x.serialize());
    return json;
  }
}
