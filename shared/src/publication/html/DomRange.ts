/* Copyright 2021 Readium Foundation. All rights reserved.
 * Use of this source code is governed by a BSD-style license,
 * available in the LICENSE file present in the Github repository of the project.
 */

import { DomRangePoint } from './DomRangePoint';

/**
 * This construct enables a serializable representation of a DOM Range.
 *
 * In a DOM Range object, the startContainer + startOffset tuple represents the [start] boundary
 * point. Similarly, the the endContainer + endOffset tuple represents the [end] boundary point.
 * In both cases, the start/endContainer property is a pointer to either a DOM text node, or a DOM
 * element (this typically depends on the mechanism from which the DOM Range instance originates,
 * for example when obtaining the currently-selected document fragment using the `window.selection`
 * API). In the case of a DOM text node, the start/endOffset corresponds to a position within the
 * character data. In the case of a DOM element node, the start/endOffset corresponds to a position
 * that designates a child text node.
 *
 * Note that [end] field is optional. When only the start field is specified, the domRange object
 * represents a "collapsed" range that has identical [start] and [end] boundary points.
 *
 * https://github.com/readium/architecture/blob/master/models/locators/extensions/html.md#the-domrange-object
 *
 */
export class DomRange {
  /** A serializable representation of the "start" boundary point of the DOM Range. */
  public start: DomRangePoint;

  /** A serializable representation of the "end" boundary point of the DOM Range. */
  public end?: DomRangePoint;

  /**
   * Creates a [DomRange].
   */
  constructor(values: { start: DomRangePoint; end?: DomRangePoint }) {
    this.start = values.start;
    this.end = values.end;
  }

  /**
   * Parses a [DomRange] from its RWPM JSON representation.
   */
  public static deserialize(json: any): DomRange | undefined {
    if (!json) return;
    let start = DomRangePoint.deserialize(json.start);
    if (!start) return;

    return new DomRange({
      start,
      end: DomRangePoint.deserialize(json.end),
    });
  }

  /**
   * Serializes a [DomRange] to its RWPM JSON representation.
   */
  public serialize(): any {
    const json: any = { start: this.start.serialize() };
    if (this.end) json.end = this.end.serialize();
    return json;
  }
}
