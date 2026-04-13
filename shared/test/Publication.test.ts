import {
  Link,
  Links,
  LocalizedString,
  Manifest,
  MediaType,
  Metadata,
  Publication,
  ReadingProgression,
} from '../src';

describe('Publication Tests', () => {
  function createPublication(values?: {
    title?: string;
    language?: string;
    readingProgression?: ReadingProgression;
    links?: Links;
    readingOrder?: Links;
    resources?: Links;
  }): Publication {
    return new Publication({
      manifest: new Manifest({
        metadata: new Metadata({
          title: new LocalizedString(values?.title || 'Title'),
          languages: [values?.language || 'en'],
          readingProgression:
            values?.readingProgression,
        }),
        links: values?.links || new Links([]),
        readingOrder: values?.readingOrder || new Links([]),
        resources: values?.resources || new Links([]),
      }),
    });
  }

  it('get {baseUrl} computes the URL from the {self} link', () => {
    let publication = createPublication({
      links: new Links([
        new Link({
          href: 'http://domain.com/path/manifest.json',
          rels: new Set(['self']),
        }),
      ]),
    });
    expect(publication.baseURL).toEqual('http://domain.com/path/');
  });

  it('get {baseUrl} when missing', () => {
    let publication = createPublication();
    expect(publication.baseURL).toBeUndefined();
  });

  it("get {baseUrl} when it's a root", () => {
    let publication = createPublication({
      links: new Links([
        new Link({
          href: 'http://domain.com/manifest.json',
          rels: new Set(['self']),
        }),
      ]),
    });
    expect(publication.baseURL).toEqual('http://domain.com/');
  });

  it('find the first {Link} with the given {rel}', () => {
    const link1 = new Link({ href: 'found', rels: new Set(['rel1']) });
    const link2 = new Link({ href: 'found', rels: new Set(['rel2']) });
    const link3 = new Link({ href: 'found', rels: new Set(['rel3']) });

    let publication = createPublication({
      links: new Links([new Link({ href: 'other' }), link1]),
      readingOrder: new Links([new Link({ href: 'other' }), link2]),
      resources: new Links([new Link({ href: 'other' }), link3]),
    });

    expect(publication.linkWithRel('rel1')).toEqual(link1);
    expect(publication.linkWithRel('rel2')).toEqual(link2);
    expect(publication.linkWithRel('rel3')).toEqual(link3);
  });

  it('find the first {Link} with the given {rel} when missing', () => {
    expect(createPublication().linkWithRel('foobar')).toBeUndefined();
  });

  it('find all the links with the given {rel}', () => {
    let publication = createPublication({
      links: new Links([
        new Link({ href: 'l1' }),
        new Link({ href: 'l2', rels: new Set(['rel1']) }),
      ]),
      readingOrder: new Links([
        new Link({ href: 'l3' }),
        new Link({ href: 'l4', rels: new Set(['rel1']) }),
      ]),
      resources: new Links([
        new Link({
          href: 'l5',
          alternates: new Links([
            new Link({ href: 'alternate', rels: new Set(['rel1']) }),
          ]),
        }),
        new Link({ href: 'l6', rels: new Set(['rel1']) }),
      ]),
    });

    expect(publication.linksWithRel('rel1')).toEqual([
      new Link({ href: 'l4', rels: new Set(['rel1']) }),
      new Link({ href: 'l6', rels: new Set(['rel1']) }),
      new Link({ href: 'l2', rels: new Set(['rel1']) }),
    ]);
  });

  it('find all the links with the given {rel} when not found', () => {
    expect(createPublication().linksWithRel('foobar')).toEqual([]);
  });

  it('find the first {Link} with the given {href}', () => {
    const link1 = new Link({ href: 'href1' });
    const link2 = new Link({ href: 'href2' });
    const link3 = new Link({ href: 'href3' });
    const link4 = new Link({ href: 'href4' });
    const link5 = new Link({ href: 'href5' });

    let publication = createPublication({
      links: new Links([new Link({ href: 'other' }), link1]),
      readingOrder: new Links([
        new Link({
          href: 'other',
          alternates: new Links([
            new Link({ href: 'alt1', alternates: new Links([link2]) }),
          ]),
        }),
        link3,
      ]),

      resources: new Links([
        new Link({
          href: 'other',
          alternates: new Links([
            new Link({ href: 'alt1', alternates: new Links([link4]) }),
          ]),
        }),
        link5,
      ]),
    });

    expect(publication.linkWithHref('href1')).toEqual(link1);
    expect(publication.linkWithHref('href2')).toEqual(link2);
    expect(publication.linkWithHref('href3')).toEqual(link3);
    expect(publication.linkWithHref('href4')).toEqual(link4);
    expect(publication.linkWithHref('href5')).toEqual(link5);
  });

  it('find the first {Link} with the given {href} without anchor', () => {
    const link = new Link({ href: 'http://example.com/index.html' });

    let publication = createPublication({
      readingOrder: new Links([new Link({ href: 'other' }), link]),
    });

    expect(
      publication.linkWithHref('http://example.com/index.html#sec1')
    ).toEqual(link);
  });

  it('find the first {Link} with the given {href} when missing', () => {
    expect(createPublication().linkWithHref('foobar')).toBeUndefined();
  });

  describe('getCover', () => {
    it('returns undefined when there are no images and no cover rel', () => {
      expect(createPublication().getCover()).toBeUndefined();
    });

    it('returns the link with rel=cover from links', () => {
      const cover = new Link({ href: 'cover.jpg', rels: new Set(['cover']), type: 'image/jpeg' });
      const pub = createPublication({
        links: new Links([new Link({ href: 'other.jpg', type: 'image/jpeg' }), cover]),
      });
      expect(pub.getCover()).toEqual(cover);
    });

    it('returns the link with rel=cover from resources', () => {
      const cover = new Link({ href: 'cover.png', rels: new Set(['cover']), type: 'image/png' });
      const pub = createPublication({
        resources: new Links([cover]),
      });
      expect(pub.getCover()).toEqual(cover);
    });

    it('returns the link with rel=cover from readingOrder', () => {
      const cover = new Link({ href: 'cover.png', rels: new Set(['cover']), type: 'image/png' });
      const pub = createPublication({
        readingOrder: new Links([cover]),
      });
      expect(pub.getCover()).toEqual(cover);
    });

    it('prefers rel=cover in links over an image in resources', () => {
      const coverRel = new Link({ href: 'cover-rel.jpg', rels: new Set(['cover']), type: 'image/jpeg' });
      const imageResource = new Link({ href: 'image.jpg', type: 'image/jpeg' });
      const pub = createPublication({
        links: new Links([coverRel]),
        resources: new Links([imageResource]),
      });
      expect(pub.getCover()).toEqual(coverRel);
    });

    it('falls back to a JPEG image when no cover rel is present', () => {
      const jpeg = new Link({ href: 'photo.jpg', type: 'image/jpeg' });
      const pub = createPublication({ resources: new Links([jpeg]) });
      expect(pub.getCover()).toEqual(jpeg);
    });

    it('falls back to a PNG image when no cover rel is present', () => {
      const png = new Link({ href: 'image.png', type: 'image/png' });
      const pub = createPublication({ resources: new Links([png]) });
      expect(pub.getCover()).toEqual(png);
    });

    it('falls back to an AVIF image when no cover rel is present', () => {
      const avif = new Link({ href: 'image.avif', type: MediaType.AVIF.string });
      const pub = createPublication({ resources: new Links([avif]) });
      expect(pub.getCover()).toEqual(avif);
    });

    it('falls back to an SVG image when no cover rel is present', () => {
      const svg = new Link({ href: 'cover.svg', type: MediaType.SVG.string });
      const pub = createPublication({ resources: new Links([svg]) });
      expect(pub.getCover()).toEqual(svg);
    });

    it('searches links before resources before readingOrder in image fallback', () => {
      const inLinks = new Link({ href: 'links.jpg', type: 'image/jpeg' });
      const inResources = new Link({ href: 'resources.jpg', type: 'image/jpeg' });
      const inReadingOrder = new Link({ href: 'ro.jpg', type: 'image/jpeg' });
      const pub = createPublication({
        links: new Links([inLinks]),
        resources: new Links([inResources]),
        readingOrder: new Links([inReadingOrder]),
      });
      expect(pub.getCover()).toEqual(inLinks);
    });

    it('returns undefined when only non-image resources are present', () => {
      const pub = createPublication({
        resources: new Links([new Link({ href: 'chapter.html', type: 'text/html' })]),
      });
      expect(pub.getCover()).toBeUndefined();
    });
  });
});
