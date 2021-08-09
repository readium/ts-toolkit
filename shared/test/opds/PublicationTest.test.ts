import {
  Link,
  Links,
  LocalizedString,
  Manifest,
  Metadata,
  Publication,
  PublicationCollection,
} from '../../src';

describe('Epub Publication Tests', () => {
  function createPublication(
    subcollections: Map<string, Array<PublicationCollection>> = new Map<
      string,
      Array<PublicationCollection>
    >()
  ): Publication {
    return new Publication({
      manifest: new Manifest({
        metadata: new Metadata({ title: new LocalizedString('Title') }),
        links: new Links([]),
        readingOrder: new Links([]),
        subcollections,
      }),
    });
  }

  it('get {images}', () => {
    const links = new Links([new Link({ href: '/image.png' })]);
    expect(
      createPublication(
        new Map([['images', [new PublicationCollection({ links })]]])
      ).getImages()
    ).toEqual(links);
  });

  it('get {images} when missing', () => {
    expect(createPublication().getImages()).toBeUndefined();
  });
});
