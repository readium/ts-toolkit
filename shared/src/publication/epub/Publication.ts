import { Links } from '../Link.ts';
import { Publication } from '../Publication.ts';

// EPUB extensions for Publication.
// https://readium.org/webpub-manifest/schema/extensions/epub/subcollections.schema.json
// https://idpf.github.io/epub-vocabs/structure/#navigation

export function getPageList(pub: Publication): Links | undefined {
  return pub.linksWithRole('pageList');
}

export function getLandmarks(pub: Publication): Links | undefined {
  return pub.linksWithRole('landmarks');
}

export function getListOfAudioClips(pub: Publication): Links | undefined {
  return pub.linksWithRole('loa');
}

export function getListOfIllustrations(pub: Publication): Links | undefined {
  return pub.linksWithRole('loi');
}

export function getListOfTables(pub: Publication): Links | undefined {
  return pub.linksWithRole('lot');
}

export function getListOfVideoClips(pub: Publication): Links | undefined {
  return pub.linksWithRole('lov');
}
