import { Properties } from '../Properties.ts';
import { Encryption } from './Encryption.ts';

// Encryption extensions for link Properties.

export function getEncryption(properties: Properties): Encryption | undefined {
  return Encryption.deserialize(properties.otherProperties.encrypted);
}
