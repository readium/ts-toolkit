/* Copyright 2025 Readium Foundation. All rights reserved.
 * Use of this source code is governed by a BSD-style license,
 * available in the LICENSE file present in the Github repository of the project.
 */

import { LocalizedString, MediaOverlay, Metadata } from '../../src';

describe('EPUB Metadata Tests', () => {
  it('getMediaOverlay when available', () => {
    expect(
      new Metadata({
        title: new LocalizedString({ default: 'Test' }),
        otherMetadata: {
          mediaOverlay: {
            activeClass: 'active',
            playbackActiveClass: 'playing'
          }
        }
      }).getMediaOverlay()
    ).toEqual(
      new MediaOverlay({
        activeClass: 'active',
        playbackActiveClass: 'playing'
      })
    );
  });

  it('getMediaOverlay when missing', () => {
    expect(
      new Metadata({
        title: new LocalizedString({ default: 'Test' })
      }).getMediaOverlay()
    ).toBeUndefined();
  });
});