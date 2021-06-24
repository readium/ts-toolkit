// /* Copyright 2020 Readium Foundation. All rights reserved.
//  * Use of this source code is governed by a BSD-style license,
//  * available in the LICENSE file present in the Github repository of the project.
//  */


// //TODO : remove
// /** Wraps a dictionary parsed from a JSON string or a JSON Object */
// export class JSONDictionary {
//   public json: any;

//   constructor(json: any) {
//     if (typeof json === 'string') {
//       this.json = JSON.parse(json);
//     } else {
//       this.json = json;
//     }
//   }

//   /** Removes the given property and returns its value */
//   private pop(key: string) {
//     const value = this.json[key];
//     //delete this.json[key];
//     return value;
//   }

//   /** Checks weather item exists */
//   public hasItem(key: string): boolean {
//     return this.json[key];
//   }

//   /** Parses the given property AS-IS and removes it */
//   public parseRaw(key: string): any {
//     return this.pop(key);
//   }

//   /** Parses the given array and removes it
//    *  Parameter allowingSingle: If true, then allows the parsing of both a single value and an array.
//    */
//   public parseArray(key: string, allowingSingle: boolean = false): Array<any> | undefined {
//     const result = this.pop(key);
//     if (result) {
//       if (Array.isArray(result)) {
//         return result;
//       } else if (allowingSingle) {
//         return [result];
//       }
//     }
//     return undefined;
//   }

//   /** Parses a numeric value, but returns null if it is not */
//   public parseNumber(key: string): number | undefined {
//     const result = this.pop(key);
//     if (!isNaN(result)) {
//       return result;
//     }
//     return undefined;
//   }

//   /** Parses a numeric value, but returns null if it is not a positive number. */
//   public parsePositive(key: string): number | undefined {
//     const result = this.pop(key);
//     if (!isNaN(result) && Math.sign(result) >= 0) {
//       return result;
//     }
//     return undefined;
//   }

//   /** Parses the given key and returns a Date (or null if it’s not a string) */
//   public parseDate(key: string): Date | undefined {
//     const result = this.pop(key);
//     if (typeof result === 'string') {
//       return new Date(result);
//     }
//     return undefined;
//   }

// }
