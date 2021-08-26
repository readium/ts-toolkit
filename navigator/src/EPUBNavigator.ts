/* Copyright 2021 Readium Foundation. All rights reserved.
 * Use of this source code is governed by a BSD-style license,
 * available in the LICENSE file present in the Github repository of the project.
 */

import { Locator, Publication } from '@readium/shared';
import { IVisualNavigatorDelegate, VisualNavigator } from './VisualNavigator';

export interface EPUBNavigatorDelegate extends IVisualNavigatorDelegate {}

export abstract class EPUBNavigator extends VisualNavigator {
  public delegate?: EPUBNavigatorDelegate;

  public publication: Publication;

  public initialLocation?: Locator;

  //TODO : userSettings: UserSettings
  constructor(publication: Publication, initialLocation?: Locator) {
    super();
    this.publication = publication;
    this.initialLocation = initialLocation;
  }
}
