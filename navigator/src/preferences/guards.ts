export function ensureLessThanOrEqual<T extends number | null | undefined>(value: T, compareTo: T): T | undefined {
  if (value === undefined || value === null) {
    return value;
  }
  if (compareTo === undefined || compareTo === null) {
    return value;
  }
  return value <= compareTo ? value : undefined;
}

export function ensureMoreThanOrEqual<T extends number | null | undefined>(value: T, compareTo: T): T | undefined {
  if (value === undefined || value === null) {
    return value;
  }
  if (compareTo === undefined || compareTo === null) {
    return value;
  }
  return value >= compareTo ? value : undefined;
}

export function ensureString(value: string | null | undefined): string | null | undefined {
  if (typeof value === "string") {
    return value;
  } else if (value === null) {
    return null;
  } else {
    return undefined;
  }
}

export function ensureBoolean(value: boolean | null | undefined): boolean | null | undefined {
  return typeof value === "boolean"
    ? value
    : value === undefined || value === null
      ? value
      : undefined;
}

export function ensureEnumValue<T extends string>(value: T | null | undefined, enumType: Record<T, string>): T | null | undefined {
  if (value === undefined) {
    return undefined;
  }
  if (value === null) {
    return null;
  }
  return enumType[value as T] !== undefined ? value : undefined;
}

export function ensureFilter(filter: boolean | number | null | undefined): boolean | number | null | undefined {
  if (typeof filter === "boolean") {
    return filter;
  } else if (typeof filter === "number" && filter >= 0) {
    return filter;
  } else if (filter === null) {
    return null;
  } else {
    return undefined;
  }
}

export function ensureNonNegative(value: number | null | undefined): number | null | undefined {
  if (value === undefined) {
    return undefined;
  }
  if (value === null) {
    return null;
  }
  return value < 0 ? undefined : value;
}

export function ensureValueInRange(value: number | null | undefined, range: [number, number]): number | null | undefined {
  if (value === undefined) {
    return undefined;
  }
  if (value === null) {
    return null;
  }
  const min = Math.min(...range);
  const max = Math.max(...range);
  return value >= min && value <= max ? value : undefined;
}

export function withFallback<T>(value: T | null | undefined, defaultValue: T | null): T | null {
  return value === undefined ? defaultValue : value;
}
