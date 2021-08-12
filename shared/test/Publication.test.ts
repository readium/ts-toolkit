import {
  Link,
  Links,
  LocalizedString,
  Manifest,
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
            values?.readingProgression || ReadingProgression.auto,
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
});
