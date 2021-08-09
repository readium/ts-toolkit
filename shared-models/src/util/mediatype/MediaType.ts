/* Copyright 2021 Readium Foundation. All rights reserved.
 * Use of this source code is governed by a BSD-style license,
 * available in the LICENSE file present in the Github repository of the project.
 */

type ParametersMap = {
  [param: string]: string;
};

/** Represents a string media type.
 *  `MediaType` handles:
 *  - components parsing – eg. type, subtype and parameters,
 *  - media types comparison.
 */
export class MediaType {
  /** The type component, e.g. `application` in `application/epub+zip`. */
  public type: string;

  /** The subtype component, e.g. `epub+zip` in `application/epub+zip`. */
  public subtype: string;

  /** The parameters in the media type, such as `charset=utf-8`. */
  public parameters: ParametersMap;

  /** The string representation of this media type. */
  public string: string;

  /** Encoding as declared in the `charset` parameter, if there's any. */
  public encoding?: string;

  /** A human readable name identifying the media type, which may be presented to the user. */
  public name?: string;

  /** The default file extension to use for this media type. */
  public fileExtension?: string;

  /** Creates a MediaType object. */
  constructor(values: {
    mediaType: string;
    name?: string;
    fileExtension?: string;
  }) {
    let type: string;
    let subtype: string;
    let components = values.mediaType.replace(/\s/g, '').split(';');
    const types = components[0].split('/');
    if (types.length === 2) {
      type = types[0].toLowerCase().trim();
      subtype = types[1].toLowerCase().trim();

      if (type.length === 0 || subtype.length === 0) {
        throw new Error('Invalid media type');
      }
    } else {
      throw new Error('Invalid media type');
    }

    const _parameters: ParametersMap = {};
    for (let i = 1; i < components.length; i++) {
      const component = components[i].split('=');
      if (component.length === 2) {
        const key = component[0].toLocaleLowerCase();
        const value =
          key === 'charset' ? component[1].toUpperCase() : component[1];
        _parameters[key] = value;
      }
    }

    const parameters: ParametersMap = {};
    const keys = Object.keys(_parameters);
    keys.sort((a, b) => a.localeCompare(b));

    keys.forEach(x => (parameters[x] = _parameters[x]));

    let parametersString: string = '';
    for (const p in parameters) {
      const value = parameters[p];
      parametersString += `;${p}=${value}`;
    }
    const string = `${type}/${subtype}${parametersString}`;

    const encoding = parameters['encoding'];

    this.string = string;
    this.type = type;
    this.subtype = subtype;
    this.parameters = parameters;
    this.encoding = encoding;
    this.name = values.name;
    this.fileExtension = values.fileExtension;
  }

  public static parse(values: {
    mediaType: string;
    name?: string;
    fileExtension?: string;
  }): MediaType {
    return new MediaType(values);
  }

  /** Structured syntax suffix, e.g. `+zip` in `application/epub+zip`.
   *  Gives a hint on the underlying structure of this media type.
   *  See. https://tools.ietf.org/html/rfc6838#section-4.2.8
   */
  public get structuredSyntaxSuffix(): string | undefined {
    const parts = this.subtype.split('+');
    return parts.length > 1 ? `+${parts[parts.length - 1]}` : undefined;
  }

  /** Parameter values might or might not be case-sensitive, depending on the semantics of
   * the parameter name.
   * https://tools.ietf.org/html/rfc2616#section-3.7
   *
   * The character set names may be up to 40 characters taken from the printable characters
   * of US-ASCII.  However, no distinction is made between use of upper and lower case
   * letters.
   * https://www.iana.org/assignments/character-sets/character-sets.xhtml
   */
  public get charset(): string | undefined {
    return this.parameters['charset'];
  }

  /** Returns whether the given `other` media type is included in this media type.
   *  For example, `text/html` contains `text/html;charset=utf-8`.
   *  - `other` must match the parameters in the `parameters` property, but extra parameters
   *  are ignored.
   *  - Order of parameters is ignored.
   *  - Wildcards are supported, meaning that `image/*` contains `image/png`
   */
  public contains(other: MediaType | string): boolean {
    const _other =
      typeof other === 'string' ? MediaType.parse({ mediaType: other }) : other;

    if (
      !(
        (this.type === '*' || this.type === _other.type) &&
        (this.subtype === '*' || this.subtype === _other.subtype)
      )
    ) {
      return false;
    }

    const paramSet = new Set(
      Object.entries(this.parameters).map(([key, value]) => `${key}=${value}`)
    );
    const otherParamSet = new Set(
      Object.entries(_other.parameters).map(([key, value]) => `${key}=${value}`)
    );

    // check weather otherParamSet contains all parameters
    for (const key of Array.from(paramSet.values())) {
      if (!otherParamSet.has(key)) {
        return false;
      }
    }

    return true;
  }

  /** Returns whether this media type and `other` are the same, ignoring parameters that
   *  are not in both media types.
   *  For example, `text/html` matches `text/html;charset=utf-8`, but `text/html;charset=ascii`
   *  doesn't. This is basically like `contains`, but working in both direction.
   */
  public matches(other: MediaType | string): boolean {
    const _other =
      typeof other === 'string' ? MediaType.parse({ mediaType: other }) : other;
    return this.contains(_other) || _other.contains(this);
  }

  /**
   * Returns whether this media type matches any of the [others] media types.
   */
  public matchesAny(...others: MediaType[] | string[]): boolean {
    for (const other of others) {
      if (this.matches(other)) {
        return true;
      }
    }
    return false;
  }

  /** Checks the MediaType equals another one (comparing their string) */
  public equals(other: MediaType): boolean {
    return this.string === other.string;
  }

  /** Returns whether this media type is structured as a ZIP archive. */
  public get isZIP(): boolean {
    return (
      this.matchesAny(
        MediaType.ZIP,
        MediaType.LCP_PROTECTED_AUDIOBOOK,
        MediaType.LCP_PROTECTED_PDF
      ) || this.structuredSyntaxSuffix === '+zip'
    );
  }

  /** Returns whether this media type is structured as a JSON file. */
  public get isJSON(): boolean {
    return (
      this.matchesAny(MediaType.JSON) || this.structuredSyntaxSuffix === '+json'
    );
  }

  /** Returns whether this media type is of an OPDS feed. */
  public get isOPDS(): boolean {
    return (
      this.matchesAny(
        MediaType.OPDS1,
        MediaType.OPDS1_ENTRY,
        MediaType.OPDS2,
        MediaType.OPDS2_PUBLICATION,
        MediaType.OPDS_AUTHENTICATION
      ) || this.structuredSyntaxSuffix === '+json'
    );
  }

  /** Returns whether this media type is of an HTML document. */
  public get isHTML(): boolean {
    return this.matchesAny(MediaType.HTML, MediaType.XHTML);
  }

  /** Returns whether this media type is of a bitmap image, so excluding vectorial formats. */
  public get isBitmap(): boolean {
    return this.matchesAny(
      MediaType.BMP,
      MediaType.GIF,
      MediaType.JPEG,
      MediaType.PNG,
      MediaType.TIFF,
      MediaType.WEBP
    );
  }

  /** Returns whether this media type is of an audio clip. */
  public get isAudio(): boolean {
    return this.type === 'audio';
  }

  /** Returns whether this media type is of a video clip. */
  public get isVideo(): boolean {
    return this.type === 'video';
  }

  /** Returns whether this media type is of a Readium Web Publication Manifest. */
  public get isRWPM(): boolean {
    return this.matchesAny(
      MediaType.READIUM_AUDIOBOOK_MANIFEST,
      MediaType.DIVINA_MANIFEST,
      MediaType.READIUM_WEBPUB_MANIFEST
    );
  }

  /** Returns whether this media type is of a publication file. */
  public get isPublication(): boolean {
    return this.matchesAny(
      MediaType.READIUM_AUDIOBOOK,
      MediaType.READIUM_AUDIOBOOK_MANIFEST,
      MediaType.CBZ,
      MediaType.DIVINA,
      MediaType.DIVINA_MANIFEST,
      MediaType.EPUB,
      MediaType.LCP_PROTECTED_AUDIOBOOK,
      MediaType.LCP_PROTECTED_PDF,
      MediaType.LPF,
      MediaType.PDF,
      MediaType.W3C_WPUB_MANIFEST,
      MediaType.READIUM_WEBPUB,
      MediaType.READIUM_WEBPUB_MANIFEST,
      MediaType.ZAB
    );
  }

  // Known Media Types
  public static get AAC(): MediaType {
    return MediaType.parse({ mediaType: 'audio/aac', fileExtension: 'aac' });
  }
  public static get ACSM(): MediaType {
    return MediaType.parse({
      mediaType: 'application/vnd.adobe.adept+xml',
      name: 'Adobe Content Server Message',
      fileExtension: 'acsm',
    });
  }
  public static get AIFF(): MediaType {
    return MediaType.parse({ mediaType: 'audio/aiff', fileExtension: 'aiff' });
  }
  public static get AVI(): MediaType {
    return MediaType.parse({
      mediaType: 'video/x-msvideo',
      fileExtension: 'avi',
    });
  }
  public static get BINARY(): MediaType {
    return MediaType.parse({ mediaType: 'application/octet-stream' });
  }
  public static get BMP(): MediaType {
    return MediaType.parse({ mediaType: 'image/bmp', fileExtension: 'bmp' });
  }
  public static get CBZ(): MediaType {
    return MediaType.parse({
      mediaType: 'application/vnd.comicbook+zip',
      name: 'Comic Book Archive',
      fileExtension: 'cbz',
    });
  }
  public static get CSS(): MediaType {
    return MediaType.parse({ mediaType: 'text/css', fileExtension: 'css' });
  }
  public static get DIVINA(): MediaType {
    return MediaType.parse({
      mediaType: 'application/divina+zip',
      name: 'Digital Visual Narratives',
      fileExtension: 'divina',
    });
  }
  public static get DIVINA_MANIFEST(): MediaType {
    return MediaType.parse({
      mediaType: 'application/divina+json',
      name: 'Digital Visual Narratives',
      fileExtension: 'json',
    });
  }
  public static get EPUB(): MediaType {
    return MediaType.parse({
      mediaType: 'application/epub+zip',
      name: 'EPUB',
      fileExtension: 'epub',
    });
  }
  public static get GIF(): MediaType {
    return MediaType.parse({ mediaType: 'image/gif', fileExtension: 'gif' });
  }
  public static get GZ(): MediaType {
    return MediaType.parse({
      mediaType: 'application/gzip',
      fileExtension: 'gz',
    });
  }
  public static get HTML(): MediaType {
    return MediaType.parse({ mediaType: 'text/html', fileExtension: 'html' });
  }
  public static get JAVASCRIPT(): MediaType {
    return MediaType.parse({
      mediaType: 'text/javascript',
      fileExtension: 'js',
    });
  }
  public static get JPEG(): MediaType {
    return MediaType.parse({ mediaType: 'image/jpeg', fileExtension: 'jpeg' });
  }
  public static get JSON(): MediaType {
    return MediaType.parse({ mediaType: 'application/json' });
  }
  public static get LCP_LICENSE_DOCUMENT(): MediaType {
    return MediaType.parse({
      mediaType: 'application/vnd.readium.lcp.license.v1.0+json',
      name: 'LCP License',
      fileExtension: 'lcpl',
    });
  }
  public static get LCP_PROTECTED_AUDIOBOOK(): MediaType {
    return MediaType.parse({
      mediaType: 'application/audiobook+lcp',
      name: 'LCP Protected Audiobook',
      fileExtension: 'lcpa',
    });
  }
  public static get LCP_PROTECTED_PDF(): MediaType {
    return MediaType.parse({
      mediaType: 'application/pdf+lcp',
      name: 'LCP Protected PDF',
      fileExtension: 'lcpdf',
    });
  }
  public static get LCP_STATUS_DOCUMENT(): MediaType {
    return MediaType.parse({
      mediaType: 'application/vnd.readium.license.status.v1.0+json',
    });
  }
  public static get LPF(): MediaType {
    return MediaType.parse({
      mediaType: 'application/lpf+zip',
      fileExtension: 'lpf',
    });
  }
  public static get MP3(): MediaType {
    return MediaType.parse({ mediaType: 'audio/mpeg', fileExtension: 'mp3' });
  }
  public static get MPEG(): MediaType {
    return MediaType.parse({ mediaType: 'video/mpeg', fileExtension: 'mpeg' });
  }
  public static get NCX(): MediaType {
    return MediaType.parse({
      mediaType: 'application/x-dtbncx+xml',
      fileExtension: 'ncx',
    });
  }
  public static get OGG(): MediaType {
    return MediaType.parse({ mediaType: 'audio/ogg', fileExtension: 'oga' });
  }
  public static get OGV(): MediaType {
    return MediaType.parse({ mediaType: 'video/ogg', fileExtension: 'ogv' });
  }
  public static get OPDS1(): MediaType {
    return MediaType.parse({
      mediaType: 'application/atom+xml;profile=opds-catalog',
    });
  }
  public static get OPDS1_ENTRY(): MediaType {
    return MediaType.parse({
      mediaType: 'application/atom+xml;type=entry;profile=opds-catalog',
    });
  }
  public static get OPDS2(): MediaType {
    return MediaType.parse({ mediaType: 'application/opds+json' });
  }
  public static get OPDS2_PUBLICATION(): MediaType {
    return MediaType.parse({ mediaType: 'application/opds-publication+json' });
  }
  public static get OPDS_AUTHENTICATION(): MediaType {
    return MediaType.parse({
      mediaType: 'application/opds-authentication+json',
    });
  }
  public static get OPUS(): MediaType {
    return MediaType.parse({ mediaType: 'audio/opus', fileExtension: 'opus' });
  }
  public static get OTF(): MediaType {
    return MediaType.parse({ mediaType: 'font/otf', fileExtension: 'otf' });
  }
  public static get PDF(): MediaType {
    return MediaType.parse({
      mediaType: 'application/pdf',
      name: 'PDF',
      fileExtension: 'pdf',
    });
  }
  public static get PNG(): MediaType {
    return MediaType.parse({ mediaType: 'image/png', fileExtension: 'png' });
  }
  public static get READIUM_AUDIOBOOK(): MediaType {
    return MediaType.parse({
      mediaType: 'application/audiobook+zip',
      name: 'Readium Audiobook',
      fileExtension: 'audiobook',
    });
  }
  public static get READIUM_AUDIOBOOK_MANIFEST(): MediaType {
    return MediaType.parse({
      mediaType: 'application/audiobook+json',
      name: 'Readium Audiobook',
      fileExtension: 'json',
    });
  }
  public static get READIUM_WEBPUB(): MediaType {
    return MediaType.parse({
      mediaType: 'application/webpub+zip',
      name: 'Readium Web Publication',
      fileExtension: 'webpub',
    });
  }
  public static get READIUM_WEBPUB_MANIFEST(): MediaType {
    return MediaType.parse({
      mediaType: 'application/webpub+json',
      name: 'Readium Web Publication',
      fileExtension: 'json',
    });
  }
  public static get SMIL(): MediaType {
    return MediaType.parse({
      mediaType: 'application/smil+xml',
      fileExtension: 'smil',
    });
  }
  public static get SVG(): MediaType {
    return MediaType.parse({
      mediaType: 'image/svg+xml',
      fileExtension: 'svg',
    });
  }
  public static get TEXT(): MediaType {
    return MediaType.parse({ mediaType: 'text/plain', fileExtension: 'txt' });
  }
  public static get TIFF(): MediaType {
    return MediaType.parse({ mediaType: 'image/tiff', fileExtension: 'tiff' });
  }
  public static get TTF(): MediaType {
    return MediaType.parse({ mediaType: 'font/ttf', fileExtension: 'ttf' });
  }
  public static get W3C_WPUB_MANIFEST(): MediaType {
    return MediaType.parse({
      mediaType: 'application/x.readium.w3c.wpub+json',
      name: 'Web Publication',
      fileExtension: 'json',
    });
  }
  public static get WAV(): MediaType {
    return MediaType.parse({ mediaType: 'audio/wav', fileExtension: 'wav' });
  }
  public static get WEBM_AUDIO(): MediaType {
    return MediaType.parse({ mediaType: 'audio/webm', fileExtension: 'webm' });
  }
  public static get WEBM_VIDEO(): MediaType {
    return MediaType.parse({ mediaType: 'video/webm', fileExtension: 'webm' });
  }
  public static get WEBP(): MediaType {
    return MediaType.parse({ mediaType: 'image/webp', fileExtension: 'webp' });
  }
  public static get WOFF(): MediaType {
    return MediaType.parse({ mediaType: 'font/woff', fileExtension: 'woff' });
  }
  public static get WOFF2(): MediaType {
    return MediaType.parse({ mediaType: 'font/woff2', fileExtension: 'woff2' });
  }
  public static get XHTML(): MediaType {
    return MediaType.parse({
      mediaType: 'application/xhtml+xml',
      fileExtension: 'xhtml',
    });
  }
  public static get XML(): MediaType {
    return MediaType.parse({
      mediaType: 'application/xml',
      fileExtension: 'xml',
    });
  }
  public static get ZAB(): MediaType {
    return MediaType.parse({
      mediaType: 'application/x.readium.zab+zip',
      name: 'Zipped Audio Book',
      fileExtension: 'zab',
    });
  }
  public static get ZIP(): MediaType {
    return MediaType.parse({
      mediaType: 'application/zip',
      fileExtension: 'zip',
    });
  }
}
