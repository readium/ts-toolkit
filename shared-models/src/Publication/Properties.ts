/* Copyright 2020 Readium Foundation. All rights reserved.
 * Use of this source code is governed by a BSD-style license,
 * available in the LICENSE file present in the Github repository of the project.
 */

/**
 * Properties associated to the linked resource.
 *
 * This is opened for extensions.
 * https://readium.org/webpub-manifest/schema/link.schema.json
 */
export class Properties {
  public otherProperties: { [key: string]: any };

  constructor(values: { [key: string]: any }) {
    this.otherProperties = values;
  }

  /**
   * Creates a [Properties] from its RWPM JSON representation.
   */
  public static fromJSON(json: any): Properties | undefined {
    return json ? new Properties(json) : undefined;
  }

  /**
   * Serializes a [Properties] to its RWPM JSON representation.
   */
  public toJSON(): any {
    return this.otherProperties;
  }

  /**
   * Makes a copy of this [Properties] after merging in the given additional other [properties].
   */
  public add(properties: { [key: string]: any }): Properties {
    let _properties = Object.assign({}, this.otherProperties);
    for (const property in properties) {
      _properties[property] = properties[property];
    }
    return new Properties(_properties);
  }
}
