import { LocalizedString, UNDEFINED_LANGUAGE } from '../src';

describe('LocalizedString Tests', () => {
  it('parse JSON string', () => {
    expect(new LocalizedString('a string')).toEqual(
      LocalizedString.fromJSON('a string')
    );
  });

  it('parse JSON localized strings', () => {
    expect(
      new LocalizedString({
        en: 'a string',
        fr: 'une chaîne',
        tr: 'bir metin',
      })
    ).toEqual(
      LocalizedString.fromJSON({
        en: 'a string',
        fr: 'une chaîne',
        tr: 'bir metin',
      })
    );
  });

  it('parse invalid JSON', () => {
    expect(LocalizedString.fromJSON([1, 2])).toBeUndefined();
  });

  it('parse null JSON', () => {
    expect(LocalizedString.fromJSON(null)).toBeUndefined();
  });

  it('get JSON with one translation and no language', () => {
    expect(new LocalizedString('a string').toJSON()).toEqual('a string');
  });

  it('get JSON', () => {
    expect(
      new LocalizedString({
        en: 'a string',
        fr: 'une chaîne',
        [UNDEFINED_LANGUAGE]: 'bir metin',
      }).toJSON()
    ).toEqual({
      en: 'a string',
      fr: 'une chaîne',
      [UNDEFINED_LANGUAGE]: 'bir metin',
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
        [UNDEFINED_LANGUAGE]: 'Surgh',
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
