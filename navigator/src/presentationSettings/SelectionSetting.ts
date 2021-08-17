/* Copyright 2021 Readium Foundation. All rights reserved.
 * Use of this source code is governed by a BSD-style license,
 * available in the LICENSE file present in the Github repository of the project.
 */

import { ISettingsConfig, Setting } from './Setting';

export class SelectionSetting extends Setting<string> {
  public readonly items: Map<string, string>;

  constructor(config: ISettingsConfig<string>, items: Map<string, string>) {
    super(config);
    this.items = items;
  }
}
