/* Copyright 2020 Readium Foundation. All rights reserved.
 * Use of this source code is governed by a BSD-style license,
 * available in the LICENSE file present in the Github repository of the project.
 */

import { EPUBLayout } from "../epub/Layout";
import { Link } from "../Link";

export type Orientation = "auto" | "landscape" | "portrait";
export type Overflow = "auto" | "clipped" | "paginated" | "scrolled";
export type Page = "left" | "right" | "center";
export type Spread = "auto" | "both" | "none" | "landscape";
export type Fit = "contain" | "cover" | "width" | "height";

export interface IPresentationMetadata {
  clipped?: boolean;
  continuous?: boolean;
  fit?: Fit;
  orientation?: Orientation;
  overflow?: Overflow;
  spread?: Spread;
  layout?: EPUBLayout;
}

/** The Presentation Hints extension defines a number of hints for User Agents about the way content
 *  should be presented to the user.
 * 
 *  https://readium.org/webpub-manifest/extensions/presentation.html
 *  https://readium.org/webpub-manifest/schema/extensions/presentation/metadata.schema.json
 * 
 *  These properties are nullable to avoid having default values when it doesn't make sense for a
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

  constructor(presentation: IPresentationMetadata) {
    this.clipped = presentation.clipped;
    this.fit = presentation.fit;
    this.orientation = presentation.orientation;
    this.spread = presentation.spread;
    this.layout = presentation.layout;
    this.continuous = presentation.continuous;
    this.overflow = presentation.overflow;
  }

  /** Determines the layout of the given resource in this publication.
   *  Default layout is reflowable.
   */
  public layoutOf(link: Link): EPUBLayout {
    let result = EPUBLayout.reflowable;
    if (link.properties && (link.properties.getLayout() !== null)) {
      result = link.properties.getLayout() as EPUBLayout;
    } else if (this.layout) {
      result = this.layout;
    }
    return result;
  }
}