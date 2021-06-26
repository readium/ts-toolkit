export function isUndefined(obj: any): boolean {
  return obj === undefined;
}

export function isNull(obj: any): boolean {
  return obj === null;
}

export function isUndefinedOrNull(obj: any): boolean {
  return obj === undefined || obj === null;
}

export function getType(obj: any): any {
  return isUndefinedOrNull(obj) ? undefined : obj.constructor;
}

export function isString(obj: any): boolean {
  return getType(obj) === String;
}

export function isArray(obj: any): boolean {
  return getType(obj) === Array;
}

export function isObject(obj: any): boolean {
  return getType(obj) === Object;
}

export function isNumber(obj: any): boolean {
  return getType(obj) === Number;
}

export function isBoolean(obj: any): boolean {
  return getType(obj) === Boolean;
}

export function typeIs(obj: any, types: Array<any>): boolean {
  let objType = getType(obj);
  return types.find(x => x === objType);
}
