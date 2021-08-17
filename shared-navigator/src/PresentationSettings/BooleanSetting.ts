/* Copyright 2021 Readium Foundation. All rights reserved.
 * Use of this source code is governed by a BSD-style license,
 * available in the LICENSE file present in the Github repository of the project.
 */

import { ISettingsConfig, Setting } from './Setting';

export class BooleanSetting extends Setting<boolean> {
  public readonly trueValue: any;
  public readonly falseValue: any;

  constructor(
    config: ISettingsConfig<boolean>,
    trueValue: any = 'true',
    falseValue: any = 'false'
  ) {
    super(config);
    this.trueValue = trueValue;
    this.falseValue = falseValue;
  }

  public getCssValue(): string {
    return this.getEffectiveValue() ? this.trueValue : this.falseValue;
  }
}
