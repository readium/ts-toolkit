/* Copyright 2021 Readium Foundation. All rights reserved.
 * Use of this source code is governed by a BSD-style license,
 * available in the LICENSE file present in the Github repository of the project.
 */

import { positiveNumberfromJSON } from '../util/JSONParse';

/**
 * The price of a publication in an OPDS link.
 *
 * https://drafts.opds.io/schema/properties.schema.json
 *
 * currency Currency for the price, eg. EUR.
 * value Price value, should only be used for display purposes, because of precision issues
 *     inherent with Double and the JSON parsing.
 */
export class Price {
  /** Currency for the price, eg. EUR. */
  public currency: string;

  /** Price value, should only be used for display purposes, because of precision issues
   *    inherent with Double and the JSON parsing. */
  public value: number;

  /** Creates a [Price]. */
  constructor(values: { currency: string; value: number }) {
    this.currency = values.currency;
    this.value = values.value;
  }

  /**
   * Parses a [Price] from its RWPM JSON representation.
   */
  public static deserialize(json: any): Price | undefined {
    if (!json) return;
    let currency = json.currency;
    if (!(currency && typeof currency === 'string' && currency.length > 0))
      return;
    let value = positiveNumberfromJSON(json.value);
    if (value === undefined) return;
    return new Price({ currency, value });
  }

  /**
   * Serializes a [Price] to its RWPM JSON representation.
   */
  public serialize(): any {
    const json: any = { currency: this.currency, value: this.value };
    return json;
  }
}
