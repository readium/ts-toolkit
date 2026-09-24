import { Encryption, Properties, getEncryption } from '../../src';

describe('Encryption Properties Tests', () => {
  it('get Properties {encryption} when available', () => {
    expect(
      getEncryption(new Properties({
        encrypted: {
          algorithm: 'http://algo',
          compression: 'gzip',
        },
      }))
    ).toEqual(
      new Encryption({ algorithm: 'http://algo', compression: 'gzip' })
    );
  });

  it('get Properties {encryption} when missing', () => {
    expect(getEncryption(new Properties({}))).toBeUndefined();
  });

  it('get Properties {encryption} when not valid', () => {
    expect(
      getEncryption(new Properties({
        encrypted: 'invalid',
      }))
    ).toBeUndefined();
  });
});
