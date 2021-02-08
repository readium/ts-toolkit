/* Copyright 2020 Readium Foundation. All rights reserved.
 * Use of this source code is governed by a BSD-style license,
 * available in the LICENSE file present in the Github repository of the project.
 */

import { ILink } from "./Link";
import { ILocalizedString } from "./LocalizedString";

/** https://github.com/readium/webpub-manifest/tree/master/contexts/default#subjects */
export interface Subject {
  name: string | ILocalizedString;
  sortAs?: string;
  code?: string;
  scheme?: string;
  links?: Array<ILink>;
}