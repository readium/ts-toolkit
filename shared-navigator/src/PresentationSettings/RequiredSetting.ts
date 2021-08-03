import { BooleanSetting } from './BooleanSetting';
import { IRequiredSetting, ISetting } from './ISetting';

export class RequiredSetting extends BooleanSetting
  implements IRequiredSetting {
  private readonly dependentSettings = new Array<ISetting>();

  public linkDependentSetting(setting: ISetting) {
    this.dependentSettings.push(setting);
  }

  public getEffectiveValue(): boolean | undefined {
    const effectiveValue = super.getEffectiveValue();
    return (
      effectiveValue ||
      this.dependentSettings.reduce<boolean>(
        (previous, current) =>
          previous || current.getEffectiveValue() !== current.defaultValue,
        false
      )
    );
  }
}
