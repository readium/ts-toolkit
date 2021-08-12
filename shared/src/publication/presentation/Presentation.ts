/* Copyright 2021 Readium Foundation. All rights reserved.
 * Use of this source code is governed by a BSD-style license,
 * available in the LICENSE file present in the Github repository of the project.
 */

import { EPUBLayout } from '../epub/EPUBLayout';

/**
 * Suggested orientation for the device when displaying the linked resource.
 */
export enum Orientation {
  auto = 'auto',
  landscape = 'landscape',
  portrait = 'portrait',
}

/**
 * Suggested method for handling overflow while displaying the linked resource.
 */
export enum Overflow {
  auto = 'auto',
  clipped = 'clipped',
  paginated = 'paginated',
  scrolled = 'scrolled',
}

/**
 * Indicates how the linked resource should be displayed in a reading environment that displays
 * synthetic spreads.
 */
export enum Page {
  left = 'left',
  right = 'right',
  center = 'center',
}

/**
 * Indicates the condition to be met for the linked resource to be rendered within a synthetic
 * spread.
 */
export enum Spread {
  auto = 'auto',
  both = 'both',
  none = 'none',
  landscape = 'landscape',
}

/**
 * Suggested method for constraining a resource inside the viewport.
 */
export enum Fit {
  contain = 'contain',
  cover = 'cover',
  width = 'width',
  height = 'height',
}

// export interface IPresentationMetadata {
//   clipped?: boolean;
//   continuous?: boolean;
//   fit?: Fit;
//   orientation?: Orientation;
//   overflow?: Overflow;
//   spread?: Spread;
//   layout?: EpubLayout;
// }

/** The Presentation Hints extension defines a number of hints for User Agents about the way content
 *  should be presented to the user.
 *
 *  https://readium.org/webpub-manifest/extensions/presentation.html
 *  https://readium.org/webpub-manifest/schema/extensions/presentation/metadata.schema.json
 *
 *  These properties can be undefined to avoid having default values when it doesn't make sense for a
 *  given `Publication`. If a navigator needs a default value when not specified,
 *  `Presentation.defaultX` and `Presentation.X.default` can be used.
 */
export class Presentation {
  /** Specifies whether or not the parts of a linked resource that flow out of the viewport are clipped */
  public clipped?: boolean;

  /** Suggested method for constraining a resource inside the viewport. */
  public fit?: Fit;

  /** Suggested orientation for the device when displaying the linked resource. */
  public orientation?: Orientation;

  /** Indicates the condition to be met for the linked resource to be rendered
   *  within a synthetic spread
   */
  public spread?: Spread;

  /** Hint about the nature of the layout for the linked resources (EPUB extension). */
  public layout?: EPUBLayout;

  /** Indicates how the progression between resources from the [readingOrder] should be handled */
  public continuous?: boolean;

  /** Indicates if the overflow of linked resources from the `readingOrder` or `resources` should
   *  be handled using dynamic pagination or scrolling.
   */
  public overflow?: Overflow;

  /** Creates a [Presentation]. */
  constructor(values: {
    clipped?: boolean;
    continuous?: boolean;
    fit?: Fit;
    orientation?: Orientation;
    overflow?: Overflow;
    spread?: Spread;
    layout?: EPUBLayout;
  }) {
    this.clipped = values.clipped;
    this.fit = values.fit;
    this.orientation = values.orientation;
    this.spread = values.spread;
    this.layout = values.layout;
    this.continuous = values.continuous;
    this.overflow = values.overflow;
  }

  /**
   * Parses a [Presentation] from its RWPM JSON representation.
   *
   */
  public static deserialize(json: any): Presentation | undefined {
    if (!json) return;

    return new Presentation({
      clipped: json.clipped,
      continuous: json.continuous,
      fit: json.fit,
      orientation: json.orientation,
      overflow: json.overflow,
      spread: json.spread,
      layout: json.layout,
    });
  }

  /**
   * Serializes a [Presentation] to its RWPM JSON representation.
   */
  public serialize(): any {
    const json: any = {};
    if (this.clipped !== undefined) json.clipped = this.clipped;
    if (this.continuous !== undefined) json.continuous = this.continuous;
    if (this.fit !== undefined) json.fit = this.fit;
    if (this.orientation !== undefined) json.orientation = this.orientation;
    if (this.overflow !== undefined) json.overflow = this.overflow;
    if (this.spread !== undefined) json.spread = this.spread;
    if (this.layout !== undefined) json.layout = this.layout;
    return json;
  }
}
