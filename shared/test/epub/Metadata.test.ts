import { LocalizedString, MediaOverlay, Metadata, getMediaOverlay } from '../../src';

describe('EPUB Metadata Tests', () => {
  it('getMediaOverlay when available', () => {
    expect(
      getMediaOverlay(new Metadata({
        title: new LocalizedString({ default: 'Test' }),
        otherMetadata: {
          mediaOverlay: {
            activeClass: 'active',
            playbackActiveClass: 'playing'
          }
        }
      }))
    ).toEqual(
      new MediaOverlay({
        activeClass: 'active',
        playbackActiveClass: 'playing'
      })
    );
  });

  it('getMediaOverlay when missing', () => {
    expect(
      getMediaOverlay(new Metadata({
        title: new LocalizedString({ default: 'Test' })
      }))
    ).toBeUndefined();
  });
});
