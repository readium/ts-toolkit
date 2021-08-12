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

  it('get {pageList}', () => {
    const links = new Links([new Link({ href: '/page1.html' })]);
    expect(
      createPublication(
        new Map([['pageList', [new PublicationCollection({ links })]]])
      ).getPageList()
    ).toEqual(links);
  });

  it('get {pageList} when missing', () => {
    expect(createPublication().getPageList()).toBeUndefined();
  });

  it('get {landmarks}', () => {
    const links = new Links([new Link({ href: '/landmark.html' })]);
    expect(
      createPublication(
        new Map([['landmarks', [new PublicationCollection({ links })]]])
      ).getLandmarks()
    ).toEqual(links);
  });

  it('get {landmarks} when missing', () => {
    expect(createPublication().getLandmarks()).toBeUndefined();
  });

  it('get {listOfAudioClips}', () => {
    const links = new Links([new Link({ href: '/audio.mp3' })]);
    expect(
      createPublication(
        new Map([['loa', [new PublicationCollection({ links })]]])
      ).getListOfAudioClips()
    ).toEqual(links);
  });

  it('get {listOfAudioClips} when missing', () => {
    expect(createPublication().getListOfAudioClips()).toBeUndefined();
  });

  it('get {listOfIllustrations}', () => {
    const links = new Links([new Link({ href: '/image.jpg' })]);
    expect(
      createPublication(
        new Map([['loi', [new PublicationCollection({ links })]]])
      ).getListOfIllustrations()
    ).toEqual(links);
  });

  it('get {listOfIllustrations} when missing', () => {
    expect(createPublication().getListOfIllustrations()).toBeUndefined();
  });

  it('get {listOfTables}', () => {
    const links = new Links([new Link({ href: '/table.html' })]);
    expect(
      createPublication(
        new Map([['lot', [new PublicationCollection({ links })]]])
      ).getListOfTables()
    ).toEqual(links);
  });

  it('get {listOfTables} when missing', () => {
    expect(createPublication().getListOfTables()).toBeUndefined();
  });

  it('get {listOfVideoClips}', () => {
    const links = new Links([new Link({ href: '/video.mov' })]);
    expect(
      createPublication(
        new Map([['lov', [new PublicationCollection({ links })]]])
      ).getListOfVideoClips()
    ).toEqual(links);
  });

  it('get {listOfVideoClips} when missing', () => {
    expect(createPublication().getListOfVideoClips()).toBeUndefined();
  });
});
