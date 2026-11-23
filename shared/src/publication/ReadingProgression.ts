/* Copyright 2021 Readium Foundation. All rights reserved.
 * Use of this source code is governed by a BSD-style license,
 * available in the LICENSE file present in the Github repository of the project.
 */

import { Page } from "./Properties.ts";

export enum ReadingProgression {
  ltr = 'ltr',
  rtl = 'rtl',
}

/**
 * Primary language subtags of languages written right to left.
 * https://github.com/readium/readium-css/blob/develop/docs/CSS16-internationalization.md#missing-page-progression-direction
 */
export const RTL_LANGUAGES: ReadonlySet<string> = new Set([
  'ar', 'fa', 'per', 'fas', 'he', 'iw', 'yi', 'ur', 'ps', 'sd', 'ckb', 'ug', 'dv', 'syr',
]);

export function leadingPage(readingProgression: ReadingProgression): Page {
  return readingProgression === ReadingProgression.rtl ? Page.right : Page.left;
}
