export interface ConfigurableSettings {
  [key: string]: any;
}

export interface ConfigurablePreferences {
  merging(other: ConfigurablePreferences): ConfigurablePreferences;
}

export interface Configurable<S extends ConfigurableSettings, P extends ConfigurablePreferences> {
  settings: S;
  submitPreferences(preferences: P): void;
}