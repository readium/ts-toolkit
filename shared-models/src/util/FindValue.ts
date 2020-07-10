/* Copyright 2020 Readium Foundation. All rights reserved.
 * Use of this source code is governed by a BSD-style license,
 * available in the LICENSE file present in the Github repository of the project.
 */

export const findValue = (object: { [key: string]: any}, key: string): any => {
  let value: any;
  Object.keys(object).some((k) => {
    if (k === key) {
      value = object[k];
      return true;
    }
    if (object[k] && typeof object[k] === "object") {
      value = findValue(object[k], key);
      return value !== undefined;
    }
    return false;
  });
  return value;
}