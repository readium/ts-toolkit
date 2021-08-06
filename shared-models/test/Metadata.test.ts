import {
  Contributor,
  Contributors,
  LocalizedString,
  Metadata,
  BelongsTo,
  ReadingProgression,
  Subject,
  Subjects,
} from '../src';

describe('Metadata Tests', () => {
  it('parse minimal JSON', () => {
    expect(Metadata.deserialize({ title: 'Title' })).toEqual(
      new Metadata({ title: new LocalizedString('Title') })
    );
  });

  it('parse full JSON', () => {
    expect(
      Metadata.deserialize({
        identifier: '1234',
        '@type': 'epub',
        title: { en: 'Title', fr: 'Titre' },
        subtitle: { en: 'Subtitle', fr: 'Sous-titre' },
        modified: '2001-01-01T12:36:27.000Z',
        published: '2001-01-02T12:36:27.000Z',
        language: ['en', 'fr'],
        sortAs: 'sort key',
        subject: ['Science Fiction', 'Fantasy'],
        author: 'Author',
        translator: 'Translator',
        editor: 'Editor',
        artist: 'Artist',
        illustrator: 'Illustrator',
        letterer: 'Letterer',
        penciler: 'Penciler',
        colorist: 'Colorist',
        inker: 'Inker',
        narrator: 'Narrator',
        contributor: 'Contributor',
        publisher: 'Publisher',
        imprint: 'Imprint',
        readingProgression: 'rtl',
        description: 'Description',
        duration: 4.24,
        numberOfPages: 240,
        belongsTo: {
          collection: 'Collection',
          series: 'Series',
          'schema:Periodical': 'Periodical',
          'schema:Newspaper': ['Newspaper 1', 'Newspaper 2'],
        },
        'other-metadata1': 'value',
        'other-metadata2': [42],
      })
    ).toEqual(
      new Metadata({
        identifier: '1234',
        typeUri: 'epub',
        title: new LocalizedString({
          en: 'Title',
          fr: 'Titre',
        }),
        subtitle: new LocalizedString({
          en: 'Subtitle',
          fr: 'Sous-titre',
        }),
        modified: new Date('2001-01-01T12:36:27.000Z'),
        published: new Date('2001-01-02T12:36:27.000Z'),
        languages: ['en', 'fr'],
        sortAs: new LocalizedString('sort key'),
        subjects: new Subjects([
          new Subject({ name: new LocalizedString('Science Fiction') }),
          new Subject({ name: new LocalizedString('Fantasy') }),
        ]),
        authors: new Contributors([
          new Contributor({ name: new LocalizedString('Author') }),
        ]),
        translators: new Contributors([
          new Contributor({ name: new LocalizedString('Translator') }),
        ]),
        editors: new Contributors([
          new Contributor({ name: new LocalizedString('Editor') }),
        ]),
        artists: new Contributors([
          new Contributor({ name: new LocalizedString('Artist') }),
        ]),
        illustrators: new Contributors([
          new Contributor({ name: new LocalizedString('Illustrator') }),
        ]),
        letterers: new Contributors([
          new Contributor({ name: new LocalizedString('Letterer') }),
        ]),
        pencilers: new Contributors([
          new Contributor({ name: new LocalizedString('Penciler') }),
        ]),
        colorists: new Contributors([
          new Contributor({ name: new LocalizedString('Colorist') }),
        ]),
        inkers: new Contributors([
          new Contributor({ name: new LocalizedString('Inker') }),
        ]),
        narrators: new Contributors([
          new Contributor({ name: new LocalizedString('Narrator') }),
        ]),
        contributors: new Contributors([
          new Contributor({ name: new LocalizedString('Contributor') }),
        ]),
        publishers: new Contributors([
          new Contributor({ name: new LocalizedString('Publisher') }),
        ]),
        imprints: new Contributors([
          new Contributor({ name: new LocalizedString('Imprint') }),
        ]),
        readingProgression: ReadingProgression.rtl,
        description: 'Description',
        duration: 4.24,
        numberOfPages: 240,
        belongsTo: new BelongsTo({
          items: new Map([
            [
              'schema:Periodical',
              new Contributors([
                new Contributor({ name: new LocalizedString('Periodical') }),
              ]),
            ],
            [
              'schema:Newspaper',
              new Contributors([
                new Contributor({ name: new LocalizedString('Newspaper 1') }),
                new Contributor({ name: new LocalizedString('Newspaper 2') }),
              ]),
            ],
            [
              'collection',
              new Contributors([
                new Contributor({ name: new LocalizedString('Collection') }),
              ]),
            ],
            [
              'series',
              new Contributors([
                new Contributor({ name: new LocalizedString('Series') }),
              ]),
            ],
          ]),
        }),
        otherMetadata: {
          'other-metadata1': 'value',
          'other-metadata2': [42],
        },
      })
    );
  });

  it('parse undefined JSON', () => {
    expect(Metadata.deserialize(undefined)).toBeUndefined();
  });

  it('parse JSON with single language', () => {
    expect(
      Metadata.deserialize({
        title: 'Title',
        language: 'fr',
      })
    ).toEqual(
      new Metadata({
        title: new LocalizedString('Title'),
        languages: ['fr'],
      })
    );
  });

  it('parse JSON requires {title}', () => {
    expect(Metadata.deserialize({ duration: 4.24 })).toBeUndefined();
  });

  it('parse JSON {duration} requires positive', () => {
    expect(Metadata.deserialize({ title: 't', duration: -20 })).toEqual(
      new Metadata({
        title: new LocalizedString('t'),
      })
    );
  });

  it('parse JSON {numberOfPages} requires positive', () => {
    expect(Metadata.deserialize({ title: 't', numberOfPages: -20 })).toEqual(
      new Metadata({
        title: new LocalizedString('t'),
      })
    );
  });

  it('get minimal JSON', () => {
    expect(
      new Metadata({
        title: new LocalizedString('Title'),
      }).serialize()
    ).toEqual({
      title: { undefined: 'Title' },
    });
  });

  it('parse full JSON', () => {
    expect(
      new Metadata({
        identifier: '1234',
        typeUri: 'epub',
        title: new LocalizedString({
          en: 'Title',
          fr: 'Titre',
        }),
        subtitle: new LocalizedString({
          en: 'Subtitle',
          fr: 'Sous-titre',
        }),
        modified: new Date('2001-01-01T12:36:27.000Z'),
        published: new Date('2001-01-02T12:36:27.000Z'),
        languages: ['en', 'fr'],
        sortAs: new LocalizedString({
          en: 'sort key',
          fr: 'clé de tri',
        }),
        subjects: new Subjects([
          new Subject({ name: new LocalizedString('Science Fiction') }),
          new Subject({ name: new LocalizedString('Fantasy') }),
        ]),
        authors: new Contributors([
          new Contributor({ name: new LocalizedString('Author') }),
        ]),
        translators: new Contributors([
          new Contributor({ name: new LocalizedString('Translator') }),
        ]),
        editors: new Contributors([
          new Contributor({ name: new LocalizedString('Editor') }),
        ]),
        artists: new Contributors([
          new Contributor({ name: new LocalizedString('Artist') }),
        ]),
        illustrators: new Contributors([
          new Contributor({ name: new LocalizedString('Illustrator') }),
        ]),
        letterers: new Contributors([
          new Contributor({ name: new LocalizedString('Letterer') }),
        ]),
        pencilers: new Contributors([
          new Contributor({ name: new LocalizedString('Penciler') }),
        ]),
        colorists: new Contributors([
          new Contributor({ name: new LocalizedString('Colorist') }),
        ]),
        inkers: new Contributors([
          new Contributor({ name: new LocalizedString('Inker') }),
        ]),
        narrators: new Contributors([
          new Contributor({ name: new LocalizedString('Narrator') }),
        ]),
        contributors: new Contributors([
          new Contributor({ name: new LocalizedString('Contributor') }),
        ]),
        publishers: new Contributors([
          new Contributor({ name: new LocalizedString('Publisher') }),
        ]),
        imprints: new Contributors([
          new Contributor({ name: new LocalizedString('Imprint') }),
        ]),
        readingProgression: ReadingProgression.rtl,
        description: 'Description',
        duration: 4.24,
        numberOfPages: 240,
        belongsTo: new BelongsTo({
          items: new Map([
            [
              'schema:Periodical',
              new Contributors([
                new Contributor({ name: new LocalizedString('Periodical') }),
              ]),
            ],
            [
              'collection',
              new Contributors([
                new Contributor({ name: new LocalizedString('Collection') }),
              ]),
            ],
            [
              'series',
              new Contributors([
                new Contributor({ name: new LocalizedString('Series') }),
              ]),
            ],
          ]),
        }),
        otherMetadata: {
          'other-metadata1': 'value',
          'other-metadata2': [42],
        },
      }).serialize()
    ).toEqual({
      identifier: '1234',
      '@type': 'epub',
      title: { en: 'Title', fr: 'Titre' },
      subtitle: { en: 'Subtitle', fr: 'Sous-titre' },
      modified: '2001-01-01T12:36:27.000Z',
      published: '2001-01-02T12:36:27.000Z',
      language: ['en', 'fr'],
      sortAs: { en: 'sort key', fr: 'clé de tri' },
      subject: [
        { name: { undefined: 'Science Fiction' } },
        { name: { undefined: 'Fantasy' } },
      ],
      author: [{ name: { undefined: 'Author' } }],
      translator: [{ name: { undefined: 'Translator' } }],
      editor: [{ name: { undefined: 'Editor' } }],
      artist: [{ name: { undefined: 'Artist' } }],
      illustrator: [{ name: { undefined: 'Illustrator' } }],
      letterer: [{ name: { undefined: 'Letterer' } }],
      penciler: [{ name: { undefined: 'Penciler' } }],
      colorist: [{ name: { undefined: 'Colorist' } }],
      inker: [{ name: { undefined: 'Inker' } }],
      narrator: [{ name: { undefined: 'Narrator' } }],
      contributor: [{ name: { undefined: 'Contributor' } }],
      publisher: [{ name: { undefined: 'Publisher' } }],
      imprint: [{ name: { undefined: 'Imprint' } }],
      readingProgression: 'rtl',
      description: 'Description',
      duration: 4.24,
      numberOfPages: 240,
      belongsTo: {
        collection: [{ name: { undefined: 'Collection' } }],
        series: [{ name: { undefined: 'Series' } }],
        'schema:Periodical': [{ name: { undefined: 'Periodical' } }],
      },
      'other-metadata1': 'value',
      'other-metadata2': [42],
    });
  });

  it('effectiveReadingProgression falls back on LTR', () => {
    expect(
      new Metadata({
        title: new LocalizedString('Title'),
      }).serialize()
    ).toEqual({
      title: { undefined: 'Title' },
    });
  });

  function createMetadata(values: {
    languages?: string[];
    readingProgression?: ReadingProgression;
  }): Metadata {
    return new Metadata({ title: new LocalizedString('Title'), ...values });
  }

  it('effectiveReadingProgression falls back on LTR', () => {
    const metadata = createMetadata({
      readingProgression: ReadingProgression.auto,
    });
    expect(metadata.effectiveReadingProgression).toEqual(
      ReadingProgression.ltr
    );
  });

  it('effectiveReadingProgression falls back on priveded reading progression', () => {
    const metadata = createMetadata({
      readingProgression: ReadingProgression.rtl,
    });
    expect(metadata.effectiveReadingProgression).toEqual(
      ReadingProgression.rtl
    );
  });

  it('effectiveReadingProgression falls back on priveded reading progression', () => {
    expect(
      createMetadata({
        languages: ['zh-Hant'],
        readingProgression: ReadingProgression.auto,
      }).effectiveReadingProgression
    ).toEqual(ReadingProgression.rtl);
    expect(
      createMetadata({
        languages: ['zh-TW'],
        readingProgression: ReadingProgression.auto,
      }).effectiveReadingProgression
    ).toEqual(ReadingProgression.rtl);
    expect(
      createMetadata({
        languages: ['ar'],
        readingProgression: ReadingProgression.auto,
      }).effectiveReadingProgression
    ).toEqual(ReadingProgression.rtl);
    expect(
      createMetadata({
        languages: ['fa'],
        readingProgression: ReadingProgression.auto,
      }).effectiveReadingProgression
    ).toEqual(ReadingProgression.rtl);
    expect(
      createMetadata({
        languages: ['he'],
        readingProgression: ReadingProgression.auto,
      }).effectiveReadingProgression
    ).toEqual(ReadingProgression.rtl);
    expect(
      createMetadata({
        languages: ['he'],
        readingProgression: ReadingProgression.ltr,
      }).effectiveReadingProgression
    ).toEqual(ReadingProgression.ltr);
  });

  it('effectiveReadingProgression ignores multiple languages', () => {
    expect(
      createMetadata({
        languages: ['ar', 'fa'],
        readingProgression: ReadingProgression.auto,
      }).effectiveReadingProgression
    ).toEqual(ReadingProgression.ltr);
  });

  it('effectiveReadingProgression ignores language case', () => {
    expect(
      createMetadata({
        languages: ['AR'],
        readingProgression: ReadingProgression.auto,
      }).effectiveReadingProgression
    ).toEqual(ReadingProgression.rtl);
  });

  it('effectiveReadingProgression ignores language region, except for Chinese', () => {
    expect(
      createMetadata({
        languages: ['ar-foo'],
        readingProgression: ReadingProgression.auto,
      }).effectiveReadingProgression
    ).toEqual(ReadingProgression.rtl);
    expect(
      createMetadata({
        languages: ['zh-foo'],
        readingProgression: ReadingProgression.auto,
      }).effectiveReadingProgression
    ).toEqual(ReadingProgression.ltr);
  });
});
