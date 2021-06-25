import { Link, Links, LocalizedString, Manifest, Metadata } from '../src';

describe('Manifest Tests', () => {
  it('parse minimal JSON', () => {
    expect(
      new Manifest({
        metadata: new Metadata({ title: new LocalizedString('Title') }),
        links: new Links([]),
        readingOrder: new Links([]),
      })
    ).toEqual(
      Manifest.fromJSON({
        metadata: { title: 'Title' },
        links: [],
        readingOrder: [],
      })
    );
  });

  //TODO : add sub collections
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
      })
    ).toEqual(
      Manifest.fromJSON({
        '@context': 'https://readium.org/webpub-manifest/context.jsonld',
        metadata: { title: 'Title' },
        links: [{ href: '/manifest.json', rel: 'self' }],
        readingOrder: [{ href: '/chap1.html', type: 'text/html' }],
        resources: [{ href: '/image.png', type: 'image/png' }],
        toc: [{ href: '/cover.html' }, { href: '/chap1.html' }],
      })
    );
  });
});
