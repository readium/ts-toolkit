/* Copyright 2020 Readium Foundation. All rights reserved.
 * Use of this source code is governed by a BSD-style license,
 * available in the LICENSE file present in the Github repository of the project.
 */

import { MediaType } from "./MediaType";

/** Represents a known file format, uniquely identified by a media type. */
export default class Format {

  /** A human readable name identifying the format, which might be presented to the user. */
  public name: string;

  /** The canonical media type that identifies the best (most officially) this format. */
  public mediaType: MediaType;

  /** The default file extension to use for this format. */
  public fileExtension: string;

  constructor(params: { name: string; mediaType: MediaType; fileExtension: string }) {
    this.name = params.name;
    this.mediaType = params.mediaType;
    this.fileExtension = params.fileExtension;
  };

  // Formats used by Readium. Reading apps are welcome 
  // to extend the static constants with additional formats.

  public static readiumAudiobook(): Format {
    return new this({
      name: "Readium Audiobook",
      mediaType: MediaType.readiumAudiobook(),
      fileExtension: "audiobook"
    });
  }

  public static readiumAudiobookManifest(): Format {
    return new this({
      name: "Readium Audiobook",
      mediaType: MediaType.readiumAudiobookManifest(),
      fileExtension: "json"
    });
  }

  public static bmp(): Format {
    return new this({
      name: "BMP",
      mediaType: MediaType.bmp(),
      fileExtension: "bmp"
    })
  }

  public static cbz(): Format {
    return new this({
      name: "Comic Book Archive",
      mediaType: MediaType.cbz(),
      fileExtension: "cbz"
    })
  }

  public static divina(): Format {
    return new this({
      name: "Digital Visual Narratives",
      mediaType: MediaType.divina(),
      fileExtension: "divina"
    })
  }

  public static divinaManifest(): Format {
    return new this({
      name: "Digital Visual Narratives",
      mediaType: MediaType.divinaManifest(),
      fileExtension: "json"
    });
  }

  public static epub(): Format {
    return new this({
      name: "EPUB",
      mediaType: MediaType.epub(),
      fileExtension: "epub"
    })
  }

  public static gif(): Format {
    return new this({
      name: "GIF",
      mediaType: MediaType.gif(),
      fileExtension: "gif"
    });
  }

  public static html(): Format {
    return new this({
      name: "HTML",
      mediaType: MediaType.html(),
      fileExtension: "html"
    });
  }

  public static jpeg(): Format {
    return new this({
      name: "JPEG",
      mediaType: MediaType.jpeg(),
      fileExtension: "jpg"
    });
  }

  public static lpf(): Format {
    return new this({
      name: "Lightweight Packaging Format",
      mediaType: MediaType.lpf(),
      fileExtension: "lpf"
    })
  }

  public static opds1Feed(): Format {
    return new this({
      name: "OPDS",
      mediaType: MediaType.opds1(),
      fileExtension: "atom"
    });
  }

  public static opds1Entry(): Format {
    return new this({
      name: "OPDS",
      mediaType: MediaType.opds1Entry(),
      fileExtension: "atom"
    });
  }

  public static opds2Feed(): Format {
    return new this({
      name: "OPDS",
      mediaType: MediaType.opds2(),
      fileExtension: "json"
    });
  }

  public static opds2Publication(): Format {
    return new this({
      name: "OPDS",
      mediaType: MediaType.opds2Publication(),
      fileExtension: "json"
    });
  }

  public static opdsAuthentication(): Format {
    return new this({
      name: "OPDS Authentication Document",
      mediaType: MediaType.opdsAuthentication(),
      fileExtension: "json"
    });
  }

  public static pdf(): Format {
    return new this({
      name: "PDF",
      mediaType: MediaType.pdf(),
      fileExtension: "pdf"
    });
  }

  public static png(): Format {
    return new this({
      name: "PNG",
      mediaType: MediaType.png(),
      fileExtension: "png"
    });
  }

  public static tiff(): Format {
    return new this({
      name: "TIFF",
      mediaType: MediaType.tiff(),
      fileExtension: "tiff"
    });
  }

  public static w3cWPUBManifest(): Format {
    return new this({
      name: "Web Publication",
      mediaType: MediaType.w3cWPUBManifest(),
      fileExtension: "json"
    })
  }

  public static webp(): Format {
    return new this({
      name: "WEBP",
      mediaType: MediaType.webp(),
      fileExtension: "webp"
    });
  }

  public static readiumWebPub(): Format {
    return new this({
      name: "Readium Web Publication",
      mediaType: MediaType.readiumWebPub(),
      fileExtension: "webpub"
    })
  }

  public static readiumWebPubManifest(): Format {
    return new this({
      name: "Readium Web Publication",
      mediaType: MediaType.readiumWebPubManifest(),
      fileExtension: "json"
    });
  }

  public static zab(): Format {
    return new this({
      name: "Zipped Audio Book",
      mediaType: MediaType.zab(),
      fileExtension: "zab"
    })
  }
}