import { Link, Links, LocalizedString, Subject, Subjects } from '../src';

describe('Subject Tests', () => {
  it('parse JSON string', () => {
    expect(Subject.deserialize('Fantasy')).toEqual(
      new Subject({
        name: new LocalizedString('Fantasy'),
      })
    );
  });

  it('parse minimal JSON', () => {
    expect(Subject.deserialize({ name: 'Science Fiction' })).toEqual(
      new Subject({
        name: new LocalizedString('Science Fiction'),
      })
    );
  });

  it('parse full JSON', () => {
    expect(
      Subject.deserialize({
        name: 'Science Fiction',
        sortAs: 'science-fiction',
        scheme: 'http://scheme',
        code: 'CODE',
        links: [{ href: 'pub1' }, { href: 'pub2' }],
      })
    ).toEqual(
      new Subject({
        name: new LocalizedString('Science Fiction'),
        sortAs: 'science-fiction',
        scheme: 'http://scheme',
        code: 'CODE',
        links: new Links([
          new Link({ href: 'pub1' }),
          new Link({ href: 'pub2' }),
        ]),
      })
    );
  });

  it('parse undefined JSON', () => {
    expect(Subject.deserialize(undefined)).toBeUndefined();
  });

  it('parse requires {name}', () => {
    expect(Subject.deserialize({ sortAs: 'science-fiction' })).toBeUndefined();
  });

  it('parse JSON array', () => {
    expect(
      Subjects.deserialize([
        'Fantasy',
        {
          name: 'Science Fiction',
          scheme: 'http://scheme',
        },
      ])
    ).toEqual(
      new Subjects([
        new Subject({ name: new LocalizedString('Fantasy') }),
        new Subject({
          name: new LocalizedString('Science Fiction'),
          scheme: 'http://scheme',
        }),
      ])
    );
  });

  it('parse undefined JSON array', () => {
    expect(Subjects.deserialize(undefined)).toBeUndefined();
  });

  it('parse JSON array ignores invalid contributors', () => {
    expect(
      Subjects.deserialize([
        'Fantasy',
        {
          code: 'CODE',
        },
      ])
    ).toEqual(
      new Subjects([new Subject({ name: new LocalizedString('Fantasy') })])
    );
  });

  it('parse array from string', () => {
    expect(Subjects.deserialize(['Fantasy'])).toEqual(
      new Subjects([new Subject({ name: new LocalizedString('Fantasy') })])
    );
  });

  it('parse array from single object', () => {
    expect(
      Subjects.deserialize({
        name: 'Fantasy',
        code: 'CODE',
      })
    ).toEqual(
      new Subjects([
        new Subject({
          name: new LocalizedString('Fantasy'),
          code: 'CODE',
        }),
      ])
    );
  });

  it('get name from the default translation', () => {
    expect(
      new Subject({
        name: new LocalizedString({
          en: 'Hello world',
          fr: 'Salut le monde',
        }),
      }).name.getTranslation()
    ).toEqual('Hello world');
  });

  it('get minimal JSON', () => {
    expect(
      new Subject({
        name: new LocalizedString('Science Fiction'),
      }).serialize()
    ).toEqual({
      name: { undefined: 'Science Fiction' },
    });
  });

  it('get full JSON', () => {
    expect(
      new Subject({
        name: new LocalizedString('Science Fiction'),
        sortAs: 'science-fiction',
        scheme: 'http://scheme',
        code: 'CODE',
        links: new Links([
          new Link({ href: 'pub1' }),
          new Link({ href: 'pub2' }),
        ]),
      }).serialize()
    ).toEqual({
      name: { undefined: 'Science Fiction' },
      sortAs: 'science-fiction',
      scheme: 'http://scheme',
      code: 'CODE',
      links: [{ href: 'pub1' }, { href: 'pub2' }],
    });
  });

  it('parse JSON array', () => {
    expect(
      new Subjects([
        new Subject({ name: new LocalizedString('Fantasy') }),
        new Subject({
          name: new LocalizedString('Science Fiction'),
          scheme: 'http://scheme',
        }),
      ]).serialize()
    ).toEqual([
      {
        name: { undefined: 'Fantasy' },
      },
      {
        name: { undefined: 'Science Fiction' },
        scheme: 'http://scheme',
      },
    ]);
  });
});
