/* Copyright 2021 Readium Foundation. All rights reserved.
 * Use of this source code is governed by a BSD-style license,
 * available in the LICENSE file present in the Github repository of the project.
 */

import { BooleanSetting } from './BooleanSetting';
import { NumericSetting } from './NumericSetting';
import { PresentationSettingTypes } from './PresentationSettingTypes';
import { SelectionSetting } from './SelectionSetting';
import { IRequiredSettingValue, ISetting, SettingChanged } from './Setting';
import { StringSetting } from './StringSetting';

export class PresentationSettings {
  public readonly items: Map<string, ISetting<any>>;

  public OnSettingChange?: SettingChanged<any>;

  constructor() {
    this.items = new Map<string, ISetting<any>>();
  }

  public getSetting(name: string): ISetting<any> | undefined {
    return this.items.get(name);
  }

  public static deserialize(json: any): PresentationSettings {
    const presentationSettings = new PresentationSettings();

    Object.entries(json).forEach(([k, v]) => {
      const settingJson: any = v;
      if (settingJson.type) {
        switch (settingJson.type) {
          case PresentationSettingTypes.string:
            presentationSettings.deserializeStringSetting(k, settingJson);
            break;
          case PresentationSettingTypes.selection:
            presentationSettings.deserializeSelectionSetting(k, settingJson);
            break;
          case PresentationSettingTypes.boolean:
            presentationSettings.deserializeBooleanSetting(k, settingJson);
            break;
          case PresentationSettingTypes.numeric:
            presentationSettings.deserializeNumericSetting(k, settingJson);
            break;
        }
      }
    });

    return presentationSettings;
  }

  private desrializeRequiredSettings(requiredSettings?: {
    [key: string]: any;
  }): IRequiredSettingValue<any>[] | undefined {
    return requiredSettings
      ? Object.entries(requiredSettings).map(
          ([k, v]) =>
            ({
              setting: this.items.get(k),
              value: v,
            } as IRequiredSettingValue<any>)
        )
      : undefined;
  }

  private deserializeStringSetting(name: string, json: any) {
    const setting = new StringSetting({
      description: json.description ?? '',
      value: json.value,
      defaultValue: json.defaultValue,
      requiredSettings: this.desrializeRequiredSettings(json.requiredSettings),
      additionalSettings: json.additionalSettings,
    });
    setting.OnSettingChange = this.SettingChanged.bind(this);
    this.items.set(name, setting);
  }

  private deserializeSelectionSetting(name: string, json: any) {
    const setting = new SelectionSetting(
      {
        description: json.description ?? '',
        value: json.value,
        defaultValue: json.defaultValue,
        requiredSettings: this.desrializeRequiredSettings(
          json.requiredSettings
        ),
        additionalSettings: json.additionalSettings,
      },
      new Map(Object.entries(json.items))
    );
    setting.OnSettingChange = this.SettingChanged.bind(this);
    this.items.set(name, setting);
  }

  private deserializeBooleanSetting(name: string, json: any) {
    const setting = new BooleanSetting({
      description: json.description ?? '',
      value: json.value,
      defaultValue: json.defaultValue,
      requiredSettings: this.desrializeRequiredSettings(json.requiredSettings),
      additionalSettings: json.additionalSettings,
    });

    setting.OnSettingChange = this.SettingChanged.bind(this);
    this.items.set(name, setting);
  }

  private deserializeNumericSetting(name: string, json: any) {
    const setting = new NumericSetting(
      {
        description: json.description ?? '',
        value: json.value,
        defaultValue: json.defaultValue,
        requiredSettings: this.desrializeRequiredSettings(
          json.requiredSettings
        ),
        additionalSettings: json.additionalSettings,
      },
      isNaN(json.minValue) ? 0 : json.minValue,
      isNaN(json.maxValue) ? 0 : json.maxValue,
      isNaN(json.stepValue) ? 0 : json.stepValue,
      json.unit
    );

    setting.OnSettingChange = this.SettingChanged.bind(this);
    this.items.set(name, setting);
  }

  private SettingChanged(setting: ISetting<any>, prev: any) {
    if (this.OnSettingChange) {
      this.OnSettingChange(setting, prev);
    }
  }
}
