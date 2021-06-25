/* Copyright 2020 Readium Foundation. All rights reserved.
 * Use of this source code is governed by a BSD-style license,
 * available in the LICENSE file present in the Github repository of the project.
 */

import { Page } from './presentation/Presentation';

export enum ReadingProgression {
  auto = 'auto',
  btt = 'btt',
  ltr = 'ltr',
  rtl = 'rtl',
  ttb = 'ttb',
}

// Note: Babel doesn’t really like that at all so disabling for the time being
// export namespace ReadingProgression {
export function leadingPage(readingProgression: ReadingProgression): Page {
  switch (readingProgression) {
    case ReadingProgression.auto:
    case ReadingProgression.ttb:
    case ReadingProgression.ltr:
      return Page.left;
    case ReadingProgression.rtl:
    case ReadingProgression.btt:
      return Page.right;
    default:
      return Page.left;
  }
}
// }
