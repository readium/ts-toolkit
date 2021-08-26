/* Copyright 2021 Readium Foundation. All rights reserved.
 * Use of this source code is governed by a BSD-style license,
 * available in the LICENSE file present in the Github repository of the project.
 */

import { ReadiumCss, ColumnCountType, HyphenType } from '../src';

describe('Readium Css Tests', () => {
  it('test', async () => {
    let readium = new ReadiumCss({
      columnCountType: ColumnCountType.OneColumn,
      hyphens: HyphenType.Auto,
    });

    let css = readium.toCss();

    expect(css).toEqual(
      '--USER__colCount: 1; --USER__bodyHyphens: auto; --USER__advancedSettings: readium-advanced-on; '
    );
  });
});
