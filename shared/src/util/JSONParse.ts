/** Parses the given array (or undefined it it's not an array) */
export function arrayfromJSON(json: any): Array<any> | undefined {
  return json && json instanceof Array ? json : undefined;
}

export function arrayfromJSONorString(json: any): Array<any> | undefined {
  return json && typeof json === 'string' ? [json] : arrayfromJSON(json);
}

/** Parses the given key and returns a Date (or undefined if it’s not a string) */
export function datefromJSON(json: any): Date | undefined {
  return typeof json === 'string' ? new Date(json) : undefined;
}

/** Parses a numeric value, but returns undefined if it is not a positive number. */
export function numberfromJSON(json: any): number | undefined {
  return isNaN(json) ? undefined : json;
}

/** Parses a numeric value, but returns undefined if it is not a positive number. */
export function positiveNumberfromJSON(json: any): number | undefined {
  let num = numberfromJSON(json);
  return num !== undefined && Math.sign(json) >= 0 ? json : undefined;
}

/** Converts a Set of a string to a string Array object */
export function setToArray(obj: Set<string>): Array<string> {
  const list = new Array<string>();
  obj.forEach(x => list.push(x));
  return list;
}
