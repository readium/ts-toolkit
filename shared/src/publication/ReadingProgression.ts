/* Copyright 2021 Readium Foundation. All rights reserved.
 * Use of this source code is governed by a BSD-style license,
 * available in the LICENSE file present in the Github repository of the project.
 */

import { Page } from "./Properties";

export enum ReadingProgression {
  ltr = 'ltr',
  rtl = 'rtl',
}

export function leadingPage(readingProgression: ReadingProgression): Page {
  return readingProgression === ReadingProgression.rtl ? Page.right : Page.left;
}
