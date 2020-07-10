/* Copyright 2020 Readium Foundation. All rights reserved.
 * Use of this source code is governed by a BSD-style license,
 * available in the LICENSE file present in the Github repository of the project.
 */

type ParametersMap = {
  [param: string]: string
}

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

  constructor(mediaType: string) {
    const components = mediaType.replace(/\s/g, "").split(";");
    const types = components[0].split("/");
    if (types.length === 2) {
      this.type = types[0].toLowerCase();
      this.subtype = types[1].toLowerCase();
    }

    let parameters: ParametersMap = {};
    for (let i = 1; i < components.length; i++) {
      const component = components[i].split("=");
      if (component.length === 2) {
        const key = component[0];
        const value = component[1];
        parameters[key] = value;
      }
    }
    this.parameters = parameters;

    let parametersString: string = "";
    for (const p in parameters) {
      const value = parameters[p];
      parametersString += `;${p}=${value}`;
    }
    this.string = `${this.type}/${this.subtype}${parametersString}`;

    this.encoding = parameters["encoding"];
  }

  /** Structured syntax suffix, e.g. `+zip` in `application/epub+zip`.
   *  Gives a hint on the underlying structure of this media type. 
   *  See. https://tools.ietf.org/html/rfc6838#section-4.2.8
   */
  public structuredSyntaxSuffix(): string | null {
    const parts = this.subtype.split("+");
    return parts.length > 1 ? `+${parts[parts.length - 1]}` : null;
  }

  /** Returns whether the given `other` media type is included in this media type.
   *  For example, `text/html` contains `text/html;charset=utf-8`.
   *  - `other` must match the parameters in the `parameters` property, but extra parameters
   *  are ignored.
   *  - Order of parameters is ignored.
   *  - Wildcards are supported, meaning that `image/*` contains `image/png`
   */
  public contains(other: MediaType | string): boolean {
    if (typeof other === "string" || other instanceof String) {
      other = new MediaType(other as string);
    }
    if (
      (this.type === "*" || this.type === other.type) &&
      (this.subtype === "*" || this.subtype === other.subtype)
    ) {
      return true;
    }
    return false;
  }

  /** Returns whether this media type and `other` are the same, ignoring parameters that 
   *  are not in both media types.
   *  For example, `text/html` matches `text/html;charset=utf-8`, but `text/html;charset=ascii`
   *  doesn't. This is basically like `contains`, but working in both direction.
   */
  public matches(other: MediaType | string): boolean {
    if (typeof other === "string" || other instanceof String) {
      other = new MediaType(other as string);
    }
    return this.contains(other) || other.contains(this);
  }

  /** Returns whether this media type is structured as a ZIP archive. */
  public isZIP(): boolean {
    return this.matches(MediaType.zip())
      || this.structuredSyntaxSuffix() === "+zip";
  }

  /** Returns whether this media type is structured as a JSON file. */
  public isJSON(): boolean {
    return this.matches(MediaType.json())
      || this.structuredSyntaxSuffix() === "+json";
  }

  /** Returns whether this media type is of an OPDS feed. */
  public isOPDS(): boolean {
    return this.matches(MediaType.opds1())
      || this.matches(MediaType.opds1Entry())
      || this.matches(MediaType.opds2())
      || this.matches(MediaType.opds2Publication())
      || this.matches(MediaType.opdsAuthentication());
  }

  /** Returns whether this media type is of an audio clip. */
  public isAudio(): boolean {
    return this.type === "audio";
  }

  /** Returns whether this media type is of a bitmap image, so excluding vectorial formats. */
  public isBitmap(): boolean {
    return this.matches(MediaType.bmp())
      || this.matches(MediaType.gif())
      || this.matches(MediaType.jpeg())
      || this.matches(MediaType.png())
      || this.matches(MediaType.tiff())
      || this.matches(MediaType.webp());
  }

  /** Returns whether this media type is of an HTML document. */
  public isHTML(): boolean {
    return this.matches(MediaType.html())
      || this.matches(MediaType.xhtml());
  }

  /** Returns whether this media type is of a video clip. */
  public isVideo(): boolean {
    return this.type === "video";
  }

  /** Returns whether this media type is of a Readium Web Publication Manifest. */
  public isRWPM(): boolean {
    return this.matches(MediaType.readiumAudiobookManifest())
      || this.matches(MediaType.divinaManifest())
      || this.matches(MediaType.readiumWebPubManifest());
  }

  // Known Media Types

  public static aac(): MediaType {
    return new this("audio/aac");
  }

  public static aiff(): MediaType {
    return new this("audio/aiff");
  }

  public static readiumAudiobook(): MediaType {
    return new this("application/audiobook+zip");
  }

  public static readiumAudiobookManifest(): MediaType {
    return new this("application/audiobook+json");
  }

  public static avi(): MediaType {
    return new this("video/x-msvideo");
  }

  public static binary(): MediaType {
    return new this("application/octet-stream");
  }

  public static bmp(): MediaType {
    return new this("image/bmp");
  }

  public static cbz(): MediaType {
    return new this("application/vnd.comicbook+zip");
  }

  public static css(): MediaType {
    return new this("text/css");
  }

  public static divina(): MediaType {
    return new this("application/divina+zip");
  }

  public static divinaManifest(): MediaType {
    return new this("application/divina+json");
  }

  public static epub(): MediaType {
    return new this("application/epub+zip");
  }

  public static gif(): MediaType {
    return new this("image/gif");
  }

  public static gz(): MediaType {
    return new this("application/gzip");
  }

  public static html(): MediaType {
    return new this("text/html");
  }

  public static javascript(): MediaType {
    return new this("text/javascript");
  }

  public static jpeg(): MediaType {
    return new this("image/jpeg");
  }

  public static json(): MediaType {
    return new this("application/json");
  }

  public static lpf(): MediaType {
    return new this("application/audiobook+lcp");
  }

  public static mp3(): MediaType {
    return new this("audio/mpeg");
  }

  public static mpeg(): MediaType {
    return new this("video/mpeg");
  }

  public static ncx(): MediaType {
    return new this("application/x-dtbncx+xml");
  }

  public static ogg(): MediaType {
    return new this("audio/ogg");
  }

  public static ogv(): MediaType {
    return new this("video/ogg");
  }

  public static opds1(): MediaType {
    return new this("application/atom+xml;profile=opds-catalog");
  }

  public static opds1Entry(): MediaType {
    return new this("application/atom+xml;type=entry;profile=opds-catalog");
  }

  public static opds2(): MediaType {
    return new this("application/opds+json");
  }

  public static opds2Publication(): MediaType {
    return new this("application/opds-publication+json");
  }

  public static opdsAuthentication(): MediaType {
    return new this("application/opds-authentication+json");
  }

  public static opus(): MediaType {
    return new this("audio/opus");
  }

  public static otf(): MediaType {
    return new this("font/otf");
  }

  public static pdf(): MediaType {
    return new this("application/pdf");
  }

  public static png(): MediaType {
    return new this("image/png");
  }

  public static smil(): MediaType {
    return new this("application/smil+xml");
  }

  public static svg(): MediaType {
    return new this("image/svg+xml");
  }

  public static text(): MediaType {
    return new this("text/plain");
  }

  public static tiff(): MediaType {
    return new this("image/tiff");
  }

  public static ttf(): MediaType {
    return new this("font/ttf");
  }

  public static wav(): MediaType {
    return new this("audio/wav");
  }

  public static webmAudio(): MediaType {
    return new this("audio/webm");
  }

  public static webmVideo(): MediaType {
    return new this("video/webm");
  }

  public static webp(): MediaType {
    return new this("image/webp");
  }

  public static readiumWebPub(): MediaType {
    return new this("application/webpub+zip");
  }

  public static readiumWebPubManifest(): MediaType {
    return new this("application/webpub+json");
  }

  public static w3cWPUBManifest(): MediaType {
    return new this("application/x.readium.w3c.wpub+json");
  }

  public static woff(): MediaType {
    return new this("font/woff");
  }

  public static woff2(): MediaType {
    return new this("font/woff2");
  }

  public static xhtml(): MediaType {
    return new this("application/xhtml+xml");
  }

  public static xml(): MediaType {
    return new this("application/xml");
  }

  public static zab(): MediaType {
    return new this("application/x.readium.zab+zip");
  }

  public static zip(): MediaType {
    return new this("application/zip");
  }
}