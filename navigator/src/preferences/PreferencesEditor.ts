import { ConfigurablePreferences } from "./Configurable.ts";

export interface IPreferencesEditor {
  preferences: ConfigurablePreferences<unknown>;
  clear(): void;
}
