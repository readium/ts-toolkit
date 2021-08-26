/* Copyright 2021 Readium Foundation. All rights reserved.
 * Use of this source code is governed by a BSD-style license,
 * available in the LICENSE file present in the Github repository of the project.
 */

import { Observable } from './Observable';
import { IPresentationProperty } from './PresentationProperty';

/**
 * Holds the current values for the Presentation Properties determining how a publication is rendered by a Navigator
 */
export class PresentationProperties {
  /**
   * Maps each Property Key to the current property value.
   * If a property is null, it means that the Navigator does not support it.
   */
  public properties: Map<string, Observable<IPresentationProperty<any>>>;

  constructor() {
    this.properties = new Map<string, Observable<IPresentationProperty<any>>>();
  }
}
