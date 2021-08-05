import { ISettingsConfig, Setting } from './Setting';

export class SelectionSetting<T> extends Setting<T> {
  public readonly items: Map<string, T>;

  constructor(config: ISettingsConfig<T>, items: Map<string, T>) {
    super(config);
    this.items = items;
  }
}
