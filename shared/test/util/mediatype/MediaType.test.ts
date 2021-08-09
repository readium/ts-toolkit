import { MediaType } from '../../../src/util/mediatype/MediaType';

describe('MediaType Tests', () => {
  it('throws error for invalid types', () => {
    expect(() => MediaType.parse({ mediaType: 'application' })).toThrowError(
      'Invalid media type'
    );
    expect(() =>
      MediaType.parse({ mediaType: 'application/atom+xml/extra' })
    ).toThrow('Invalid media type');
  });

  it('to string', () => {
    expect(
      MediaType.parse({
        mediaType: 'application/atom+xml;profile=opds-catalog',
      }).string
    ).toBe('application/atom+xml;profile=opds-catalog');
  });

  it('to string is normalized', () => {
    expect(
      MediaType.parse({
        mediaType: 'APPLICATION/ATOM+XML;PROFILE=OPDS-CATALOG   ;   a=0',
      }).string
    ).toBe('application/atom+xml;a=0;profile=OPDS-CATALOG');

    // Parameters are sorted by name
    expect(
      MediaType.parse({ mediaType: 'application/atom+xml;a=0;b=1' }).string
    ).toBe('application/atom+xml;a=0;b=1');

    expect(
      MediaType.parse({ mediaType: 'application/atom+xml;b=1;a=0' }).string
    ).toBe('application/atom+xml;a=0;b=1');
  });

  it('get type', () => {
    expect(
      MediaType.parse({
        mediaType: 'application/atom+xml;profile=opds-catalog',
      }).type
    ).toBe('application');

    expect(MediaType.parse({ mediaType: '*/jpeg' }).type).toBe('*');
  });

  it('get subtype', () => {
    expect(
      MediaType.parse({
        mediaType: 'application/atom+xml;profile=opds-catalog',
      }).subtype
    ).toBe('atom+xml');

    expect(MediaType.parse({ mediaType: 'image/*' }).subtype).toBe('*');
  });

  it('get parameters', () => {
    expect(
      MediaType.parse({
        mediaType: 'application/atom+xml;type=entry;profile=opds-catalog',
      }).parameters
    ).toEqual({
      profile: 'opds-catalog',
      type: 'entry',
    });
  });

  it('get empty parameters', () => {
    expect(
      MediaType.parse({ mediaType: 'application/atom+xml' }).parameters
    ).toEqual({});
  });

  it('get parameters with whitespaces', () => {
    expect(
      MediaType.parse({
        mediaType:
          'application/atom+xml    ;    type=entry   ;    profile=opds-catalog   ',
      }).parameters
    ).toEqual({
      profile: 'opds-catalog',
      type: 'entry',
    });
  });

  it('get structured syntax suffix', () => {
    expect(
      MediaType.parse({ mediaType: 'foo/bar' }).structuredSyntaxSuffix
    ).toBeUndefined();
    expect(
      MediaType.parse({ mediaType: 'application/zip' }).structuredSyntaxSuffix
    ).toBeUndefined();
    expect(
      MediaType.parse({ mediaType: 'application/epub+zip' })
        .structuredSyntaxSuffix
    ).toBe('+zip');
    expect(
      MediaType.parse({ mediaType: 'foo/bar+json+zip' }).structuredSyntaxSuffix
    ).toBe('+zip');
  });

  it('get charset', () => {
    expect(MediaType.parse({ mediaType: 'text/html' }).charset).toBeUndefined();
    expect(
      MediaType.parse({ mediaType: 'text/html;charset=utf-8' }).charset
    ).toBe('UTF-8');
    expect(
      MediaType.parse({ mediaType: 'text/html;charset=utf-16' }).charset
    ).toBe('UTF-16');
  });

  it('type, subtype and parameter names are lowercased', () => {
    const mediaType = MediaType.parse({
      mediaType: 'APPLICATION/ATOM+XML;PROFILE=OPDS-CATALOG',
    });
    expect(mediaType.type).toBe('application');
    expect(mediaType.subtype).toBe('atom+xml');
    expect(mediaType.parameters).toEqual({ profile: 'OPDS-CATALOG' });
  });

  it('equality', () => {
    expect(
      MediaType.parse({ mediaType: 'application/atom+xml' }).equals(
        MediaType.parse({ mediaType: 'application/atom+xml' })
      )
    ).toBe(true);

    expect(
      MediaType.parse({
        mediaType: 'application/atom+xml;profile=opds-catalog',
      }).equals(
        MediaType.parse({
          mediaType: 'application/atom+xml;profile=opds-catalog',
        })
      )
    ).toBe(true);

    expect(
      MediaType.parse({ mediaType: 'application/atom+xml' }).equals(
        MediaType.parse({ mediaType: 'application/atom' })
      )
    ).toBe(false);

    expect(
      MediaType.parse({ mediaType: 'application/atom+xml' }).equals(
        MediaType.parse({ mediaType: 'text/atom+xml' })
      )
    ).toBe(false);

    expect(
      MediaType.parse({
        mediaType: 'application/atom+xml;profile=opds-catalog',
      }).equals(MediaType.parse({ mediaType: 'application/atom+xml' }))
    ).toBe(false);
  });

  it('equality ignores case of type, subtype and parameter names', () => {
    expect(
      MediaType.parse({
        mediaType: 'application/atom+xml;profile=opds-catalog',
      }).equals(
        MediaType.parse({
          mediaType: 'APPLICATION/ATOM+XML;PROFILE=opds-catalog',
        })
      )
    ).toBe(true);

    expect(
      MediaType.parse({
        mediaType: 'application/atom+xml;profile=opds-catalog',
      }).equals(
        MediaType.parse({
          mediaType: 'APPLICATION/ATOM+XML;PROFILE=OPDS-CATALOG',
        })
      )
    ).toBe(false);
  });

  it('equality ignores parameters order', () => {
    expect(
      MediaType.parse({
        mediaType: 'application/atom+xml;type=entry;profile=opds-catalog',
      }).equals(
        MediaType.parse({
          mediaType: 'application/atom+xml;profile=opds-catalog;type=entry',
        })
      )
    ).toBe(true);
  });

  it('equality ignores charset case', () => {
    expect(
      MediaType.parse({
        mediaType: 'application/atom+xml;charset=utf-8',
      }).equals(
        MediaType.parse({ mediaType: 'application/atom+xml;charset=UTF-8' })
      )
    ).toBe(true);
  });

  it('contains equal media type', () => {
    expect(
      MediaType.parse({ mediaType: 'text/html;charset=utf-8' }).contains(
        MediaType.parse({ mediaType: 'text/html;charset=utf-8' })
      )
    ).toBe(true);
  });

  it('contains ignores parameters order', () => {
    expect(
      MediaType.parse({
        mediaType: 'text/html;charset=utf-8;type=entry',
      }).contains(
        MediaType.parse({ mediaType: 'text/html;type=entry;charset=utf-8' })
      )
    ).toBe(true);
  });

  it('contains ignore extra parameters', () => {
    expect(
      MediaType.parse({ mediaType: 'text/html' }).contains(
        MediaType.parse({ mediaType: 'text/html;charset=utf-8' })
      )
    ).toBe(true);
  });

  it('contains supports wildcards', () => {
    expect(
      MediaType.parse({ mediaType: '*/*' }).contains(
        MediaType.parse({ mediaType: 'text/html;charset=utf-8' })
      )
    ).toBe(true);

    expect(
      MediaType.parse({ mediaType: 'text/*' }).contains(
        MediaType.parse({ mediaType: 'text/html;charset=utf-8' })
      )
    ).toBe(true);

    expect(
      MediaType.parse({ mediaType: 'text/*' }).contains(
        MediaType.parse({ mediaType: 'application/zip' })
      )
    ).toBe(false);
  });

  it('contains from string', () => {
    expect(
      MediaType.parse({ mediaType: 'text/html;charset=utf-8' }).contains(
        'text/html;charset=utf-8'
      )
    ).toBe(true);
  });

  it('matches equal media type', () => {
    expect(
      MediaType.parse({ mediaType: 'text/html;charset=utf-8' }).matches(
        MediaType.parse({ mediaType: 'text/html;charset=utf-8' })
      )
    ).toBe(true);
  });

  it('matches must match parameters', () => {
    expect(
      MediaType.parse({ mediaType: 'text/html;charset=ascii' }).matches(
        MediaType.parse({ mediaType: 'text/html;charset=utf-8' })
      )
    ).toBe(false);
  });

  it('matches ignores parameters order', () => {
    expect(
      MediaType.parse({
        mediaType: 'text/html;charset=utf-8;type=entry',
      }).matches(
        MediaType.parse({ mediaType: 'text/html;type=entry;charset=utf-8' })
      )
    ).toBe(true);
  });

  it('matches ignores extra parameters', () => {
    expect(
      MediaType.parse({ mediaType: 'text/html;charset=utf-8' }).matches(
        MediaType.parse({ mediaType: 'text/html;charset=utf-8;extra=param' })
      )
    ).toBe(true);

    expect(
      MediaType.parse({
        mediaType: 'text/html;charset=utf-8;extra=param',
      }).matches(MediaType.parse({ mediaType: 'text/html;charset=utf-8' }))
    ).toBe(true);
  });

  it('matches ignores extra parameters', () => {
    expect(
      MediaType.parse({ mediaType: 'text/html;charset=utf-8' }).matches(
        MediaType.parse({ mediaType: 'text/html;charset=utf-8;extra=param' })
      )
    ).toBe(true);

    expect(
      MediaType.parse({
        mediaType: 'text/html;charset=utf-8;extra=param',
      }).matches(MediaType.parse({ mediaType: 'text/html;charset=utf-8' }))
    ).toBe(true);
  });

  it('matches supports wildcards', () => {
    expect(
      MediaType.parse({ mediaType: 'text/html;charset=utf-8' }).matches(
        MediaType.parse({ mediaType: '*/*' })
      )
    ).toBe(true);

    expect(
      MediaType.parse({ mediaType: 'text/html;charset=utf-8' }).matches(
        MediaType.parse({ mediaType: 'text/*' })
      )
    ).toBe(true);

    expect(
      MediaType.parse({ mediaType: 'application/zip' }).matches(
        MediaType.parse({ mediaType: 'text/*' })
      )
    ).toBe(false);

    expect(
      MediaType.parse({ mediaType: '*/*' }).matches(
        MediaType.parse({ mediaType: 'text/html;charset=utf-8' })
      )
    ).toBe(true);

    expect(
      MediaType.parse({ mediaType: 'text/*' }).matches(
        MediaType.parse({ mediaType: 'text/html;charset=utf-8' })
      )
    ).toBe(true);

    expect(
      MediaType.parse({ mediaType: 'text/*' }).matches(
        MediaType.parse({ mediaType: 'application/zip' })
      )
    ).toBe(false);
  });

  it('matches from string', () => {
    expect(
      MediaType.parse({ mediaType: 'text/html;charset=utf-8' }).matches(
        'text/html;charset=utf-8'
      )
    ).toBe(true);
  });

  it('matches any media type', () => {
    expect(
      MediaType.parse({ mediaType: 'text/html' }).matchesAny(
        MediaType.parse({ mediaType: 'application/zip' }),
        MediaType.parse({ mediaType: 'text/html;charset=utf-8' })
      )
    ).toBe(true);

    expect(
      MediaType.parse({ mediaType: 'text/html' }).matchesAny(
        MediaType.parse({ mediaType: 'application/zip' }),
        MediaType.parse({ mediaType: 'text/plain;charset=utf-8' })
      )
    ).toBe(false);

    expect(
      MediaType.parse({ mediaType: 'text/html' }).matchesAny(
        'application/zip',
        'text/html;charset=utf-8'
      )
    ).toBe(true);

    expect(
      MediaType.parse({ mediaType: 'text/html' }).matchesAny(
        'application/zip',
        'text/plain;charset=utf-8'
      )
    ).toBe(false);
  });

  it('is ZIP', () => {
    expect(MediaType.parse({ mediaType: 'text/plain' }).isZIP).toBe(false);
    expect(MediaType.parse({ mediaType: 'application/zip' }).isZIP).toBe(true);
    expect(
      MediaType.parse({ mediaType: 'application/zip;charset=utf-8' }).isZIP
    ).toBe(true);
    expect(MediaType.parse({ mediaType: 'application/epub+zip' }).isZIP).toBe(
      true
    );
    // These media types must be explicitly matched since they don't have any ZIP hint
    expect(
      MediaType.parse({ mediaType: 'application/audiobook+lcp' }).isZIP
    ).toBe(true);
    expect(MediaType.parse({ mediaType: 'application/pdf+lcp' }).isZIP).toBe(
      true
    );
  });

  it('is JSON', () => {
    expect(MediaType.parse({ mediaType: 'text/plain' }).isJSON).toBe(false);
    expect(MediaType.parse({ mediaType: 'application/json' }).isJSON).toBe(
      true
    );
    expect(
      MediaType.parse({ mediaType: 'application/json;charset=utf-8' }).isJSON
    ).toBe(true);
    expect(MediaType.parse({ mediaType: 'application/opds+json' }).isJSON).toBe(
      true
    );
  });

  it('is OPDS', () => {
    expect(MediaType.parse({ mediaType: 'text/html' }).isOPDS).toBe(false);
    expect(
      MediaType.parse({
        mediaType: 'application/atom+xml;profile=opds-catalog',
      }).isOPDS
    ).toBe(true);
    expect(
      MediaType.parse({
        mediaType: 'application/atom+xml;type=entry;profile=opds-catalog',
      }).isOPDS
    ).toBe(true);
    expect(MediaType.parse({ mediaType: 'application/opds+json' }).isOPDS).toBe(
      true
    );
    expect(
      MediaType.parse({
        mediaType: 'application/opds-publication+json',
      }).isOPDS
    ).toBe(true);
    expect(
      MediaType.parse({
        mediaType: 'application/opds+json;charset=utf-8',
      }).isOPDS
    ).toBe(true);
    expect(
      MediaType.parse({
        mediaType: 'application/opds-authentication+json',
      }).isOPDS
    ).toBe(true);
  });

  it('is HTML', () => {
    expect(MediaType.parse({ mediaType: 'application/opds+json' }).isHTML).toBe(
      false
    );
    expect(MediaType.parse({ mediaType: 'text/html' }).isHTML).toBe(true);
    expect(MediaType.parse({ mediaType: 'application/xhtml+xml' }).isHTML).toBe(
      true
    );
    expect(
      MediaType.parse({ mediaType: 'text/html;charset=utf-8' }).isHTML
    ).toBe(true);
  });

  it('is bitmap', () => {
    expect(MediaType.parse({ mediaType: 'text/html' }).isBitmap).toBe(false);
    expect(MediaType.parse({ mediaType: 'image/bmp' }).isBitmap).toBe(true);
    expect(MediaType.parse({ mediaType: 'image/gif' }).isBitmap).toBe(true);
    expect(MediaType.parse({ mediaType: 'image/jpeg' }).isBitmap).toBe(true);
    expect(MediaType.parse({ mediaType: 'image/png' }).isBitmap).toBe(true);
    expect(MediaType.parse({ mediaType: 'image/tiff' }).isBitmap).toBe(true);
    expect(
      MediaType.parse({ mediaType: 'image/tiff;charset=utf-8' }).isBitmap
    ).toBe(true);
  });

  it('is audio', () => {
    expect(MediaType.parse({ mediaType: 'text/html' }).isAudio).toBe(false);
    expect(MediaType.parse({ mediaType: 'audio/unknown' }).isAudio).toBe(true);
    expect(
      MediaType.parse({ mediaType: 'audio/mpeg;param=value' }).isAudio
    ).toBe(true);
  });

  it('is video', () => {
    expect(MediaType.parse({ mediaType: 'text/html' }).isVideo).toBe(false);
    expect(MediaType.parse({ mediaType: 'video/unknown' }).isVideo).toBe(true);
    expect(
      MediaType.parse({ mediaType: 'video/mpeg;param=value' }).isVideo
    ).toBe(true);
  });

  it('is RWPM', () => {
    expect(MediaType.parse({ mediaType: 'text/html' }).isRWPM).toBe(false);
    expect(
      MediaType.parse({ mediaType: 'application/audiobook+json' }).isRWPM
    ).toBe(true);
    expect(
      MediaType.parse({ mediaType: 'application/divina+json' }).isRWPM
    ).toBe(true);
    expect(
      MediaType.parse({ mediaType: 'application/webpub+json' }).isRWPM
    ).toBe(true);
    expect(
      MediaType.parse({
        mediaType: 'application/webpub+json;charset=utf-8',
      }).isRWPM
    ).toBe(true);
  });

  it('is RWPM', () => {
    expect(MediaType.parse({ mediaType: 'text/html' }).isPublication).toBe(
      false
    );
    expect(
      MediaType.parse({
        mediaType: 'application/audiobook+zip',
      }).isPublication
    ).toBe(true);
    expect(
      MediaType.parse({
        mediaType: 'application/audiobook+json',
      }).isPublication
    ).toBe(true);
    expect(
      MediaType.parse({
        mediaType: 'application/audiobook+lcp',
      }).isPublication
    ).toBe(true);
    expect(
      MediaType.parse({
        mediaType: 'application/audiobook+json;charset=utf-8',
      }).isPublication
    ).toBe(true);
    expect(
      MediaType.parse({ mediaType: 'application/divina+zip' }).isPublication
    ).toBe(true);
    expect(
      MediaType.parse({ mediaType: 'application/divina+json' }).isPublication
    ).toBe(true);
    expect(
      MediaType.parse({ mediaType: 'application/webpub+zip' }).isPublication
    ).toBe(true);
    expect(
      MediaType.parse({ mediaType: 'application/webpub+json' }).isPublication
    ).toBe(true);
    expect(
      MediaType.parse({
        mediaType: 'application/vnd.comicbook+zip',
      }).isPublication
    ).toBe(true);
    expect(
      MediaType.parse({ mediaType: 'application/epub+zip' }).isPublication
    ).toBe(true);
    expect(
      MediaType.parse({ mediaType: 'application/lpf+zip' }).isPublication
    ).toBe(true);
    expect(
      MediaType.parse({ mediaType: 'application/pdf' }).isPublication
    ).toBe(true);
    expect(
      MediaType.parse({ mediaType: 'application/pdf+lcp' }).isPublication
    ).toBe(true);
    expect(
      MediaType.parse({
        mediaType: 'application/x.readium.w3c.wpub+json',
      }).isPublication
    ).toBe(true);
    expect(
      MediaType.parse({
        mediaType: 'application/x.readium.zab+zip',
      }).isPublication
    ).toBe(true);
  });
});
