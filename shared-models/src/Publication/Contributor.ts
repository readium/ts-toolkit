/* Copyright 2020 Readium Foundation. All rights reserved.
 * Use of this source code is governed by a BSD-style license,
 * available in the LICENSE file present in the Github repository of the project.
 */

import { ILink } from "./Link";
import { ILocalizedString } from "./LocalizedString";

/** https://readium.org/webpub-manifest/schema/contributor-object.schema.json */
export interface IContributor {

  /** The name of the contributor. */
  name: string | ILocalizedString;

  /** The string used to sort the name of the contributor. */
  sortAs?: string;

  /** An unambiguous reference to this contributor. */
  identifier?: string;

  /** The role of the contributor in the publication making. */
  role?: Array<string>;

  /** Used to retrieve similar publications for the given contributor. */
  links?: Array<ILink>;

  /** The position of the publication in this collection/series, when the contributor represents a collection. */
  position?: number;
}