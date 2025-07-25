/* Copyright 2025 Readium Foundation. All rights reserved.
 * Use of this source code is governed by a BSD-style license,
 * available in the LICENSE file present in the Github repository of the project.
 */

/**
 * Represents an alternate identifier for a publication.
 * https://readium.org/webpub-manifest/schema/altIdentifier.schema.json
 */
export class AltIdentifier {
  /** The value of the alternate identifier. */
  public readonly value: string;
  
  /** The scheme of the alternate identifier (URI format). */
  public readonly scheme?: string;

  /** Creates an AltIdentifier object */
  constructor(values: {
    value: string;
    scheme?: string;
  }) {
    this.value = values.value;
    this.scheme = values.scheme;
  }

  /**
   * Parses an AltIdentifier from its RWPM JSON representation.
   */
  public static deserialize(json: string | any): AltIdentifier | undefined {
    if (!json) return;

    if (typeof json === 'string') {
      return new AltIdentifier({ value: json });
    }

    if (typeof json === 'object' && json.value) {
      return new AltIdentifier({
        value: json.value,
        scheme: json.scheme
      });
    }

    return undefined;
  }

  /**
   * Serializes an AltIdentifier to its RWPM JSON representation.
   */
  public serialize(): string | any {
    if (this.scheme) {
      return {
        value: this.value,
        scheme: this.scheme
      };
    }
    return this.value;
  }
}
