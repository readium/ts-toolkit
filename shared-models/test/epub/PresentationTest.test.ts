import { EPUBLayout, Link, Presentation, Properties } from '../../src';

describe('Epub Presentation Tests', () => {
  function createLink(layout?: EPUBLayout): Link {
    return new Link({
      href: 'res',
      properties: new Properties(layout ? { layout: layout } : {}),
    });
  }

  it('Get the layout of a reflowable resource', () => {
    expect(
      new Presentation({}).layoutOf(createLink(EPUBLayout.reflowable))
    ).toEqual(EPUBLayout.reflowable);
  });

  it('Get the layout of a fixed resource', () => {
    expect(new Presentation({}).layoutOf(createLink(EPUBLayout.fixed))).toEqual(
      EPUBLayout.fixed
    );
  });

  it('The layout of a resource takes precedence over the document layout', () => {
    expect(
      new Presentation({ layout: EPUBLayout.reflowable }).layoutOf(
        createLink(EPUBLayout.fixed)
      )
    ).toEqual(EPUBLayout.fixed);
  });

  it('Get the layout falls back on the document layout', () => {
    expect(
      new Presentation({ layout: EPUBLayout.fixed }).layoutOf(createLink())
    ).toEqual(EPUBLayout.fixed);
  });

  it('Get the layout falls back on REFLOWABLE', () => {
    expect(new Presentation({}).layoutOf(createLink())).toEqual(
      EPUBLayout.reflowable
    );
  });
});
