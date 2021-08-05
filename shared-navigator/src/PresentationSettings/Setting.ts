export declare type SettingChanged<T> = (
  setting: ISetting<T>,
  previousValue?: T
) => void;

export interface IRequiredSettingValue<T> {
  setting: ISetting<T>;
  value?: T;
}

export interface ISetting<T> {
  value?: T;
  defaultValue?: T;
  desciption: string;
  requiredSettings?: Array<IRequiredSettingValue<T>>;
  getEffectiveValue(): T | undefined;
  reset(): void;
  OnSettingChange?: SettingChanged<T>;
  isDefault(): boolean;
}

export interface ISettingsConfig<T> {
  desciption: string;
  value?: T;
  defaultValue?: T;
  requiredSettings?: Array<IRequiredSettingValue<any>>;
}

export abstract class Setting<T extends Object> implements ISetting<T> {
  private _value?: T;
  public get value(): T | undefined {
    return this._value;
  }
  public set value(v: T | undefined) {
    const previousValue = this.value;
    this._value = v;

    this.requiredSettings?.forEach(
      reqSet => (reqSet.setting.value = reqSet.value)
    );

    if (this.OnSettingChange) {
      this.OnSettingChange(this, previousValue);
    }
  }

  public readonly defaultValue?: T;

  public readonly desciption: string;

  public readonly requiredSettings?: Array<IRequiredSettingValue<any>>;

  public OnSettingChange?: SettingChanged<T>;

  constructor(config: ISettingsConfig<T>) {
    this.desciption = config.desciption;
    this.defaultValue = config.defaultValue;
    this.value = config.value;
    this.requiredSettings = config.requiredSettings;
  }

  public isDefault(): boolean {
    return this.value === undefined || this.value === this.defaultValue;
  }

  public reset() {
    this.value = undefined;
  }

  public getEffectiveValue(): T | undefined {
    const requiredSetting =
      !this.requiredSettings ||
      this.requiredSettings?.reduce<boolean>(
        (p, c) => p && c.setting.getEffectiveValue() === c.value,
        true
      );
    return requiredSetting
      ? this.value || this.defaultValue
      : this.defaultValue;
  }
}
