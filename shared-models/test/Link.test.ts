import { Link, Links } from '../src';
import { Properties } from '../src/Publication/Properties';

describe('Link Tests', () => {
  it('templateParameters works fine', () => {
    expect(
      new Link({
        href: '/url{?x,hello,y}name{z,y,w}',
        templated: true,
      }).getTemplateParameters()
    ).toEqual(new Set(['x', 'hello', 'y', 'z', 'w']));
  });

  it('expand works fine', () => {
    expect(
      new Link({
        href: '/url{?x,hello,y}name',
        templated: true,
      }).expandTemplate({
        x: 'aaa',
        hello: 'Hello, world',
        y: 'b',
      })
    ).toEqual(
      new Link({
        href: '/url?x=aaa&hello=Hello%2C%20world&y=bname',
        templated: false,
      })
    );
  });

  it('parse minimal JSON', () => {
    expect(Link.fromJSON({ href: 'http://href' })).toEqual(
      new Link({
        href: 'http://href',
      })
    );
  });

  it('parse full JSON', () => {
    expect(
      Link.fromJSON({
        href: 'http://href',
        type: 'application/pdf',
        templated: true,
        title: 'Link Title',
        rel: ['publication', 'cover'],
        properties: {
          orientation: 'landscape',
        },
        height: 1024,
        width: 768,
        bitrate: 74.2,
        duration: 45.6,
        language: 'fr',
        alternate: [{ href: '/alternate1' }, { href: '/alternate2' }],
        children: [{ href: 'http://child1' }, { href: 'http://child2' }],
      })
    ).toEqual(
      new Link({
        href: 'http://href',
        type: 'application/pdf',
        templated: true,
        title: 'Link Title',
        rels: new Set(['publication', 'cover']),
        properties: new Properties({ orientation: 'landscape' }),
        height: 1024,
        width: 768,
        bitrate: 74.2,
        duration: 45.6,
        languages: ['fr'],
        alternates: new Links([
          new Link({ href: '/alternate1' }),
          new Link({ href: '/alternate2' }),
        ]),
        children: new Links([
          new Link({ href: 'http://child1' }),
          new Link({ href: 'http://child2' }),
        ]),
      })
    );
  });

  it('parse undefined JSON', () => {
    expect(Link.fromJSON(undefined)).toBeUndefined();
  });

  it('parse JSON {rel} as single string', () => {
    expect(Link.fromJSON({ href: 'a', rel: 'publication' })).toEqual(
      new Link({ href: 'a', rels: new Set(['publication']) })
    );
  });

  it('parse JSON {templated} defaults to false', () => {
    let link = Link.fromJSON({ href: 'a' });
    expect(link).toBeDefined();
    expect(link?.templated).toBeFalsy();
  });

  it('parse JSON multiple languages', () => {
    expect(Link.fromJSON({ href: 'a', language: ['fr', 'en'] })).toEqual(
      new Link({ href: 'a', languages: ['fr', 'en'] })
    );
  });

  it('parse JSON requires href', () => {
    expect(Link.fromJSON({ type: 'application/pdf' })).toBeUndefined();
  });

  it('parse JSON requires positive width', () => {
    let link = Link.fromJSON({ href: 'a', width: -20 });
    expect(link).toBeDefined();
    expect(link?.width).toBeUndefined();
  });

  it('parse JSON requires positive height', () => {
    let link = Link.fromJSON({ href: 'a', height: -20 });
    expect(link).toBeDefined();
    expect(link?.height).toBeUndefined();
  });

  it('parse JSON requires positive bitrate', () => {
    let link = Link.fromJSON({ href: 'a', bitrate: -20 });
    expect(link).toBeDefined();
    expect(link?.bitrate).toBeUndefined();
  });

  it('parse JSON requires positive duration', () => {
    let link = Link.fromJSON({ href: 'a', duration: -20 });
    expect(link).toBeDefined();
    expect(link?.duration).toBeUndefined();
  });

  it('parse JSON array', () => {
    expect(
      Links.fromJSON([{ href: 'http://child1' }, { href: 'http://child2' }])
    ).toEqual(
      new Links([
        new Link({ href: 'http://child1' }),
        new Link({ href: 'http://child2' }),
      ])
    );
  });

  it('parse undefined JSON array', () => {
    expect(Links.fromJSON(undefined)).toBeUndefined();
  });

  it('parse JSON array ignores invalid links', () => {
    expect(
      Links.fromJSON([{ title: 'Title' }, { href: 'http://child2' }])
    ).toEqual(new Links([new Link({ href: 'http://child2' })]));
  });

  it('get minimal JSON', () => {
    expect(new Link({ href: 'http://href' }).toJSON()).toEqual({
      href: 'http://href',
    });
  });

  it('get full JSON', () => {
    expect(
      new Link({
        href: 'http://href',
        type: 'application/pdf',
        templated: true,
        title: 'Link Title',
        rels: new Set(['publication', 'cover']),
        properties: new Properties({ orientation: 'landscape' }),
        height: 1024,
        width: 768,
        bitrate: 74.2,
        duration: 45.6,
        languages: ['fr'],
        alternates: new Links([
          new Link({ href: '/alternate1' }),
          new Link({ href: '/alternate2' }),
        ]),
        children: new Links([
          new Link({ href: 'http://child1' }),
          new Link({ href: 'http://child2' }),
        ]),
      }).toJSON()
    ).toEqual({
      href: 'http://href',
      type: 'application/pdf',
      templated: true,
      title: 'Link Title',
      rel: ['publication', 'cover'],
      properties: {
        orientation: 'landscape',
      },
      height: 1024,
      width: 768,
      bitrate: 74.2,
      duration: 45.6,
      language: ['fr'],
      alternate: [{ href: '/alternate1' }, { href: '/alternate2' }],
      children: [{ href: 'http://child1' }, { href: 'http://child2' }],
    });
  });

  it('get JSON array', () => {
    expect(
      new Links([
        new Link({ href: 'http://child1' }),
        new Link({ href: 'http://child2' }),
      ]).toJSON()
    ).toEqual([{ href: 'http://child1' }, { href: 'http://child2' }]);
  });

  it('to URL relative to base URL', () => {
    expect(
      new Link({ href: 'folder/file.html' }).toAbsoluteHREF('http://host/')
    ).toEqual('http://host/folder/file.html');
  });

  it('to URL relative to base URL with root prefix', () => {
    expect(
      new Link({ href: '/file.html' }).toAbsoluteHREF('http://host/folder/')
    ).toEqual('http://host/folder/file.html');
  });

  it('to URL relative to undefined', () => {
    expect(
      new Link({ href: 'folder/file.html' }).toAbsoluteHREF(undefined)
    ).toEqual('/folder/file.html');
  });

  it('to URL with invalid HREF', () => {
    expect(
      new Link({ href: '' }).toAbsoluteHREF('http://test.com')
    ).toBeUndefined();
  });

  it('to URL with absolute HREF', () => {
    expect(
      new Link({ href: 'http://test.com/folder/file.html' }).toAbsoluteHREF(
        'http://host/'
      )
    ).toEqual('http://test.com/folder/file.html');
  });

  it('to URL with HREF containing invalid characters', () => {
    expect(
      new Link({ href: "/Cory Doctorow's/a-fc.jpg" }).toAbsoluteHREF(
        'http://host/folder/'
      )
    ).toEqual("http://host/folder/Cory%20Doctorow's/a-fc.jpg");
  });

  it('Make a copy after adding the given {properties}', () => {
    expect(
      new Link({
        href: 'http://href',
        type: 'application/pdf',
        templated: true,
        title: 'Link Title',
        rels: new Set(['publication', 'cover']),
        properties: new Properties({ orientation: 'landscape' }),
        height: 1024,
        width: 768,
        bitrate: 74.2,
        duration: 45.6,
        languages: ['fr'],
        alternates: new Links([
          new Link({ href: '/alternate1' }),
          new Link({ href: '/alternate2' }),
        ]),
        children: new Links([
          new Link({ href: 'http://child1' }),
          new Link({ href: 'http://child2' }),
        ]),
      })
        .addProperties({ additional: 'property' })
        .toJSON()
    ).toEqual({
      href: 'http://href',
      type: 'application/pdf',
      templated: true,
      title: 'Link Title',
      rel: ['publication', 'cover'],
      properties: {
        additional: 'property',
        orientation: 'landscape',
      },
      height: 1024,
      width: 768,
      bitrate: 74.2,
      duration: 45.6,
      language: ['fr'],
      alternate: [{ href: '/alternate1' }, { href: '/alternate2' }],
      children: [{ href: 'http://child1' }, { href: 'http://child2' }],
    });
  });

  it('Find the first index of the {Link} with the given {href} in a list of {Link}', () => {
    expect(
      new Links([new Link({ href: 'href' })]).findIndexWithHref('foobar')
    ).toEqual(-1);

    expect(
      new Links([
        new Link({ href: 'href1' }),
        new Link({ href: 'href2' }),
        new Link({ href: 'href3' }),
      ]).findIndexWithHref('href2')
    ).toEqual(1);
  });
});
