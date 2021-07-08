/* Copyright 2021 Readium Foundation. All rights reserved.
 * Use of this source code is governed by a BSD-style license,
 * available in the LICENSE file present in the Github repository of the project.
 */

// Presentation extensions for link [Properties]

import { Properties } from '../Properties';
import { Fit, Orientation, Overflow, Page, Spread } from './Presentation';

declare module '../Properties' {
  export interface Properties {
    /**
     * Specifies whether or not the parts of a linked resource that flow out of the viewport are
     * clipped.
     */
    getClipped(): boolean | undefined;

    /**
     * Suggested method for constraining a resource inside the viewport.
     */
    getFit(): Fit | undefined;

    /**
     * Suggested orientation for the device when displaying the linked resource.
     */
    getOrientation(): Orientation | undefined;

    /**
     * Suggested method for handling overflow while displaying the linked resource.
     */
    getOverflow(): Overflow | undefined;

    /**
     * Indicates how the linked resource should be displayed in a reading environment that displays
     * synthetic spreads.
     */
    getPage(): Page | undefined;

    /**
     * Indicates the condition to be met for the linked resource to be rendered within a synthetic
     * spread.
     */
    getSpread(): Spread | undefined;
  }
}

Properties.prototype.getClipped = function(): boolean | undefined {
  return this.otherProperties['clipped'];
};

Properties.prototype.getFit = function(): Fit | undefined {
  return this.otherProperties['fit'];
};

Properties.prototype.getOrientation = function(): Orientation | undefined {
  return this.otherProperties['orientation'];
};

Properties.prototype.getOverflow = function(): Overflow | undefined {
  return this.otherProperties['overflow'];
};

Properties.prototype.getPage = function(): Page | undefined {
  return this.otherProperties['page'] || undefined;
};

Properties.prototype.getSpread = function(): Spread | undefined {
  return this.otherProperties['spread'] || undefined;
};
