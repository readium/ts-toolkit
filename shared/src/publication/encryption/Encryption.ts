/* Copyright 2021 Readium Foundation. All rights reserved.
 * Use of this source code is governed by a BSD-style license,
 * available in the LICENSE file present in the Github repository of the project.
 */

/** Indicates that a resource is encrypted/obfuscated and provides relevant information
 *  for decryption.
 */
export class Encryption {
  /** Identifies the algorithm used to encrypt the resource. */
  public readonly algorithm: string;

  /** Compression method used on the resource. */
  public readonly compression?: string;

  /** Original length of the resource in bytes before compression and/or encryption. */
  public readonly originalLength?: number;

  /** Identifies the encryption profile used to encrypt the resource. */
  public readonly profile?: string;

  /** Identifies the encryption scheme used to encrypt the resource. */
  public readonly scheme?: string;

  /**
   * Creates a [Encryption].
   */
  constructor(values: {
    algorithm: string;
    compression?: string;
    originalLength?: number;
    profile?: string;
    scheme?: string;
  }) {
    this.algorithm = values.algorithm;
    this.compression = values.compression;
    this.originalLength = values.originalLength;
    this.profile = values.profile;
    this.scheme = values.scheme;
  }

  /**
   * Parses a [Encryption] from its RWPM JSON representation.
   */
  public static deserialize(json: any): Encryption | undefined {
    if (!(json && json.algorithm)) return;
    return new Encryption({
      algorithm: json.algorithm,
      compression: json.compression,
      originalLength: json.originalLength,
      profile: json.profile,
      scheme: json.scheme,
    });
  }

  /**
   * Serializes a [Encryption] to its RWPM JSON representation.
   */
  public serialize(): any {
    const json: any = { algorithm: this.algorithm };
    if (this.compression !== undefined) json.compression = this.compression;
    if (this.originalLength !== undefined)
      json.originalLength = this.originalLength;
    if (this.profile !== undefined) json.profile = this.profile;
    if (this.scheme !== undefined) json.scheme = this.scheme;
    return json;
  }
}
