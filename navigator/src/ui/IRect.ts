/* Copyright 2021 Readium Foundation. All rights reserved.
 * Use of this source code is governed by a BSD-style license,
 * available in the LICENSE file present in the Github repository of the project.
 */

import { IPoint } from './IPoint';
import { ISize } from './ISize';

export interface IRect {
  origin?: IPoint;

  size?: ISize;
}
