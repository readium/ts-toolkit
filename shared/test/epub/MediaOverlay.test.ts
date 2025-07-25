import { MediaOverlay } from '../../src';

describe('MediaOverlay', () => {
  it('parse JSON', () => {
    const mediaOverlay = MediaOverlay.deserialize({
      activeClass: 'active',
      playbackActiveClass: 'playing',
    });

    expect(mediaOverlay).toBeDefined();
    expect(mediaOverlay?.activeClass).toBe('active');
    expect(mediaOverlay?.playbackActiveClass).toBe('playing');
  });

  it('parse JSON with undefined values', () => {
    const mediaOverlay = MediaOverlay.deserialize({
      activeClass: undefined,
      playbackActiveClass: undefined,
    });

    expect(mediaOverlay).toBeDefined();
    expect(mediaOverlay?.activeClass).toBeUndefined();
    expect(mediaOverlay?.playbackActiveClass).toBeUndefined();
  });

  it('parse JSON with empty values', () => {
    const mediaOverlay = MediaOverlay.deserialize({
      activeClass: '',
      playbackActiveClass: '',
    });

    expect(mediaOverlay).toBeDefined();
    expect(mediaOverlay?.activeClass).toBe('');
    expect(mediaOverlay?.playbackActiveClass).toBe('');
  });

  it('serialize', () => {
    const mediaOverlay = new MediaOverlay({
      activeClass: 'active',
      playbackActiveClass: 'playing',
    });

    const json = mediaOverlay.serialize();
    expect(json).toEqual({
      activeClass: 'active',
      playbackActiveClass: 'playing',
    });
  });

  it('serialize with undefined values', () => {
    const mediaOverlay = new MediaOverlay({
      activeClass: undefined,
      playbackActiveClass: undefined,
    });

    const json = mediaOverlay.serialize();
    expect(json).toEqual({});
  });
});
