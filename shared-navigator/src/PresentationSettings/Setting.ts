import { IRequiredSetting, ISetting, ISettingsConfig } from './ISetting';

export abstract class Setting<T extends Object> implements ISetting {
  public value?: T;
  public readonly defaultValue?: T;
  public readonly initialValue?: T;

  public readonly cssName: string;
  public readonly desciption: string;

  public readonly requiredSettings?: Array<IRequiredSetting>;

  constructor(config: ISettingsConfig<T>) {
    this.desciption = config.desciption;
    this.cssName = config.cssName;
    this.defaultValue = config.defaultValue;
    this.value = config.value;
    this.initialValue = config.initialValue;
    this.requiredSettings = config.requiredSettings;
    this.setRequiredSettings();
  }

  public reset() {
    this.value = undefined;
  }

  public getEffectiveValue(): T | undefined {
    const requiredSetting =
      !this.requiredSettings ||
      this.requiredSettings?.reduce<boolean>(
        (p, c) => p && (c.value === undefined || c.value),
        true
      );
    return requiredSetting
      ? this.value || this.initialValue || this.defaultValue
      : this.defaultValue;
  }

  public getCssValue(): string {
    return this.getEffectiveValue()?.toString() || 'undefined';
  }

  private setRequiredSettings() {
    this.requiredSettings?.forEach(x => x.linkDependentSetting(this));
  }

  public applyCss(): boolean {
    return this.getEffectiveValue() !== this.defaultValue;
  }
}
