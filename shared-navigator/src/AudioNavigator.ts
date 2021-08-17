/* Copyright 2021 Readium Foundation. All rights reserved.
 * Use of this source code is governed by a BSD-style license,
 * available in the LICENSE file present in the Github repository of the project.
 */

import { Locator, Publication } from '@readium/shared';
import { IMediaNavigatorDelegate, MediaNavigator } from './MediaNavigator';

export interface AudioNavigatorDelegate extends IMediaNavigatorDelegate {}

export abstract class AudioNavigator extends MediaNavigator {
  public delegate?: AudioNavigatorDelegate;

  public publication: Publication;

  public initialLocation?: Locator;

  constructor(publication: Publication, initialLocation?: Locator) {
    super();
    this.publication = publication;
    this.initialLocation = initialLocation;
  }
}
