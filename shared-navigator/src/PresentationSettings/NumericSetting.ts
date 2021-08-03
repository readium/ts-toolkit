import { ISettingsConfig } from './ISetting';
import { Setting } from './Setting';

export class NumericSetting extends Setting<number> {
  public readonly minValue: number;
  public readonly maxValue: number;
  public readonly stepValue: number;
  public readonly unit?: string;

  constructor(
    config: ISettingsConfig<number>,
    minValue: number,
    maxValue: number,
    stepValue: number,
    unit?: string
  ) {
    super(config);
    this.minValue = minValue;
    this.maxValue = maxValue;
    this.stepValue = stepValue;
    this.unit = unit;
  }

  public getCssValue(): string {
    return this.getEffectiveValue() + (this.unit || '');
  }

  public incrementValue() {
    let value = this.getEffectiveValue();
    if (value) {
      value += this.stepValue;
      value = value > this.maxValue ? this.maxValue : value;
      this.value = value;
    }
  }

  public decrementValue() {
    let value = this.getEffectiveValue();
    if (value) {
      value -= this.stepValue;
      value = value < this.minValue ? this.minValue : value;
      this.value = value;
    }
  }
}
