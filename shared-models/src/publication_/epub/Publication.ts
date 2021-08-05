import { Links } from '../Link';
import { Publication } from '../Publication';

// EPUB extensions for [Publication].
// https://readium.org/webpub-manifest/schema/extensions/epub/subcollections.schema.json
// https://idpf.github.io/epub-vocabs/structure/#navigation

declare module '../Publication' {
  export interface Publication {
    /**
     * Provides navigation to positions in the Publication content that correspond to the locations of
     * page boundaries present in a print source being represented by this EPUB Publication.
     */
    getPageList(): Links | undefined;

    /**
     * Identifies fundamental structural components of the publication in order to enable Reading
     * Systems to provide the User efficient access to them.
     */
    getLandmarks(): Links | undefined;

    getListOfAudioClips(): Links | undefined;
    getListOfIllustrations(): Links | undefined;
    getListOfTables(): Links | undefined;
    getListOfVideoClips(): Links | undefined;
  }
}

Publication.prototype.getPageList = function(): Links | undefined {
  return this.linksWithRole('pageList');
};

Publication.prototype.getLandmarks = function(): Links | undefined {
  return this.linksWithRole('landmarks');
};

Publication.prototype.getListOfAudioClips = function(): Links | undefined {
  return this.linksWithRole('loa');
};

Publication.prototype.getListOfIllustrations = function(): Links | undefined {
  return this.linksWithRole('loi');
};

Publication.prototype.getListOfTables = function(): Links | undefined {
  return this.linksWithRole('lot');
};

Publication.prototype.getListOfVideoClips = function(): Links | undefined {
  return this.linksWithRole('lov');
};
