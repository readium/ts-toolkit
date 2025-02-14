import { ConfigurablePreferences } from "./Configurable";

export class PreferencesSerializer {
  static serialize(preferences: ConfigurablePreferences): string {
    return JSON.stringify(preferences);
  }

  static deserialize(preferences: ConfigurablePreferences): ConfigurablePreferences | null {
    try {
      const parsedPreferences = JSON.parse(preferences as unknown as string);
      return parsedPreferences as ConfigurablePreferences;
    } catch (error) {
      console.error("Failed to deserialize preferences:", error);
      return null;
    }
  }
}