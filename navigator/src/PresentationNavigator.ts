/* Copyright 2021 Readium Foundation. All rights reserved.
 * Use of this source code is governed by a BSD-style license,
 * available in the LICENSE file present in the Github repository of the project.
 */

import { PresentationSettings } from './presentation';
import { PresentationProperties } from './presentation/PresentationProperties';

/*
 * A Navigator whose presentation can be customized with app-provided settings.
 */
export interface IPresentationNavigator {
  /**
   * Current values for the Presentation Properties and their metadata.
   */
  presentation: PresentationProperties;

  /**
   * Submits a new set of Presentation Settings used by the Navigator to recompute its Presentation Properties.
   */
  apply(setting: PresentationSettings): void;
}
