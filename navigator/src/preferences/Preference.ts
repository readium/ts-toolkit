export interface Preference<T> {
  /**
   * The current value of the preference.
   */
  value: T | null;

  /**
   * The value that will be effectively used by the Configurable object if preferences are submitted as they are.
   */
  effectiveValue: T;

  /**
   * Indicates if this preference will be effectively used by the Configurable object if preferences are submitted as they are.
   */
  isEffective: boolean;

  /**
   * Set the preference to the specified value.
   * A null value means unsetting the preference.
   * @param value The new value of the preference.
   */
  set(value: T | null): void;

  /**
   * Unset the preference.
   * Equivalent to set(null).
   */
  clear(): void;
}

export interface BooleanPreference extends Preference<boolean> {
  /**
   * Toggle the preference to its opposite value.
   */
  toggle(): void;
}

export interface EnumPreference<T> extends Preference<T> {
  /**
   * The possible values for this preference.
   */
  supportedValues: T[];
}

export interface RangePreference<T> extends Preference<T> {
  /**
   * The supported range for this preference.
   */
  supportedRange: [T, T];

  /**
   * Increase the preference value.
   */
  increment(): void;

  /**
   * Decrease the preference value.
   */
  decrement(): void;

  /**
   * Format the preference value as a string.
   * @param value The value to format.
   */
  format(value: T): string;
}