import { ConfigurablePreferences } from "./Configurable";

export interface PreferencesEditor {
  preferences: ConfigurablePreferences;
  clear(): void;
}