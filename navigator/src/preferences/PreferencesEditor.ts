import { ConfigurablePreferences } from "./Configurable";

export interface IPreferencesEditor {
  preferences: ConfigurablePreferences<unknown>;
  clear(): void;
}