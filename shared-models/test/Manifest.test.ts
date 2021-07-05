import {
  Link,
  Links,
  LocalizedString,
  Manifest,
  Metadata,
  PublicationCollection,
} from '../src';

describe('Manifest Tests', () => {
  it('parse minimal JSON', () => {
    expect(
      Manifest.deserialize({
        metadata: { title: 'Title' },
        links: [],
        readingOrder: [],
      })
    ).toEqual(
      new Manifest({
        metadata: new Metadata({ title: new LocalizedString('Title') }),
        links: new Links([]),
        readingOrder: new Links([]),
      })
    );
  });

  it('parse full JSON', () => {
    expect(
      Manifest.deserialize({
        '@context': 'https://readium.org/webpub-manifest/context.jsonld',
        metadata: { title: 'Title' },
        links: [{ href: '/manifest.json', rel: 'self' }],
        readingOrder: [{ href: '/chap1.html', type: 'text/html' }],
        resources: [{ href: '/image.png', type: 'image/png' }],
        toc: [{ href: '/cover.html' }, { href: '/chap1.html' }],
        sub: {
          links: [{ href: '/sublink' }],
        },
      })
    ).toEqual(
      new Manifest({
        context: ['https://readium.org/webpub-manifest/context.jsonld'],
        metadata: new Metadata({ title: new LocalizedString('Title') }),
        links: new Links([
          new Link({ href: '/manifest.json', rels: new Set(['self']) }),
        ]),
        readingOrder: new Links([
          new Link({ href: '/chap1.html', type: 'text/html' }),
        ]),
        resources: new Links([
          new Link({ href: '/image.png', type: 'image/png' }),
        ]),
        tableOfContents: new Links([
          new Link({ href: '/cover.html' }),
          new Link({ href: '/chap1.html' }),
        ]),
        subcollections: new Map([
          [
            'sub',
            [
              new PublicationCollection({
                links: new Links([new Link({ href: '/sublink' })]),
              }),
            ],
          ],
        ]),
      })
    );
  });

  it('parse JSON {context} as array', () => {
    expect(
      Manifest.deserialize({
        '@context': ['context1', 'context2'],
        metadata: { title: 'Title' },
        links: [{ href: '/manifest.json', rel: 'self' }],
        readingOrder: [{ href: '/chap1.html', type: 'text/html' }],
      })
    ).toEqual(
      new Manifest({
        context: ['context1', 'context2'],
        metadata: new Metadata({ title: new LocalizedString('Title') }),
        links: new Links([
          new Link({ href: '/manifest.json', rels: new Set(['self']) }),
        ]),
        readingOrder: new Links([
          new Link({ href: '/chap1.html', type: 'text/html' }),
        ]),
      })
    );
  });

  it('parse JSON requires {metadata}', () => {
    expect(
      Manifest.deserialize({
        links: [{ href: '/manifest.json', rel: 'self' }],
        readingOrder: [{ href: '/chap1.html', type: 'text/html' }],
      })
    ).toBeUndefined();
  });

  // {readingOrder} used to be {spine}, so we parse {spine} as a fallback.
  it('parse JSON {spine} as {readingOrder}', () => {
    expect(
      Manifest.deserialize({
        metadata: { title: 'Title' },
        links: [{ href: '/manifest.json', rel: 'self' }],
        spine: [{ href: '/chap1.html', type: 'text/html' }],
      })
    ).toEqual(
      new Manifest({
        metadata: new Metadata({ title: new LocalizedString('Title') }),
        links: new Links([
          new Link({ href: '/manifest.json', rels: new Set(['self']) }),
        ]),
        readingOrder: new Links([
          new Link({ href: '/chap1.html', type: 'text/html' }),
        ]),
      })
    );
  });

  it('get minimal JSON', () => {
    expect(
      new Manifest({
        metadata: new Metadata({ title: new LocalizedString('Title') }),
        links: new Links([]),
        readingOrder: new Links([]),
      }).serialize()
    ).toEqual({
      metadata: { title: { undefined: 'Title' } },
      links: [],
      readingOrder: [],
    });
  });

  it('parse full JSON', () => {
    expect(
      new Manifest({
        context: ['https://readium.org/webpub-manifest/context.jsonld'],
        metadata: new Metadata({ title: new LocalizedString('Title') }),
        links: new Links([
          new Link({ href: '/manifest.json', rels: new Set(['self']) }),
        ]),
        readingOrder: new Links([
          new Link({ href: '/chap1.html', type: 'text/html' }),
        ]),
        resources: new Links([
          new Link({ href: '/image.png', type: 'image/png' }),
        ]),
        tableOfContents: new Links([
          new Link({ href: '/cover.html' }),
          new Link({ href: '/chap1.html' }),
        ]),
        subcollections: new Map([
          [
            'sub',
            [
              new PublicationCollection({
                links: new Links([new Link({ href: '/sublink' })]),
              }),
            ],
          ],
        ]),
      }).serialize()
    ).toEqual({
      '@context': ['https://readium.org/webpub-manifest/context.jsonld'],
      metadata: { title: { undefined: 'Title' } },
      links: [{ href: '/manifest.json', rel: ['self'] }],
      readingOrder: [{ href: '/chap1.html', type: 'text/html' }],
      resources: [{ href: '/image.png', type: 'image/png' }],
      toc: [{ href: '/cover.html' }, { href: '/chap1.html' }],
      sub: {
        links: [{ href: '/sublink' }],
      },
    });
  });
});
