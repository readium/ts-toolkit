export interface IPreference<T> {
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
   * Unset the preference.
   * Equivalent to set(null).
   */
  clear(): void;
}

export interface IBooleanPreference extends IPreference<boolean> {
  /**
   * Toggle the preference to its opposite value.
   */
  toggle(): void;
}

export interface IEnumPreference<T> extends IPreference<T> {
  /**
   * The possible values for this preference.
   */
  supportedValues: T[];
}

export interface IRangePreference<T> extends IPreference<T> {
  /**
   * The supported range [min, max] for this preference.
   */
  supportedRange: [T, T];

  /**
   * The step value for the incrementing/decrementing into the range.
   */
  step: number;

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
   */
  format(value: T): string;
}

export class Preference<T> implements Preference<T> {
  protected _value: T | null;
  protected readonly _effectiveValue: T;
  protected readonly _isEffective: boolean;

  constructor({
    initialValue = null, 
    effectiveValue, 
    isEffective
  } : { 
    initialValue: T | null, 
    effectiveValue: T, 
    isEffective: boolean 
  }) {
    this._value = initialValue;
    this._effectiveValue = effectiveValue;
    this._isEffective = isEffective;
  }

  get value(): T | null {
    return this._value;
  }

  set value(value: T | null) {
    this._value = value;
  }

  get effectiveValue(): T {
    return this._effectiveValue;
  }

  get isEffective(): boolean {
    return this._isEffective;
  }

  clear(): void {
    this._value = null;
  }
}

export class BooleanPreference extends Preference<boolean> implements IBooleanPreference {
  toggle(): void {
    this._value = !this._value;
  }
}

export class EnumPreference<T extends string | number | symbol> extends Preference<T> implements IEnumPreference<T> {
  private readonly _supportedValues: T[];

  constructor({
      initialValue = null, 
      effectiveValue, 
      isEffective,
      supportedValues
    } : { 
      initialValue: T | null, 
      effectiveValue: T, 
      isEffective: boolean,
      supportedValues: T[]
    }) {
    super({ initialValue, effectiveValue, isEffective });
    this._supportedValues = supportedValues;
  }

  set value(value: T | null) {
    if (value !== null && !this._supportedValues.includes(value)) {
      throw new Error(`Value '${ String(value) }' is not in the supported values for this preference.`);
    }
    this._value = value;
  }

  get supportedValues(): T[] {
    return this._supportedValues;
  }
}

export class RangePreference<T extends number> extends Preference<T> implements IRangePreference<T> {
  private readonly _supportedRange: [T, T];
  private readonly _step: number;

  constructor(
    {
      initialValue = null, 
      effectiveValue, 
      isEffective,
      supportedRange,
      step
    } : { 
      initialValue: T | null, 
      effectiveValue: T, 
      isEffective: boolean,
      supportedRange: [T, T],
      step: number 
    }
  ) {
    super({ initialValue, effectiveValue, isEffective });
    this._supportedRange = supportedRange;
    this._step = step;
  }

  set value(value: T | null) {
    if (value !== null && (value < this._supportedRange[0] || value > this._supportedRange[1])) {
      throw new Error(`Value '${ String(value) }' is out of the supported range for this preference.`);
    }
    this._value = value;
  }

  get supportedRange(): [T, T] {
    return this._supportedRange;
  }

  get step(): number {
    return this._step;
  }

  increment(): void {
    if (this._value !== null && this._value < this._supportedRange[1]) {
      this._value = Math.min(this._value + this._step, this._supportedRange[1]) as T;
    }
  }

  decrement(): void {
    if (this._value !== null && this._value > this._supportedRange[0]) {
      this._value = Math.max(this._value - this._step, this._supportedRange[0]) as T;
    }
  }

  format(value: T): string {
    return value.toString();
  }
}