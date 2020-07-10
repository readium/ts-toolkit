/* Copyright 2020 Readium Foundation. All rights reserved.
 * Use of this source code is governed by a BSD-style license,
 * available in the LICENSE file present in the Github repository of the project.
 */

/** Indicates that a resource is encrypted/obfuscated and provides relevant information
 *  for decryption.
 */
export interface IEncryption {

  /** Identifies the algorithm used to encrypt the resource. */
  algorithm: string;

  /** Compression method used on the resource. */
  compression?: string;

  /** Original length of the resource in bytes before compression and/or encryption. */
  originalLength?: number;

  /** Identifies the encryption profile used to encrypt the resource. */
  profile?: string;

  /** Identifies the encryption scheme used to encrypt the resource. */
  scheme?: string;
}