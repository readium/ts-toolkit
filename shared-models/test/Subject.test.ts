import { Link, Links, LocalizedString } from '../src';
import { Subject, Subjects } from '../src/Publication/Subject';

describe('Subject Tests', () => {
  it('parse JSON string', () => {
    expect(Subject.fromJSON('Fantasy')).toEqual(
      new Subject({
        name: new LocalizedString('Fantasy'),
      })
    );
  });

  it('parse minimal JSON', () => {
    expect(Subject.fromJSON({ name: 'Science Fiction' })).toEqual(
      new Subject({
        name: new LocalizedString('Science Fiction'),
      })
    );
  });

  it('parse full JSON', () => {
    expect(
      Subject.fromJSON({
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
    expect(Subject.fromJSON(undefined)).toBeUndefined();
  });

  it('parse requires {name}', () => {
    expect(Subject.fromJSON({ sortAs: 'science-fiction' })).toBeUndefined();
  });

  it('parse JSON array', () => {
    expect(
      Subjects.fromJSON([
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
    expect(Subjects.fromJSON(undefined)).toBeUndefined();
  });

  it('parse JSON array ignores invalid contributors', () => {
    expect(
      Subjects.fromJSON([
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
    expect(Subjects.fromJSON(['Fantasy'])).toEqual(
      new Subjects([new Subject({ name: new LocalizedString('Fantasy') })])
    );
  });

  it('parse array from single object', () => {
    expect(
      Subjects.fromJSON({
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
      }).toJSON()
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
      }).toJSON()
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
      ]).toJSON()
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
