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