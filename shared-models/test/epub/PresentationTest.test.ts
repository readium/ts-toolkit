import { EpubLayout, Link, Presentation, Properties } from '../../src';

describe('Epub Presentation Tests', () => {
  function createLink(layout?: EpubLayout): Link {
    return new Link({
      href: 'res',
      properties: new Properties(layout ? { layout: layout } : {}),
    });
  }

  it('Get the layout of a reflowable resource', () => {
    expect(
      new Presentation({}).layoutOf(createLink(EpubLayout.reflowable))
    ).toEqual(EpubLayout.reflowable);
  });

  it('Get the layout of a fixed resource', () => {
    expect(new Presentation({}).layoutOf(createLink(EpubLayout.fixed))).toEqual(
      EpubLayout.fixed
    );
  });

  it('The layout of a resource takes precedence over the document layout', () => {
    expect(
      new Presentation({ layout: EpubLayout.reflowable }).layoutOf(
        createLink(EpubLayout.fixed)
      )
    ).toEqual(EpubLayout.fixed);
  });

  it('Get the layout falls back on the document layout', () => {
    expect(
      new Presentation({ layout: EpubLayout.fixed }).layoutOf(createLink())
    ).toEqual(EpubLayout.fixed);
  });

  it('Get the layout falls back on REFLOWABLE', () => {
    expect(new Presentation({}).layoutOf(createLink())).toEqual(
      EpubLayout.reflowable
    );
  });
});
