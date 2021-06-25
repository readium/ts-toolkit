import { LocalizedString } from '../src';

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
});
