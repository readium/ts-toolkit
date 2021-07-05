import { LocalizedString } from '../src';

describe('LocalizedString Tests', () => {
  it('parse JSON string', () => {
    expect(LocalizedString.deserialize('a string')).toEqual(
      new LocalizedString('a string')
    );
  });

  it('parse JSON localized strings', () => {
    expect(
      LocalizedString.deserialize({
        en: 'a string',
        fr: 'une chaîne',
        tr: 'bir metin',
      })
    ).toEqual(
      new LocalizedString({
        en: 'a string',
        fr: 'une chaîne',
        tr: 'bir metin',
      })
    );
  });

  it('parse invalid JSON', () => {
    expect(LocalizedString.deserialize([1, 2])).toBeUndefined();
  });

  it('parse undefined JSON', () => {
    expect(LocalizedString.deserialize(undefined)).toBeUndefined();
  });

  it('get JSON with one translation and no language', () => {
    expect(new LocalizedString('a string').serialize()).toEqual({
      undefined: 'a string',
    });
  });

  it('get JSON', () => {
    expect(
      new LocalizedString({
        en: 'a string',
        fr: 'une chaîne',
        undefined: 'bir metin',
      }).serialize()
    ).toEqual({
      en: 'a string',
      fr: 'une chaîne',
      undefined: 'bir metin',
    });
  });

  it('get the default translation', () => {
    expect(
      new LocalizedString({
        en: 'a string',
        fr: 'une chaîne',
      }).getTranslation()
    ).toEqual('a string');
  });

  it('find translation by language', () => {
    expect(
      new LocalizedString({
        en: 'a string',
        fr: 'une chaîne',
      }).getTranslation('fr')
    ).toEqual('une chaîne');
  });

  it('find translation by language defaults to undefined', () => {
    expect(
      new LocalizedString({
        foo: 'a string',
        bar: 'une chaîne',
        undefined: 'Surgh',
      }).getTranslation()
    ).toEqual('Surgh');
  });

  it('find translation by language defaults to English', () => {
    expect(
      new LocalizedString({
        en: 'a string',
        fr: 'une chaîne',
      }).getTranslation()
    ).toEqual('a string');
  });

  it('find translation by language defaults to the first found translation', () => {
    expect(
      new LocalizedString({
        fr: 'une chaîne',
      }).getTranslation()
    ).toEqual('une chaîne');
  });

  it('find translation by language defaults for empty json', () => {
    expect(new LocalizedString({}).getTranslation()).toEqual('');
  });
});
