/* Copyright 2020 Readium Foundation. All rights reserved.
 * Use of this source code is governed by a BSD-style license,
 * available in the LICENSE file present in the Github repository of the project.
 */

export interface ILocalizedString {
   // Todo: this should be a class with a helper getting lang (with fallback)
  [key: string]: string
}