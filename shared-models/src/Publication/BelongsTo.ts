/* Copyright 2021 Readium Foundation. All rights reserved.
 * Use of this source code is governed by a BSD-style license,
 * available in the LICENSE file present in the Github repository of the project.
 */

import { Contributors } from './Contributor';

/**
 * BelongsTo Object for the Readium Web Publication Manifest.
 * https://readium.org/webpub-manifest/schema/contributor-object.schema.json
 */
export class BelongsTo {
  /**
   * Map of [BelongsTo] items.
   */
  public readonly items: Map<string, Contributors>;

  /** Creates an Array of [Subject]. */
  constructor(values?: { items?: Map<string, Contributors> }) {
    this.items =
      values && values.items ? values.items : new Map<string, Contributors>();
  }

  /**
   * Parses a [BelongsTo] from its RWPM JSON representation.
   */
  public static deserialize(json: any): BelongsTo | undefined {
    if (!(json && json instanceof Object)) return;

    const items = new Map<string, Contributors>();
    Object.entries(json).forEach(([key, value]) => {
      const obj = Contributors.deserialize(value);
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
      (value: Contributors, key: string) => (json[key] = value.serialize())
    );
    return json;
  }
}
