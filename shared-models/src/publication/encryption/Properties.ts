import { Properties } from '../Properties';
import { Encryption } from './Encryption';

// Encryption extensions for link [Properties].

declare module '../Properties' {
  export interface Properties {
    /**
     * Indicates that a resource is encrypted/obfuscated and provides relevant information for
     * decryption.
     */
    encryption: Encryption | undefined;
  }
}

Object.defineProperty(Properties.prototype, 'encryption', {
  get: function(): Encryption | undefined {
    return Encryption.deserialize(this.otherProperties.encrypted);
  },
});
