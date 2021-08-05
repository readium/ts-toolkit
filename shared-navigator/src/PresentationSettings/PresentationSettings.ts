import { BooleanSetting } from './BooleanSetting';
import { NumericSetting } from './NumericSetting';
import { SelectionSetting } from './SelectionSetting';
import { ISetting } from './Setting';

export enum Enum1 {
  val1 = '1',
  val2 = '2',
  val3 = '3',
}

export interface PresentationSettingsConfig {
  setting1?: Enum1;
  setting2?: number;
  requiredSetting1?: boolean;
}

export class PresentationSettings {
  public readonly setting1: SelectionSetting<Enum1>;
  public readonly setting2: NumericSetting;
  public readonly requiredSetting1: BooleanSetting;

  constructor(values: PresentationSettingsConfig) {
    this.setting1 = new SelectionSetting<Enum1>(
      {
        desciption: 'Setting1',
        value: values.setting1,
        defaultValue: Enum1.val3,
      },
      new Map(Object.entries(Enum1))
    );

    this.setting1.OnSettingChange = (setting: ISetting<any>, prev: any) => {
      //apply settings
      //...
      //...
      console.log(setting.desciption + ' : ' + prev + ' => ' + setting.value);
    };

    this.requiredSetting1 = new BooleanSetting(
      {
        desciption: 'Required Settings1',
        value: values.requiredSetting1,
        defaultValue: false,
      },
      'on',
      'off'
    );

    this.requiredSetting1.OnSettingChange = (
      setting: ISetting<any>,
      prev: any
    ) => {
      //apply settings
      //...
      //...
      console.log(setting.desciption + ' : ' + prev + ' => ' + setting.value);
    };

    this.setting2 = new NumericSetting(
      {
        desciption: 'Setting2',
        value: values.setting2,
        defaultValue: 100,
        requiredSettings: [{ setting: this.requiredSetting1, value: true }],
      },
      100,
      300,
      25,
      '%'
    );

    this.setting2.OnSettingChange = (setting: ISetting<any>, prev: any) => {
      //apply settings
      //...
      //...
      console.log(setting.desciption + ' : ' + prev + ' => ' + setting.value);
    };
  }
}
