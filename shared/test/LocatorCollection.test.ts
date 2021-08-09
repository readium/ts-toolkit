import {
  Link,
  Links,
  LocalizedString,
  LocatorLocations,
  Locator,
  LocatorCollection,
  LocatorCollectionMetadata,
  LocatorText,
} from '../src';

describe('Locator Collection Tests', () => {
  it('parse {LocatorCollection} minimal JSON', () => {
    expect(LocatorCollection.deserialize({})).toEqual(
      new LocatorCollection({})
    );
  });

  it('parse {LocatorCollection} full JSON', () => {
    expect(
      LocatorCollection.deserialize({
        metadata: {
          title: {
            en: 'Searching <riddle> in Alice in Wonderlands - Page 1',
            fr: 'Recherche <riddle> dans Alice in Wonderlands – Page 1',
          },
          numberOfItems: 3,
          extraMetadata: 'value',
        },
        links: [
          {
            rel: 'self',
            href: '/978-1503222687/search?query=apple',
            type: 'application/vnd.readium.locators+json',
          },
          {
            rel: 'next',
            href: '/978-1503222687/search?query=apple&page=2',
            type: 'application/vnd.readium.locators+json',
          },
        ],
        locators: [
          {
            href: '/978-1503222687/chap7.html',
            type: 'application/xhtml+xml',
            locations: {
              fragments: [":~:text=riddle,-yet%3F'"],
              progression: 0.43,
            },
            text: {
              before: "'Have you guessed the ",
              highlight: 'riddle',
              after: " yet?' the Hatter said, turning to Alice again.",
            },
          },
          {
            href: '/978-1503222687/chap7.html',
            type: 'application/xhtml+xml',
            locations: {
              fragments: [':~:text=in%20asking-,riddles'],
              progression: 0.47,
            },
            text: {
              before: "I'm glad they've begun asking ",
              highlight: 'riddles',
              after: '.--I believe I can guess that,',
            },
          },
        ],
      })
    ).toEqual(
      new LocatorCollection({
        metadata: new LocatorCollectionMetadata({
          title: new LocalizedString({
            en: 'Searching <riddle> in Alice in Wonderlands - Page 1',
            fr: 'Recherche <riddle> dans Alice in Wonderlands – Page 1',
          }),
          numberOfItems: 3,
          otherMetadata: new Map([['extraMetadata', 'value']]),
        }),
        links: new Links([
          new Link({
            rels: new Set(['self']),
            href: '/978-1503222687/search?query=apple',
            type: 'application/vnd.readium.locators+json',
          }),
          new Link({
            rels: new Set(['next']),
            href: '/978-1503222687/search?query=apple&page=2',
            type: 'application/vnd.readium.locators+json',
          }),
        ]),
        locators: [
          new Locator({
            href: '/978-1503222687/chap7.html',
            type: 'application/xhtml+xml',
            locations: new LocatorLocations({
              fragments: [":~:text=riddle,-yet%3F'"],
              progression: 0.43,
            }),
            text: new LocatorText({
              before: "'Have you guessed the ",
              highlight: 'riddle',
              after: " yet?' the Hatter said, turning to Alice again.",
            }),
          }),
          new Locator({
            href: '/978-1503222687/chap7.html',
            type: 'application/xhtml+xml',
            locations: new LocatorLocations({
              fragments: [':~:text=in%20asking-,riddles'],
              progression: 0.47,
            }),
            text: new LocatorText({
              before: "I'm glad they've begun asking ",
              highlight: 'riddles',
              after: '.--I believe I can guess that,',
            }),
          }),
        ],
      })
    );
  });

  it('get {LocatorCollection} minimal JSON', () => {
    expect(new LocatorCollection({}).serialize()).toEqual({ locators: [] });
  });

  it('get {LocatorCollection} full JSON', () => {
    expect(
      new LocatorCollection({
        metadata: new LocatorCollectionMetadata({
          title: new LocalizedString({
            en: 'Searching <riddle> in Alice in Wonderlands - Page 1',
            fr: 'Recherche <riddle> dans Alice in Wonderlands – Page 1',
          }),
          numberOfItems: 3,
          otherMetadata: new Map([['extraMetadata', 'value']]),
        }),
        links: new Links([
          new Link({
            rels: new Set(['self']),
            href: '/978-1503222687/search?query=apple',
            type: 'application/vnd.readium.locators+json',
          }),
          new Link({
            rels: new Set(['next']),
            href: '/978-1503222687/search?query=apple&page=2',
            type: 'application/vnd.readium.locators+json',
          }),
        ]),
        locators: [
          new Locator({
            href: '/978-1503222687/chap7.html',
            type: 'application/xhtml+xml',
            locations: new LocatorLocations({
              fragments: [":~:text=riddle,-yet%3F'"],
              progression: 0.43,
            }),
            text: new LocatorText({
              before: "'Have you guessed the ",
              highlight: 'riddle',
              after: " yet?' the Hatter said, turning to Alice again.",
            }),
          }),
          new Locator({
            href: '/978-1503222687/chap7.html',
            type: 'application/xhtml+xml',
            locations: new LocatorLocations({
              fragments: [':~:text=in%20asking-,riddles'],
              progression: 0.47,
            }),
            text: new LocatorText({
              before: "I'm glad they've begun asking ",
              highlight: 'riddles',
              after: '.--I believe I can guess that,',
            }),
          }),
        ],
      }).serialize()
    ).toEqual({
      metadata: {
        title: {
          en: 'Searching <riddle> in Alice in Wonderlands - Page 1',
          fr: 'Recherche <riddle> dans Alice in Wonderlands – Page 1',
        },
        numberOfItems: 3,
        extraMetadata: 'value',
      },
      links: [
        {
          rel: ['self'],
          href: '/978-1503222687/search?query=apple',
          type: 'application/vnd.readium.locators+json',
        },
        {
          rel: ['next'],
          href: '/978-1503222687/search?query=apple&page=2',
          type: 'application/vnd.readium.locators+json',
        },
      ],
      locators: [
        {
          href: '/978-1503222687/chap7.html',
          type: 'application/xhtml+xml',
          locations: {
            fragments: [":~:text=riddle,-yet%3F'"],
            progression: 0.43,
          },
          text: {
            before: "'Have you guessed the ",
            highlight: 'riddle',
            after: " yet?' the Hatter said, turning to Alice again.",
          },
        },
        {
          href: '/978-1503222687/chap7.html',
          type: 'application/xhtml+xml',
          locations: {
            fragments: [':~:text=in%20asking-,riddles'],
            progression: 0.47,
          },
          text: {
            before: "I'm glad they've begun asking ",
            highlight: 'riddles',
            after: '.--I believe I can guess that,',
          },
        },
      ],
    });
  });
});
