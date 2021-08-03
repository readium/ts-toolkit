export interface ISetting {
  value?: any;
  initialValue?: any;
  defaultValue?: any;
  cssName: string;
  desciption: string;
  requiredSettings?: Array<IRequiredSetting>;
  getCssValue(): string;
  getEffectiveValue(): any | undefined;
  reset(): void;
  applyCss(): boolean;
}

export interface IRequiredSetting extends ISetting {
  linkDependentSetting(setting: ISetting): void;
}

export interface ISettingsConfig<T> {
  desciption: string;
  cssName: string;
  value?: T;
  initialValue?: T;
  defaultValue?: T;
  requiredSettings?: Array<IRequiredSetting>;
}
