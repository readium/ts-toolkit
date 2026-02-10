import {
  Contributor,
  Contributors,
  LocalizedString,
  Metadata,
  BelongsTo,
  Layout,
  Profile,
  ReadingProgression,
  Subject,
  Subjects,
  TDM,
  TDMReservation,
  AltIdentifier
} from '../src';
import { Accessibility, AccessMode, AccessibilityProfile, Feature, Hazard, Exemption, PrimaryAccessMode, Certification } from '../src/publication/accessibility/Accessibility';

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
        altIdentifier: { scheme: 'http://example.com/scheme', value: 'test-1234' },
        '@type': 'epub',
        conformsTo: 'https://readium.org/webpub-manifest/profiles/epub',
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
        layout: 'fixed',
        readingProgression: 'rtl',
        description: 'Description',
        duration: 4.24,
        numberOfPages: 240,
        tdm: {
          reservation: 'all',
          policy: 'Some policy text',
        },
        belongsTo: {
          collection: 'Collection',
          series: 'Series',
          'schema:Periodical': 'Periodical',
          'schema:Newspaper': ['Newspaper 1', 'Newspaper 2'],
        },
        'other-metadata1': 'value',
        'other-metadata2': [42],
        accessibility: {
          conformsTo: ['http://www.idpf.org/epub/a11y/accessibility-20170105.html#wcag-aa'],
          accessMode: ['textual', 'visual'],
          accessModeSufficient: [
              ["textual"],
              ["visual"]
          ],
          feature: ['alternativeText', 'ARIA'],
          hazard: ['noFlashingHazard'],
          exemption: ['eaa-disproportionate-burden'],
          certification: {
            certifiedBy: 'Certifier',
            credential: 'Certification',
            report: 'https://example.com/report'
          },
          summary: 'This publication is accessible with text-to-speech and screen reader support'
        }
      })
    ).toEqual(
      new Metadata({
        identifier: '1234',
        altIdentifier: new AltIdentifier({
          scheme: 'http://example.com/scheme',
          value: 'test-1234',
        }),
        typeUri: 'epub',
        conformsTo: [Profile.EPUB],
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
        layout: Layout.fixed,
        readingProgression: ReadingProgression.rtl,
        description: 'Description',
        duration: 4.24,
        numberOfPages: 240,
        tdm: new TDM({
          reservation: TDMReservation.all,
          policy: 'Some policy text',
        }),
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
        accessibility: new Accessibility({
          conformsTo: [AccessibilityProfile.EPUB_A11Y_10_WCAG_20_AA],
          certification: new Certification(
            'Certifier',
            'Certification',
            'https://example.com/report'
          ),
          summary: 'This publication is accessible with text-to-speech and screen reader support',
          accessMode: [new AccessMode('textual'), new AccessMode('visual')],
          accessModeSufficient: [
            new PrimaryAccessMode(['textual']),
            new PrimaryAccessMode(['visual'])
          ],
          feature: [new Feature('alternativeText'), new Feature('ARIA')],
          hazard: [new Hazard('noFlashingHazard')],
          exemption: [new Exemption('eaa-disproportionate-burden')]
        }),
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
      title: { und: 'Title' },
    });
  });

  it('get full JSON', () => {
    expect(
      new Metadata({
        identifier: '1234',
        altIdentifier: new AltIdentifier({
          scheme: 'http://example.com/scheme',
          value: 'test-1234',
        }),
        typeUri: 'epub',
        conformsTo: [Profile.EPUB],
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
        layout: Layout.fixed,
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
        tdm: new TDM({
          reservation: TDMReservation.all,
          policy: 'Some policy text',
        }),
        otherMetadata: {
          'other-metadata1': 'value',
          'other-metadata2': [42],
        },
        accessibility: new Accessibility({
          conformsTo: [AccessibilityProfile.EPUB_A11Y_10_WCAG_20_AA],
          certification: new Certification(
            'Certifier',
            'Certification',
            'https://example.com/report'
          ),
          summary: 'This publication is accessible with text-to-speech and screen reader support',
          accessMode: [new AccessMode('textual'), new AccessMode('visual')],
          accessModeSufficient: [
            new PrimaryAccessMode(['textual']),
            new PrimaryAccessMode(['visual'])
          ],
          feature: [new Feature('alternativeText'), new Feature('ARIA')],
          hazard: [new Hazard('noFlashingHazard')],
          exemption: [new Exemption('eaa-disproportionate-burden')]
        })
      }).serialize()
    ).toEqual({
      identifier: '1234',
      altIdentifier: { scheme: 'http://example.com/scheme', value: 'test-1234' },
      '@type': 'epub',
      conformsTo: ['https://readium.org/webpub-manifest/profiles/epub'],
      title: { en: 'Title', fr: 'Titre' },
      subtitle: { en: 'Subtitle', fr: 'Sous-titre' },
      modified: '2001-01-01T12:36:27.000Z',
      published: '2001-01-02T12:36:27.000Z',
      language: ['en', 'fr'],
      sortAs: { en: 'sort key', fr: 'clé de tri' },
      subject: [
        { name: { und: 'Science Fiction' } },
        { name: { und: 'Fantasy' } },
      ],
      author: [{ name: { und: 'Author' } }],
      translator: [{ name: { und: 'Translator' } }],
      editor: [{ name: { und: 'Editor' } }],
      artist: [{ name: { und: 'Artist' } }],
      illustrator: [{ name: { und: 'Illustrator' } }],
      letterer: [{ name: { und: 'Letterer' } }],
      penciler: [{ name: { und: 'Penciler' } }],
      colorist: [{ name: { und: 'Colorist' } }],
      inker: [{ name: { und: 'Inker' } }],
      narrator: [{ name: { und: 'Narrator' } }],
      contributor: [{ name: { und: 'Contributor' } }],
      publisher: [{ name: { und: 'Publisher' } }],
      imprint: [{ name: { und: 'Imprint' } }],
      layout: 'fixed',
      readingProgression: 'rtl',
      description: 'Description',
      duration: 4.24,
      numberOfPages: 240,
      belongsTo: {
        collection: [{ name: { und: 'Collection' } }],
        series: [{ name: { und: 'Series' } }],
        'schema:Periodical': [{ name: { und: 'Periodical' } }],
      },
      tdm: {
        reservation: 'all',
        policy: 'Some policy text',
      },
      'other-metadata1': 'value',
      'other-metadata2': [42],
      accessibility: {
        conformsTo: ['http://www.idpf.org/epub/a11y/accessibility-20170105.html#wcag-aa'],
        accessMode: ['textual', 'visual'],
        accessModeSufficient: [
            ["textual"],
            ["visual"]
        ],
        feature: ['alternativeText', 'ARIA'],
        hazard: ['noFlashingHazard'],
        exemption: ['eaa-disproportionate-burden'],
        certification: {
          certifiedBy: 'Certifier',
          credential: 'Certification',
          report: 'https://example.com/report'
        },
        summary: 'This publication is accessible with text-to-speech and screen reader support'
      }
    });
  });

  it('effectiveReadingProgression falls back on LTR', () => {
    expect(
      new Metadata({
        title: new LocalizedString('Title'),
      }).serialize()
    ).toEqual({
      title: { und: 'Title' }
    });
  });

  function createMetadata(values: {
    languages?: string[];
    readingProgression?: ReadingProgression;
  }): Metadata {
    return new Metadata({ title: new LocalizedString('Title'), ...values });
  }

  it('effectiveReadingProgression falls back on LTR', () => {
    const metadata = createMetadata({});
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
      }).effectiveReadingProgression
    ).toEqual(ReadingProgression.rtl);
    expect(
      createMetadata({
        languages: ['zh-TW'],
      }).effectiveReadingProgression
    ).toEqual(ReadingProgression.rtl);
    expect(
      createMetadata({
        languages: ['ar'],
      }).effectiveReadingProgression
    ).toEqual(ReadingProgression.rtl);
    expect(
      createMetadata({
        languages: ['fa'],
      }).effectiveReadingProgression
    ).toEqual(ReadingProgression.rtl);
    expect(
      createMetadata({
        languages: ['he'],
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
      }).effectiveReadingProgression
    ).toEqual(ReadingProgression.ltr);
  });

  it('effectiveReadingProgression ignores language case', () => {
    expect(
      createMetadata({
        languages: ['AR'],
      }).effectiveReadingProgression
    ).toEqual(ReadingProgression.rtl);
  });

  it('effectiveReadingProgression ignores language region, except for Chinese', () => {
    expect(
      createMetadata({
        languages: ['ar-foo'],
      }).effectiveReadingProgression
    ).toEqual(ReadingProgression.rtl);
    expect(
      createMetadata({
        languages: ['zh-foo'],
      }).effectiveReadingProgression
    ).toEqual(ReadingProgression.ltr);
  });

  it('effectiveLayout returns null for Web Publication', () => {
    const metadata = new Metadata({
      title: new LocalizedString('Title'),
    });
    expect(metadata.effectiveLayout).toBeNull();
  });

  it('effectiveLayout returns null for PDF profile', () => {
    const metadata = new Metadata({
      title: new LocalizedString('Title'),
      conformsTo: [Profile.PDF],
      layout: Layout.fixed,
    });
    expect(metadata.effectiveLayout).toBeNull();
  });

  it('effectiveLayout returns null for Audiobook profile', () => {
    const metadata = new Metadata({
      title: new LocalizedString('Title'),
      conformsTo: [Profile.AUDIOBOOK],
      layout: Layout.reflowable,
    });
    expect(metadata.effectiveLayout).toBeNull();
  });

  it('effectiveLayout returns reflowable for EPUB profile without layout', () => {
    const metadata = new Metadata({
      title: new LocalizedString('Title'),
      conformsTo: [Profile.EPUB],
    });
    expect(metadata.effectiveLayout).toBe(Layout.reflowable);
  });

  it('effectiveLayout returns explicit layout for EPUB profile', () => {
    const metadata = new Metadata({
      title: new LocalizedString('Title'),
      conformsTo: [Profile.EPUB],
      layout: Layout.fixed,
    });
    expect(metadata.effectiveLayout).toBe(Layout.fixed);
  });

  it('effectiveLayout returns fixed for Divina profile without layout', () => {
    const metadata = new Metadata({
      title: new LocalizedString('Title'),
      conformsTo: [Profile.DIVINA],
    });
    expect(metadata.effectiveLayout).toBe(Layout.fixed);
  });

  it('effectiveLayout ignores reflowable layout for Divina profile', () => {
    const metadata = new Metadata({
      title: new LocalizedString('Title'),
      conformsTo: [Profile.DIVINA],
      layout: Layout.reflowable,
    });
    expect(metadata.effectiveLayout).toBe(Layout.fixed);
  });

  it('effectiveLayout returns explicit layout for Divina profile', () => {
    const metadata = new Metadata({
      title: new LocalizedString('Title'),
      conformsTo: [Profile.DIVINA],
      layout: Layout.scrolled,
    });
    expect(metadata.effectiveLayout).toBe(Layout.scrolled);
  });

  it('effectiveLayout stops at first matching profile', () => {
    const metadata = new Metadata({
      title: new LocalizedString('Title'),
      conformsTo: [Profile.EPUB, Profile.DIVINA],
      layout: Layout.fixed,
    });
    expect(metadata.effectiveLayout).toBe(Layout.fixed);
  });
});
