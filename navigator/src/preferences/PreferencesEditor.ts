import { ConfigurablePreferences } from "./Configurable";

export interface IPreferencesEditor {
  preferences: ConfigurablePreferences;
  clear(): void;
}