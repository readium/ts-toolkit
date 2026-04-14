import { IPreferencesEditor } from "./PreferencesEditor.ts";

export interface ConfigurableSettings {
  [key: string]: any;
}

export interface ConfigurablePreferences<T> {
  merging(other: T): T;
}

export interface Configurable<ConfigurableSettings, ConfigurablePreferences> {
  settings: ConfigurableSettings;
  submitPreferences(preferences: ConfigurablePreferences): void;
  preferencesEditor: IPreferencesEditor;
}
