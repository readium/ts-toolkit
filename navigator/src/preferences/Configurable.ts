export interface ConfigurableSettings {
  [key: string]: any;
}

export interface ConfigurablePreferences {
  [key: string]: any;
  merging(other: ConfigurablePreferences): ConfigurablePreferences;
}

export interface Configurable<ConfigurableSettings, ConfigurablePreferences> {
  settings: ConfigurableSettings;
  submitPreferences(preferences: ConfigurablePreferences): void;
}