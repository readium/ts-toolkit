/* Copyright 2020 Readium Foundation. All rights reserved.
 * Use of this source code is governed by a BSD-style license,
 * available in the LICENSE file present in the Github repository of the project.
 */

import { findValue } from '../../util/FindValue';
import { Links } from '../Link';
// import { Publication } from '../Publication';

/** EPUB Web Publication Extension
 *  https://readium.org/webpub-manifest/schema/extensions/epub/subcollections.schema.json
 */
// declare module '../Publication' {
  export class Publicationx {
    /** Provides navigation to positions in the Publication content that correspond to the locations
     *  of page boundaries present in a print source being represented by this EPUB Publication.
     */
    getPageList: () => Links;

    /** Identifies fundamental structural components of the publication in order to enable Reading
     *  Systems to provide the User efficient access to them.
     */
    getLandmarks: () => Links;

    getListOfAudioClips: () => Links;
    getListOfIllustrations: () => Links;
    getListOfTables: () => Links;
    getListOfVideoClips: () => Links;
  }
// }

Publicationx.prototype.getPageList = function() {
  return findValue(this.subcollections, 'pageList') || new Links([]);
};

Publicationx.prototype.getLandmarks = function() {
  return findValue(this.subcollections, 'landmarks') || new Links([]);
};

Publicationx.prototype.getListOfAudioClips = function() {
  return findValue(this.subcollections, 'loa') || new Links([]);
};

Publicationx.prototype.getListOfIllustrations = function() {
  return findValue(this.subcollections, 'loi') || new Links([]);
};

Publicationx.prototype.getListOfTables = function() {
  return findValue(this.subcollections, 'lot') || new Links([]);
};

Publicationx.prototype.getListOfVideoClips = function() {
  return findValue(this.subcollections, 'lov') || new Links([]);
};
