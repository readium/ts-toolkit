
/** Parses the given array (or undefined it it's not an array) */
export function arrayfromJSON(json: any): Array<any> | undefined {
    return json && json instanceof Array ? json : undefined;
}

/** Parses the given key and returns a Date (or undefined if it’s not a string) */
export function datefromJSON(json: any): Date | undefined {
    return typeof json === "string" ? new Date(json) : undefined;
}

/** Parses a numeric value, but returns undefined if it is not a positive number. */
export function numberfromJSON(json: any): number | undefined {
    return isNaN(json) ? undefined : json ;
}

/** Parses a numeric value, but returns undefined if it is not a positive number. */
export function positiveNumberfromJSON(json: any): number | undefined {
    return (numberfromJSON(json) && Math.sign(json) >= 0) ? json : undefined;
}