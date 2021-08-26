/* Copyright 2021 Readium Foundation. All rights reserved.
 * Use of this source code is governed by a BSD-style license,
 * available in the LICENSE file present in the Github repository of the project.
 */

import { Observable } from '../Observable';
import {
  ColorProperty,
  EnumProperty,
  RangeProperty,
  SwitchProperty,
} from '../PresentationProperty';
import { PresentationKeys } from './PresentationKeys';
import { PresentationProperties } from '../PresentationProperties';

/**
 * Extension for Standart Presentation Properties
 */
declare module '../PresentationProperties' {
  export interface PresentationProperties {
    verticalPageMargins: Observable<RangeProperty> | undefined;
    horizontalPageMargins: Observable<RangeProperty> | undefined;
    appearance: Observable<EnumProperty> | undefined;
    backgroundColor: Observable<ColorProperty> | undefined;
    textColor: Observable<ColorProperty> | undefined;
    textAlignment: Observable<EnumProperty> | undefined;
    hyphenation: Observable<SwitchProperty> | undefined;
    ligature: Observable<SwitchProperty> | undefined;
    fontFamily: Observable<EnumProperty> | undefined;
    fontSize: Observable<RangeProperty> | undefined;
    lineHeight: Observable<RangeProperty> | undefined;
    paragraphIndent: Observable<RangeProperty> | undefined;
    paragraphSpacing: Observable<RangeProperty> | undefined;
    wordSpacing: Observable<RangeProperty> | undefined;
    letterSpacing: Observable<RangeProperty> | undefined;
    publisherDefaults: Observable<SwitchProperty> | undefined;
    readingProgression: Observable<EnumProperty> | undefined;
    doublePageSpread: Observable<EnumProperty> | undefined;
    columns: Observable<RangeProperty> | undefined;
    overflow: Observable<EnumProperty> | undefined;
    continuous: Observable<SwitchProperty> | undefined;
    orientation: Observable<EnumProperty> | undefined;
    fit: Observable<EnumProperty> | undefined;
    playbackRate: Observable<RangeProperty> | undefined;
    quality: Observable<RangeProperty> | undefined;
    captions: Observable<EnumProperty> | undefined;
  }
}

Object.defineProperty(
  PresentationProperties.prototype,
  PresentationKeys.VERTICAL_PAGE_MARGINS,
  {
    get: function verticalPageMargins(): Observable<RangeProperty> | undefined {
      return this.properties.get(PresentationKeys.VERTICAL_PAGE_MARGINS);
    },
  }
);

Object.defineProperty(
  PresentationProperties.prototype,
  PresentationKeys.HORIZONTAL_PAGE_MARGINS,
  {
    get: function horizontalPageMargins():
      | Observable<RangeProperty>
      | undefined {
      return this.properties.get(PresentationKeys.HORIZONTAL_PAGE_MARGINS);
    },
  }
);

Object.defineProperty(
  PresentationProperties.prototype,
  PresentationKeys.APPEARANCE,
  {
    get: function appearance(): Observable<EnumProperty> | undefined {
      return this.properties.get(PresentationKeys.APPEARANCE);
    },
  }
);

Object.defineProperty(
  PresentationProperties.prototype,
  PresentationKeys.BACKGROUND_COLOR,
  {
    get: function backgroundColor(): Observable<ColorProperty> | undefined {
      return this.properties.get(PresentationKeys.BACKGROUND_COLOR);
    },
  }
);

Object.defineProperty(
  PresentationProperties.prototype,
  PresentationKeys.TEXT_COLOR,
  {
    get: function textColor(): Observable<ColorProperty> | undefined {
      return this.properties.get(PresentationKeys.TEXT_COLOR);
    },
  }
);

Object.defineProperty(
  PresentationProperties.prototype,
  PresentationKeys.TEXT_ALIGNMENT,
  {
    get: function textAlignment(): Observable<EnumProperty> | undefined {
      return this.properties.get(PresentationKeys.TEXT_ALIGNMENT);
    },
  }
);

Object.defineProperty(
  PresentationProperties.prototype,
  PresentationKeys.HYPHENATION,
  {
    get: function hyphenation(): Observable<SwitchProperty> | undefined {
      return this.properties.get(PresentationKeys.HYPHENATION);
    },
  }
);

Object.defineProperty(
  PresentationProperties.prototype,
  PresentationKeys.LIGATURE,
  {
    get: function ligature(): Observable<SwitchProperty> | undefined {
      return this.properties.get(PresentationKeys.LIGATURE);
    },
  }
);

Object.defineProperty(
  PresentationProperties.prototype,
  PresentationKeys.FONT_FAMILY,
  {
    get: function fontFamily(): Observable<EnumProperty> | undefined {
      return this.properties.get(PresentationKeys.FONT_FAMILY);
    },
  }
);

Object.defineProperty(
  PresentationProperties.prototype,
  PresentationKeys.FONT_SIZE,
  {
    get: function fontSize(): Observable<RangeProperty> | undefined {
      return this.properties.get(PresentationKeys.FONT_SIZE);
    },
  }
);

Object.defineProperty(
  PresentationProperties.prototype,
  PresentationKeys.LINE_HEIGHT,
  {
    get: function lineHeight(): Observable<RangeProperty> | undefined {
      return this.properties.get(PresentationKeys.LINE_HEIGHT);
    },
  }
);

Object.defineProperty(
  PresentationProperties.prototype,
  PresentationKeys.PARAGRAPH_INDENT,
  {
    get: function paragraphIndent(): Observable<RangeProperty> | undefined {
      return this.properties.get(PresentationKeys.PARAGRAPH_INDENT);
    },
  }
);

Object.defineProperty(
  PresentationProperties.prototype,
  PresentationKeys.PARAGRAPH_SPACING,
  {
    get: function paragraphSpacing(): Observable<RangeProperty> | undefined {
      return this.properties.get(PresentationKeys.PARAGRAPH_SPACING);
    },
  }
);

Object.defineProperty(
  PresentationProperties.prototype,
  PresentationKeys.WORD_SPACING,
  {
    get: function wordSpacing(): Observable<RangeProperty> | undefined {
      return this.properties.get(PresentationKeys.WORD_SPACING);
    },
  }
);

Object.defineProperty(
  PresentationProperties.prototype,
  PresentationKeys.LETTER_SPACING,
  {
    get: function letterSpacing(): Observable<RangeProperty> | undefined {
      return this.properties.get(PresentationKeys.LETTER_SPACING);
    },
  }
);

Object.defineProperty(
  PresentationProperties.prototype,
  PresentationKeys.PUBLISHER_DEFAULTS,
  {
    get: function publisherDefaults(): Observable<SwitchProperty> | undefined {
      return this.properties.get(PresentationKeys.PUBLISHER_DEFAULTS);
    },
  }
);

Object.defineProperty(
  PresentationProperties.prototype,
  PresentationKeys.READING_PROGRESSION,
  {
    get: function readingProgression(): Observable<EnumProperty> | undefined {
      return this.properties.get(PresentationKeys.READING_PROGRESSION);
    },
  }
);

Object.defineProperty(
  PresentationProperties.prototype,
  PresentationKeys.DOUBLE_PAGE_SPREAD,
  {
    get: function doublePageSpread(): Observable<EnumProperty> | undefined {
      return this.properties.get(PresentationKeys.DOUBLE_PAGE_SPREAD);
    },
  }
);

Object.defineProperty(
  PresentationProperties.prototype,
  PresentationKeys.COLUMNS,
  {
    get: function columns(): Observable<RangeProperty> | undefined {
      return this.properties.get(PresentationKeys.COLUMNS);
    },
  }
);

Object.defineProperty(
  PresentationProperties.prototype,
  PresentationKeys.OVERFLOW,
  {
    get: function overflow(): Observable<EnumProperty> | undefined {
      return this.properties.get(PresentationKeys.OVERFLOW);
    },
  }
);

Object.defineProperty(
  PresentationProperties.prototype,
  PresentationKeys.CONTINUOUS,
  {
    get: function continuous(): Observable<SwitchProperty> | undefined {
      return this.properties.get(PresentationKeys.CONTINUOUS);
    },
  }
);

Object.defineProperty(
  PresentationProperties.prototype,
  PresentationKeys.ORIENTATION,
  {
    get: function orientation(): Observable<EnumProperty> | undefined {
      return this.properties.get(PresentationKeys.ORIENTATION);
    },
  }
);

Object.defineProperty(PresentationProperties.prototype, PresentationKeys.FIT, {
  get: function fit(): Observable<EnumProperty> | undefined {
    return this.properties.get(PresentationKeys.FIT);
  },
});

Object.defineProperty(
  PresentationProperties.prototype,
  PresentationKeys.PLAYBACK_RATE,
  {
    get: function playbackRate(): Observable<RangeProperty> | undefined {
      return this.properties.get(PresentationKeys.PLAYBACK_RATE);
    },
  }
);

Object.defineProperty(
  PresentationProperties.prototype,
  PresentationKeys.PLAYBACK_VOLUME,
  {
    get: function playbackVolume(): Observable<RangeProperty> | undefined {
      return this.properties.get(PresentationKeys.PLAYBACK_VOLUME);
    },
  }
);

Object.defineProperty(
  PresentationProperties.prototype,
  PresentationKeys.QUALITY,
  {
    get: function quality(): Observable<RangeProperty> | undefined {
      return this.properties.get(PresentationKeys.QUALITY);
    },
  }
);

Object.defineProperty(
  PresentationProperties.prototype,
  PresentationKeys.CAPTIONS,
  {
    get: function quality(): Observable<EnumProperty> | undefined {
      return this.properties.get(PresentationKeys.CAPTIONS);
    },
  }
);
