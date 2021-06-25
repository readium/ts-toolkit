import { LocalizedString, Metadata } from '../src';

describe('Metadata Tests', () => {
  it('parse minimal JSON', () => {
    expect(new Metadata({ title: new LocalizedString('Title') })).toEqual(
      Metadata.fromJSON({ title: 'Title' })
    );
  });
});
