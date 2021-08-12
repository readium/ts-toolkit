import {
  Contributor,
  Contributors,
  Link,
  Links,
  LocalizedString,
} from '../src';

describe('Contributor Tests', () => {
  it('parse JSON string', () => {
    expect(Contributor.deserialize('Thom Yorke')).toEqual(
      new Contributor({
        name: new LocalizedString('Thom Yorke'),
      })
    );
  });

  it('parse minimal JSON', () => {
    expect(Contributor.deserialize({ name: 'Colin Greenwood' })).toEqual(
      new Contributor({
        name: new LocalizedString('Colin Greenwood'),
      })
    );
  });

  it('parse full JSON', () => {
    expect(
      Contributor.deserialize({
        name: 'Colin Greenwood',
        identifier: 'colin',
        sortAs: 'greenwood',
        role: 'bassist',
        position: 4,
        links: [{ href: 'http://link1' }, { href: 'http://link2' }],
      })
    ).toEqual(
      new Contributor({
        name: new LocalizedString('Colin Greenwood'),
        sortAs: 'greenwood',
        identifier: 'colin',
        roles: new Set<string>(['bassist']),
        position: 4.0,
        links: new Links([
          new Link({ href: 'http://link1' }),
          new Link({ href: 'http://link2' }),
        ]),
      })
    );
  });

  it('parse JSON with multiple roles', () => {
    expect(
      Contributor.deserialize({
        name: 'Thom Yorke',
        role: ['singer', 'guitarist', 'guitarist'],
      })
    ).toEqual(
      new Contributor({
        name: new LocalizedString('Thom Yorke'),
        roles: new Set<string>(['singer', 'guitarist']),
      })
    );
  });

  it('parse undefined JSON', () => {
    expect(Contributor.deserialize(undefined)).toBeUndefined();
  });

  it('parse requires {name}', () => {
    expect(Contributor.deserialize({ identifier: 'c1' })).toBeUndefined();
  });

  it('parse JSON array', () => {
    expect(
      Contributors.deserialize([
        'Thom Yorke',
        {
          name: { en: 'Jonny Greenwood', fr: 'Jean Boisvert' },
          role: 'guitarist',
        },
      ])
    ).toEqual(
      new Contributors([
        new Contributor({ name: new LocalizedString('Thom Yorke') }),
        new Contributor({
          name: new LocalizedString({
            en: 'Jonny Greenwood',
            fr: 'Jean Boisvert',
          }),
          roles: new Set<string>(['guitarist']),
        }),
      ])
    );
  });

  it('parse undefined JSON array', () => {
    expect(Contributors.deserialize(undefined)).toBeUndefined();
  });

  it('parse JSON array ignores invalid contributors', () => {
    expect(
      Contributors.deserialize([
        'Thom Yorke',
        {
          role: 'guitarist',
        },
      ])
    ).toEqual(
      new Contributors([
        new Contributor({ name: new LocalizedString('Thom Yorke') }),
      ])
    );
  });

  it('parse array from string', () => {
    expect(Contributors.deserialize(['Thom Yorke'])).toEqual(
      new Contributors([
        new Contributor({ name: new LocalizedString('Thom Yorke') }),
      ])
    );
  });

  it('parse array from single object', () => {
    expect(
      Contributors.deserialize({
        name: { en: 'Jonny Greenwood', fr: 'Jean Boisvert' },
        role: 'guitarist',
      })
    ).toEqual(
      new Contributors([
        new Contributor({
          name: new LocalizedString({
            en: 'Jonny Greenwood',
            fr: 'Jean Boisvert',
          }),
          roles: new Set<string>(['guitarist']),
        }),
      ])
    );
  });

  it('get name from the default translation', () => {
    expect(
      new Contributor({
        name: new LocalizedString({
          en: 'Jonny Greenwood',
          fr: 'Jean Boisvert',
        }),
      }).name.getTranslation()
    ).toEqual('Jonny Greenwood');
  });

  it('get minimal JSON', () => {
    expect(
      new Contributor({
        name: new LocalizedString('Colin Greenwood'),
      }).serialize()
    ).toEqual({
      name: { undefined: 'Colin Greenwood' },
    });
  });

  it('get full JSON', () => {
    expect(
      new Contributor({
        name: new LocalizedString('Colin Greenwood'),
        sortAs: 'greenwood',
        identifier: 'colin',
        roles: new Set<string>(['bassist']),
        position: 4.0,
        links: new Links([
          new Link({ href: 'http://link1' }),
          new Link({ href: 'http://link2' }),
        ]),
      }).serialize()
    ).toEqual({
      name: { undefined: 'Colin Greenwood' },
      sortAs: 'greenwood',
      identifier: 'colin',
      role: ['bassist'],
      position: 4.0,
      links: [{ href: 'http://link1' }, { href: 'http://link2' }],
    });
  });

  it('get JSON array', () => {
    expect(
      new Contributors([
        new Contributor({ name: new LocalizedString('Thom Yorke') }),
        new Contributor({
          name: new LocalizedString({
            en: 'Jonny Greenwood',
            fr: 'Jean Boisvert',
          }),
          roles: new Set<string>(['guitarist']),
        }),
      ]).serialize()
    ).toEqual([
      {
        name: { undefined: 'Thom Yorke' },
      },
      {
        name: { en: 'Jonny Greenwood', fr: 'Jean Boisvert' },
        role: ['guitarist'],
      },
    ]);
  });
});
