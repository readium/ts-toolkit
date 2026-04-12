import { ConfigurablePreferences } from "./Configurable.ts";

export interface IPreferencesEditor {
  preferences: ConfigurablePreferences;
  clear(): void;
}
