import { Encryption, Properties } from '../../src';

describe('Encryption Properties Tests', () => {
  it('get Properties {encryption} when available', () => {
    expect(
      new Properties({
        encrypted: {
          algorithm: 'http://algo',
          compression: 'gzip',
        },
      }).encryption
    ).toEqual(
      new Encryption({ algorithm: 'http://algo', compression: 'gzip' })
    );
  });

  it('get Properties {encryption} when missing', () => {
    expect(new Properties({}).encryption).toBeUndefined();
  });

  it('get Properties {encryption} when not valid', () => {
    expect(
      new Properties({
        encrypted: 'invalid',
      }).encryption
    ).toBeUndefined();
  });
});
