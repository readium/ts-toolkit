/* Copyright 2021 Readium Foundation. All rights reserved.
 * Use of this source code is governed by a BSD-style license,
 * available in the LICENSE file present in the Github repository of the project.
 */

import { datefromJSON } from '../util/JSONParse';

export enum AvailabilityStatus {
  available = 'available',
  reserved = 'reserved',
  ready = 'ready',
}

/**
 * Indicated the availability of a given resource.
 *
 * https://drafts.opds.io/schema/properties.schema.json
 *
 */
export class Availability {
  /**Timestamp for the previous state change. */
  public since?: Date;

  /**Timestamp for the next state change. */
  public until?: Date;

  public state: AvailabilityStatus;

  /** Creates a [Availability]. */
  constructor(values: {
    state: AvailabilityStatus;
    since?: Date;
    until?: Date;
  }) {
    this.state = values.state;
    this.since = values.since;
    this.until = values.until;
  }

  /**
   * Parses a [Availability] from its RWPM JSON representation.
   */
  public static deserialize(json: any): Availability | undefined {
    if (!(json && json.state)) return;
    return new Availability({
      state: json.state,
      since: datefromJSON(json.since),
      until: datefromJSON(json.until),
    });
  }

  /**
   * Serializes a [Availability] to its RWPM JSON representation.
   */
  public serialize(): any {
    const json: any = { state: this.state };
    if (this.since !== undefined) json.since = this.since.toISOString();
    if (this.until !== undefined) json.until = this.until.toISOString();
    return json;
  }
}
