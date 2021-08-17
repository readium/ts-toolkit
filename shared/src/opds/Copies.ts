/* Copyright 2021 Readium Foundation. All rights reserved.
 * Use of this source code is governed by a BSD-style license,
 * available in the LICENSE file present in the Github repository of the project.
 */

import { positiveNumberfromJSON } from '../util/JSONParse';

/**
 * Library-specific feature that contains information about the copies that a library has acquired.
 *
 * https://drafts.opds.io/schema/properties.schema.json
 */
export class Copies {
  public total?: number;
  public available?: number;

  /** Creates a [Copies]. */
  constructor(values: { total?: number; available?: number }) {
    this.total = values.total;
    this.available = values.available;
  }

  /**
   * Parses a [Copies] from its RWPM JSON representation.
   */
  public static deserialize(json: any): Copies | undefined {
    if (!json) return;
    return new Copies({
      total: positiveNumberfromJSON(json.total),
      available: positiveNumberfromJSON(json.available),
    });
  }

  /**
   * Serializes a [Copies] to its RWPM JSON representation.
   */
  public serialize(): any {
    const json: any = {};
    if (this.total !== undefined) json.total = this.total;
    if (this.available !== undefined) json.available = this.available;
    return json;
  }
}
