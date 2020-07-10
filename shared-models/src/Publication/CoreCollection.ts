/* Copyright 2020 Readium Foundation. All rights reserved.
 * Use of this source code is governed by a BSD-style license,
 * available in the LICENSE file present in the Github repository of the project.
 */

import { JSONDictionary } from "./Publication+JSON";
import { Links } from "./Link";

/** Core Collection Model
 *  https://readium.org/webpub-manifest/schema/subcollection.schema.json
 *  Can be used as extension point in the Readium Web Publication Manifest.
 */
export class CoreCollection {
  public metadata?: {[key: string]: any};
  public links?: Links;

  /** Subcollections indexed by their role in this collection. */
  public subcollections?: {[collection: string]: CoreCollection};

  constructor(json: any) {
    if (Array.isArray(json)) {
      this.links = new Links(json);
    } else {
      const jsonCollection = new JSONDictionary(json);
      this.metadata = jsonCollection.parseRaw("metadata");
      this.links = new Links(jsonCollection.parseArray("links"));
      this.subcollections = CoreCollection.makeCollections(jsonCollection);
    }
  }

  public static makeCollections(json: any): {[collection: string]: CoreCollection} {
    let collection = {};
    for (const key in json) {
      collection[key] = new this(json[key]);
    }
    return collection;
  }
}