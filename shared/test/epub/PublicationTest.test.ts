import '../../src/publication/epub/Publication.ts';
import { Manifest, Publication } from '../../src';

const manifestJSON = {
  '@context': 'https://readium.org/webpub-manifest/context.jsonld',
  metadata: {
    author: 'Various',
    conformsTo: 'https://readium.org/webpub-manifest/profiles/epub',
    identifier: 'code.google.com.epub-samples.georgia-pls-ssml',
    language: 'en-US',
    modified: '2012-02-07T16:38:35Z',
    title: 'Georgia',
  },
  readingOrder: [{ href: 'EPUB/georgia.xhtml', type: 'application/xhtml+xml' }],
  resources: [
    { href: 'EPUB/cover.xhtml', type: 'application/xhtml+xml' },
    { href: 'EPUB/nav.xhtml', rel: 'contents', type: 'application/xhtml+xml' },
    { href: 'EPUB/css/epub.css', type: 'text/css' },
    { href: 'EPUB/images/cover.png', rel: 'cover', type: 'image/png' },
    { href: 'EPUB/toc.ncx', type: 'application/x-dtbncx+xml' },
  ],
  toc: [{ href: 'EPUB/georgia.xhtml#d10e42', title: 'GEORGIA' }],
  landmarks: [{ href: 'EPUB/cover.xhtml', title: 'cover' }],
  pageList: [
    { href: 'EPUB/georgia.xhtml#page752', title: '752' },
    { href: 'EPUB/georgia.xhtml#page753', title: '753' },
    { href: 'EPUB/georgia.xhtml#page754', title: '754' },
    { href: 'EPUB/georgia.xhtml#page755', title: '755' },
    { href: 'EPUB/georgia.xhtml#page756', title: '756' },
    { href: 'EPUB/georgia.xhtml#page757', title: '757' },
    { href: 'EPUB/georgia.xhtml#page758', title: '758' },
  ],
  loa: [{ href: 'EPUB/audio.mp3', title: 'Audio clip' }],
  loi: [{ href: 'EPUB/images/figure1.png', title: 'Figure 1' }],
  lot: [{ href: 'EPUB/table1.xhtml', title: 'Table 1' }],
  lov: [{ href: 'EPUB/video.mp4', title: 'Video clip' }],
};

describe('Epub Publication Tests', () => {
  let publication: Publication;

  beforeEach(() => {
    const manifest = Manifest.deserialize(manifestJSON);
    expect(manifest).toBeDefined();
    publication = new Publication({ manifest: manifest! });
  });

  it('get {pageList}', () => {
    const pageList = publication.getPageList();
    expect(pageList?.items).toHaveLength(7);
    expect(pageList?.items[0].href).toBe('EPUB/georgia.xhtml#page752');
    expect(pageList?.items[6].href).toBe('EPUB/georgia.xhtml#page758');
  });

  it('get {landmarks}', () => {
    const landmarks = publication.getLandmarks();
    expect(landmarks?.items).toHaveLength(1);
    expect(landmarks?.items[0].href).toBe('EPUB/cover.xhtml');
    expect(landmarks?.items[0].title).toBe('cover');
  });

  it('get {listOfAudioClips}', () => {
    const loa = publication.getListOfAudioClips();
    expect(loa?.items).toHaveLength(1);
    expect(loa?.items[0].href).toBe('EPUB/audio.mp3');
  });

  it('get {listOfIllustrations}', () => {
    const loi = publication.getListOfIllustrations();
    expect(loi?.items).toHaveLength(1);
    expect(loi?.items[0].href).toBe('EPUB/images/figure1.png');
  });

  it('get {listOfTables}', () => {
    const lot = publication.getListOfTables();
    expect(lot?.items).toHaveLength(1);
    expect(lot?.items[0].href).toBe('EPUB/table1.xhtml');
  });

  it('get {listOfVideoClips}', () => {
    const lov = publication.getListOfVideoClips();
    expect(lov?.items).toHaveLength(1);
    expect(lov?.items[0].href).toBe('EPUB/video.mp4');
  });

  it('subcollections contains only the expected roles', () => {
    expect(Array.from(publication.subcollections?.keys() ?? [])).toEqual(
      expect.arrayContaining(['pageList', 'landmarks', 'loa', 'loi', 'lot', 'lov'])
    );
    expect(publication.subcollections?.size).toBe(6);
  });
});
