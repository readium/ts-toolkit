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
        toc: [{ href: '/cover.html' }, { href: '/chap1.html' }, {
          href: '',
          children: [{ href: '/chap2.html' }, { href: '/chap3.html' }],
        }],
        pageList: [{ href: '/page1.html' }],
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
        toc: new Links([
          new Link({ href: '/cover.html' }),
          new Link({ href: '/chap1.html' }),
          new Link({ href: '', children: new Links([
              new Link({ href: '/chap2.html' }),
              new Link({ href: '/chap3.html' }),
            ])
          }),
        ]),
        subcollections: new Map([
          [
            'pageList',
            [
              new PublicationCollection({
                links: new Links([new Link({ href: '/page1.html' })]),
              }),
            ],
          ],
        ]),
      })
    );
  });

  it('parse JSON without {links}', () => {
    expect(
      Manifest.deserialize({
        metadata: { title: 'Title' },
        readingOrder: [{ href: '/chap1.html', type: 'text/html' }],
      })
    ).toEqual(
      new Manifest({
        metadata: new Metadata({ title: new LocalizedString('Title') }),
        readingOrder: new Links([
          new Link({ href: '/chap1.html', type: 'text/html' }),
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
      metadata: { title: { und: 'Title' } },
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
        toc: new Links([
          new Link({ href: '/cover.html' }),
          new Link({ href: '/chap1.html' }),
          new Link({ href: '', children: new Links([
            new Link({ href: '/chap2.html' }),
            new Link({ href: '/chap3.html' }),
          ]) }),
        ]),
        subcollections: new Map([
          [
            'pageList',
            [
              new PublicationCollection({
                links: new Links([new Link({ href: '/page1.html' })]),
              }),
            ],
          ],
        ]),
      }).serialize()
    ).toEqual({
      '@context': ['https://readium.org/webpub-manifest/context.jsonld'],
      metadata: { title: { und: 'Title' } },
      links: [{ href: '/manifest.json', rel: ['self'] }],
      readingOrder: [{ href: '/chap1.html', type: 'text/html' }],
      resources: [{ href: '/image.png', type: 'image/png' }],
      toc: [
        { href: '/cover.html' },
        { href: '/chap1.html' },
        { href: '', children: [{ href: '/chap2.html' }, { href: '/chap3.html' }] },
      ],
      pageList: {
        links: [{ href: '/page1.html' }],
      },
    });
  });

  describe('baseURL', () => {
    const manifestWithSelf = (href: string) =>
      new Manifest({
        metadata: new Metadata({ title: new LocalizedString('Title') }),
        links: new Links([new Link({ href, rels: new Set(['self']) })]),
        readingOrder: new Links([]),
      });

    it('strips the manifest filename', () => {
      expect(
        manifestWithSelf('https://provider.com/pub1293/manifest.json').baseURL
      ).toEqual('https://provider.com/pub1293/');
    });

    it('strips a query string along with the filename', () => {
      expect(
        manifestWithSelf(
          'https://provider.com/pub1293/manifest.json?token=abc'
        ).baseURL
      ).toEqual('https://provider.com/pub1293/');
    });

    // Regression: the last "/" used to be found inside the query value, so the
    // manifest filename survived into the base and the frame CSP blocked every
    // resource in the publication.
    it('strips a query containing an unencoded URL', () => {
      expect(
        manifestWithSelf(
          'https://provider.com/pub1293/manifest.json?origin=https://provider.com'
        ).baseURL
      ).toEqual('https://provider.com/pub1293/');
    });

    it('strips a fragment along with the filename', () => {
      expect(
        manifestWithSelf('https://provider.com/pub1293/manifest.json#frag')
          .baseURL
      ).toEqual('https://provider.com/pub1293/');
    });

    it('keeps nested directories', () => {
      expect(
        manifestWithSelf('https://provider.com/a/b/c/manifest.json').baseURL
      ).toEqual('https://provider.com/a/b/c/');
    });

    it('returns a trailing slash for a root-level manifest', () => {
      expect(
        manifestWithSelf('https://provider.com/manifest.json').baseURL
      ).toEqual('https://provider.com/');
    });

    it('returns the origin root when the self link has no path', () => {
      expect(manifestWithSelf('https://provider.com').baseURL).toEqual(
        'https://provider.com/'
      );
    });

    it('handles a relative self link', () => {
      expect(manifestWithSelf('/manifest.json').baseURL).toEqual('/');
    });

    it('handles a relative self link in a subdirectory', () => {
      expect(manifestWithSelf('/pub1293/manifest.json').baseURL).toEqual(
        '/pub1293/'
      );
    });

    it('is undefined without a self link', () => {
      expect(
        new Manifest({
          metadata: new Metadata({ title: new LocalizedString('Title') }),
          links: new Links([new Link({ href: '/cover.jpg' })]),
          readingOrder: new Links([]),
        }).baseURL
      ).toBeUndefined();
    });

    it('is undefined when the self link has an empty href', () => {
      expect(manifestWithSelf('').baseURL).toBeUndefined();
    });

    it('always ends in a slash, so a resource resolves beneath it', () => {
      const base = manifestWithSelf(
        'https://provider.com/pub1293/manifest.json?origin=https://provider.com'
      ).baseURL!;
      expect(base.endsWith('/')).toBe(true);
      expect(
        new Link({ href: 'OPS/images/page_000.jpg' }).toURL(base)
      ).toEqual('https://provider.com/pub1293/OPS/images/page_000.jpg');
    });
  });
});
