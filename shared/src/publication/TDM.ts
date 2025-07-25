/* Copyright 2025 Readium Foundation. All rights reserved.
 * Use of this source code is governed by a BSD-style license,
 * available in the LICENSE file present in the Github repository of the project.
 */

/**
 * https://readium.org/webpub-manifest/contexts/default/#text-and-data-mining
 */

export enum TDMReservation {
  all = 'all',
  none = 'none'
}

export class TDM {
  /**
   * Indicates whether the publication allows text and data mining.
   */
  public readonly reservation?: TDMReservation;

  /**
   * Additional policy information about text and data mining usage.
   */
  public readonly policy?: string;

  /** Creates a [TDM] object */
  constructor(values: {
    reservation?: TDMReservation;
    policy?: string;
  }) {
    this.reservation = values.reservation;
    this.policy = values.policy;
  }

  /**
   * Parses a [TDM] from its RWPM JSON representation.
   */
  public static deserialize(json: any): TDM | undefined {
    if (!json) return;
    
    return new TDM({
      reservation: json.reservation as TDMReservation,
      policy: json.policy,
    });
  }

  /**
   * Serializes a [TDM] to its RWPM JSON representation.
   */
  public serialize(): any {
    const json: any = {};
    if (this.reservation !== undefined) json.reservation = this.reservation;
    if (this.policy !== undefined) json.policy = this.policy;
    return json;
  }
}
