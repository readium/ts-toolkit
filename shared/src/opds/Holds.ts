/* Copyright 2021 Readium Foundation. All rights reserved.
 * Use of this source code is governed by a BSD-style license,
 * available in the LICENSE file present in the Github repository of the project.
 */

import { positiveNumberfromJSON } from '../util/JSONParse';

/**
 * Library-specific features when a specific book is unavailable but provides a hold list.
 *
 * https://drafts.opds.io/schema/properties.schema.json
 */
export class Holds {
  public total?: number;
  public position?: number;

  /** Creates a [Price]. */
  constructor(values: { total?: number; position?: number }) {
    this.total = values.total;
    this.position = values.position;
  }

  /**
   * Parses a [Holds] from its RWPM JSON representation.
   */
  public static deserialize(json: any): Holds | undefined {
    if (!json) return;
    return new Holds({
      total: positiveNumberfromJSON(json.total),
      position: positiveNumberfromJSON(json.position),
    });
  }

  /**
   * Serializes a [Holds] to its RWPM JSON representation.
   */
  public serialize(): any {
    const json: any = {};
    if (this.total !== undefined) json.total = this.total;
    if (this.position !== undefined) json.position = this.position;
    return json;
  }
}
