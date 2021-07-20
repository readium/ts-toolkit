export declare type LoadSetting = (key: string) => Promise<any>;
export declare type SaveSetting = (key: string, value: any) => Promise<void>;
export declare type DeleteSetting = (key: string) => Promise<void>;

/**
 * General purpose settings class
 * with attachable event for savei load and delete setting
 */
export class Settings {
  public settings: Map<string, any>;

  public onLoadSetting?: LoadSetting;
  public onSaveSetting?: SaveSetting;
  public onDeleteSetting?: DeleteSetting;

  constructor() {
    this.settings = new Map<string, any>();
  }

  public async getSetting(key: string): Promise<any> {
    if (!this.settings.has(key)) {
      if (this.onLoadSetting) {
        const value = await this.onLoadSetting(key);
        this.settings.set(key, value);
        return value;
      } else {
        return;
      }
    } else {
      return this.settings.get(key);
    }
  }

  public async setSetting(key: string, value: any): Promise<void> {
    const store =
      !this.settings.has(key) ||
      JSON.stringify(this.settings.get(key)) !== JSON.stringify(value);
    this.settings.set(key, value);
    if (store && this.onSaveSetting) {
      await this.onSaveSetting(key, value);
    }
  }

  public async deleteSetting(key: string): Promise<void> {
    if (this.settings.has(key)) {
      this.settings.delete(key);
      if (this.onDeleteSetting) {
        await this.onDeleteSetting(key);
      }
    }
  }
}
