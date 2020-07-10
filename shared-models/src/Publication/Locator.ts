/* Copyright 2020 Readium Foundation. All rights reserved.
 * Use of this source code is governed by a BSD-style license,
 * available in the LICENSE file present in the Github repository of the project.
 */

interface ILocatorText {
  after?: string;
  before?: string;
  highlight?: string;
}

interface IDOMRangePoint {
  cssSelector: string;
  textNodeIndex: number;
  charOffset?: number;
}

interface IDOMRange {
  start: IDOMRangePoint;
  end?: IDOMRangePoint;
}

/** One or more alternative expressions of the location.
 *  https://github.com/readium/architecture/tree/master/models/locators#the-location-object
 */
export interface ILocations {
  /** Contains one or more fragment in the resource referenced by the `Locator`. */
  fragments: Array<string>;
  
  /** Progression in the resource expressed as a percentage (between 0 and 1). */
  progression?: number;
  
  /** Progression in the publication expressed as a percentage (between 0 and 1). */
  totalProgression?: number;

  /** An index in the publication. */
  position?: number;

  /** Additional locations for extensions. */
  otherLocations?: {[key: string]: any}

  /** otherLocators currently in use in Thorium/R2D2BC */
  cssSelector?: string;
  partialCfi?: string;
  domRange?: IDOMRange;
}

/** https://github.com/readium/architecture/tree/master/locators */
export interface ILocator {

  /** The URI of the resource that the Locator Object points to. */
  href: string;
  
  /** The media type of the resource that the Locator Object points to. */
  type: string;
  
  /** The title of the chapter or section which is more relevant in the context of this locator. */
  title?: string;
  
  /** One or more alternative expressions of the location. */
  locations: ILocations;
  
  /** Textual context of the locator. */
  text: ILocatorText;
}