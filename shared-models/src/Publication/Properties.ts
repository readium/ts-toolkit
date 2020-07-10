/* Copyright 2020 Readium Foundation. All rights reserved.
 * Use of this source code is governed by a BSD-style license,
 * available in the LICENSE file present in the Github repository of the project.
 */

export class Properties {
  public otherProperties: { [key: string]: any };

  constructor(json: any) {
    if (typeof json === "string") {
      this.otherProperties = JSON.parse(json);
    } else {
      this.otherProperties = json;
    }
  }

  public adding(properties: { [key: string]: any }): Properties {
    let copy = JSON.parse(JSON.stringify(this.otherProperties));
    for (const property in properties) {
      copy[property] = properties[property]
    }
    return new Properties(copy);
  }
}