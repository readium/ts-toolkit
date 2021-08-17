/* Copyright 2021 Readium Foundation. All rights reserved.
 * Use of this source code is governed by a BSD-style license,
 * available in the LICENSE file present in the Github repository of the project.
 */

import { Appearance } from './Appearance';
import { ColumnCountType } from './ColumnCountType';
import { HyphenType } from './HyphenType';
import { TextAlign } from './TextAlign';
import { View } from './View';

export interface ReadiumCssSettings {
  columnCountType?: ColumnCountType;
  hyphens?: HyphenType;
  fontSize?: number;
  fontFamily?: string;
  appearance?: Appearance;
  view?: View;
  textAlign?: TextAlign;
  wordSpacing?: number;
  letterSpacing?: number;
  pageMargins?: number;
  lineHeight?: number;
  accessibility?: boolean;
  backgroundColor?: string;
  textColor?: string;
  typeScale?: number;
  paragraphSpacing?: number;
  paragraphIndent?: number;
}
