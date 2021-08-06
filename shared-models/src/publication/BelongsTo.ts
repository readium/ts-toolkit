/* Copyright 2021 Readium Foundation. All rights reserved.
 * Use of this source code is governed by a BSD-style license,
 * available in the LICENSE file present in the Github repository of the project.
 */

import { Contributors as Collection } from './Contributor';

/**
 * BelongsTo Object for the Readium Web Publication Manifest.
 * https://readium.org/webpub-manifest/schema/contributor-object.schema.json
 */
export class BelongsTo {
  /**
   * Map of [BelongsTo] items.
   */
  public readonly items: Map<string, Collection>;

  /** Creates an Array of [Subject]. */
  constructor(values?: { items?: Map<string, Collection> }) {
    this.items =
      values && values.items ? values.items : new Map<string, Collection>();
  }

  /**
   * Parses a [BelongsTo] from its RWPM JSON representation.
   */
  public static deserialize(json: any): BelongsTo | undefined {
    if (!(json && json instanceof Object)) return;

    const items = new Map<string, Collection>();
    Object.entries(json).forEach(([key, value]) => {
      const obj = Collection.deserialize(value);
      if (obj && obj.items.length > 0) {
        items.set(key, obj);
      }
    });

    return new BelongsTo({ items });
  }

  /**
   * Serializes a [BelongsTo] to its RWPM JSON representation.
   */
  public serialize(): any {
    const json: any = {};
    this.items.forEach(
      (value: Collection, key: string) => (json[key] = value.serialize())
    );
    return json;
  }
}
