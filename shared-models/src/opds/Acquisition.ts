/* Copyright 2021 Readium Foundation. All rights reserved.
 * Use of this source code is governed by a BSD-style license,
 * available in the LICENSE file present in the Github repository of the project.
 */

/**
 * OPDS Acquisition Object.
 *
 * https://drafts.opds.io/schema/acquisition-object.schema.json
 */
export class Acquisition {
  /** Currency for the price, eg. EUR. */
  public type: string;

  /** Price value, should only be used for display purposes, because of precision issues
   *    inherent with Double and the JSON parsing. */
  public children?: Array<Acquisition>;

  /** Creates a [Acquisition]. */
  constructor(values: { type: string; children?: Array<Acquisition> }) {
    this.type = values.type;
    this.children = values.children;
  }

  /**
   * Parses a [Acquisition] from its RWPM JSON representation.
   */
  public static deserialize(json: any): Acquisition | undefined {
    if (!(json && json.type)) return;

    return new Acquisition({
      type: json.type,
      children: Acquisition.deserializeArray(json.children),
    });
  }

  public static deserializeArray(json: any): Array<Acquisition> | undefined {
    if (!(json instanceof Array)) return;
    return json
      .map<Acquisition>(item => Acquisition.deserialize(item) as Acquisition)
      .filter(x => x !== undefined);
  }

  /**
   * Serializes a [Acquisition] to its RWPM JSON representation.
   */
  public serialize(): any {
    const json: any = { type: this.type };
    if (this.children) {
      json.children = this.children.map(x => x.serialize());
    }
    return json;
  }
}
