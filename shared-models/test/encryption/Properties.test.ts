import { Encryption, Properties } from '../../src';

describe('Encryption Properties Tests', () => {
  it('get Properties {encryption} when available', () => {
    expect(
      new Properties({
        encrypted: {
          algorithm: 'http://algo',
          compression: 'gzip',
        },
      }).getEncryption()
    ).toEqual(
      new Encryption({ algorithm: 'http://algo', compression: 'gzip' })
    );
  });

  it('get Properties {encryption} when missing', () => {
    expect(new Properties({}).getEncryption()).toBeUndefined();
  });

  it('get Properties {encryption} when not valid', () => {
    expect(
      new Properties({
        encrypted: 'invalid',
      }).getEncryption()
    ).toBeUndefined();
  });
});
