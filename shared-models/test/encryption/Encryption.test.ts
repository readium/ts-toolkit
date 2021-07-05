import { Encryption } from '../../src';

describe('Encryption Tests', () => {
  it('parse minimal JSON', () => {
    expect(Encryption.deserialize({ algorithm: 'http://algo' })).toEqual(
      new Encryption({ algorithm: 'http://algo' })
    );
  });

  it('parse full JSON', () => {
    expect(
      Encryption.deserialize({
        algorithm: 'http://algo',
        compression: 'gzip',
        originalLength: 42099,
        profile: 'http://profile',
        scheme: 'http://scheme',
      })
    ).toEqual(
      new Encryption({
        algorithm: 'http://algo',
        compression: 'gzip',
        originalLength: 42099,
        profile: 'http://profile',
        scheme: 'http://scheme',
      })
    );
  });

  it('parse undefined JSON', () => {
    expect(Encryption.deserialize(undefined)).toBeUndefined();
  });

  it('parse JSON requires {algorithm}', () => {
    expect(Encryption.deserialize({ compression: 'gzip' })).toBeUndefined();
  });

  it('get minimal JSON', () => {
    expect(new Encryption({ algorithm: 'http://algo' }).serialize()).toEqual({
      algorithm: 'http://algo',
    });
  });

  it('get full JSON', () => {
    expect(
      new Encryption({
        algorithm: 'http://algo',
        compression: 'gzip',
        originalLength: 42099,
        profile: 'http://profile',
        scheme: 'http://scheme',
      }).serialize()
    ).toEqual({
      algorithm: 'http://algo',
      compression: 'gzip',
      originalLength: 42099,
      profile: 'http://profile',
      scheme: 'http://scheme',
    });
  });
});
