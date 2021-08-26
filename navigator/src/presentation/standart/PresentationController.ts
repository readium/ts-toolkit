/* Copyright 2021 Readium Foundation. All rights reserved.
 * Use of this source code is governed by a BSD-style license,
 * available in the LICENSE file present in the Github repository of the project.
 */

import { Observable } from '../Observable';
import { PresentationKeys } from './PresentationKeys';
import {
  ColorSetting,
  EnumSetting,
  RangeSetting,
  SwitchSetting,
} from '../PresentationSetting';
import { PresentationController } from '../PresentationController';

/**
 * Extension for Standart Presentation Controller
 */
declare module '../PresentationController' {
  export interface PresentationController {
    readonly verticalPageMargins: Observable<RangeSetting>;
    readonly horizontalPageMargins: Observable<RangeSetting>;
    readonly appearance: Observable<EnumSetting>;
    readonly backgroundColor: Observable<ColorSetting>;
    readonly textColor: Observable<ColorSetting>;
    readonly textAlignment: Observable<EnumSetting>;
    readonly hyphenation: Observable<SwitchSetting>;
    readonly ligature: Observable<SwitchSetting>;
    readonly fontFamily: Observable<EnumSetting>;
    readonly fontSize: Observable<RangeSetting>;
    readonly lineHeight: Observable<RangeSetting>;
    readonly paragraphIndent: Observable<RangeSetting>;
    readonly paragraphSpacing: Observable<RangeSetting>;
    readonly wordSpacing: Observable<RangeSetting>;
    readonly letterSpacing: Observable<RangeSetting>;
    readonly publisherDefaults: Observable<SwitchSetting>;
    readonly readingProgression: Observable<EnumSetting>;
    readonly doublePageSpread: Observable<EnumSetting>;
    readonly columns: Observable<RangeSetting>;
    readonly overflow: Observable<EnumSetting>;
    readonly continuous: Observable<SwitchSetting>;
    readonly orientation: Observable<EnumSetting>;
    readonly fit: Observable<EnumSetting>;
    readonly playbackRate: Observable<RangeSetting>;
    readonly playbackVolume: Observable<RangeSetting>;
    readonly Range: Observable<RangeSetting>;
    readonly captions: Observable<EnumSetting>;
  }
}

Object.defineProperty(
  PresentationController.prototype,
  PresentationKeys.VERTICAL_PAGE_MARGINS,
  {
    get: function verticalPageMargins(): Observable<RangeSetting> {
      return (this.settings.get(
        PresentationKeys.VERTICAL_PAGE_MARGINS
      ) as any) as Observable<RangeSetting>;
    },
  }
);

Object.defineProperty(
  PresentationController.prototype,
  PresentationKeys.HORIZONTAL_PAGE_MARGINS,
  {
    get: function horizontalPageMargins(): Observable<RangeSetting> {
      return (this.settings.get(
        PresentationKeys.HORIZONTAL_PAGE_MARGINS
      ) as any) as Observable<RangeSetting>;
    },
  }
);

Object.defineProperty(
  PresentationController.prototype,
  PresentationKeys.APPEARANCE,
  {
    get: function appearance(): Observable<EnumSetting> {
      return (this.settings.get(
        PresentationKeys.APPEARANCE
      ) as any) as Observable<EnumSetting>;
    },
  }
);

Object.defineProperty(
  PresentationController.prototype,
  PresentationKeys.BACKGROUND_COLOR,
  {
    get: function backgroundColor(): Observable<ColorSetting> {
      return (this.settings.get(
        PresentationKeys.BACKGROUND_COLOR
      ) as any) as Observable<ColorSetting>;
    },
  }
);

Object.defineProperty(
  PresentationController.prototype,
  PresentationKeys.TEXT_COLOR,
  {
    get: function textColor(): Observable<ColorSetting> {
      return (this.settings.get(
        PresentationKeys.TEXT_COLOR
      ) as any) as Observable<ColorSetting>;
    },
  }
);

Object.defineProperty(
  PresentationController.prototype,
  PresentationKeys.TEXT_ALIGNMENT,
  {
    get: function textAlignment(): Observable<EnumSetting> {
      return (this.settings.get(
        PresentationKeys.TEXT_ALIGNMENT
      ) as any) as Observable<EnumSetting>;
    },
  }
);

Object.defineProperty(
  PresentationController.prototype,
  PresentationKeys.HYPHENATION,
  {
    get: function hyphenation(): Observable<SwitchSetting> {
      return (this.settings.get(
        PresentationKeys.HYPHENATION
      ) as any) as Observable<SwitchSetting>;
    },
  }
);

Object.defineProperty(
  PresentationController.prototype,
  PresentationKeys.LIGATURE,
  {
    get: function ligature(): Observable<SwitchSetting> {
      return (this.settings.get(
        PresentationKeys.LIGATURE
      ) as any) as Observable<SwitchSetting>;
    },
  }
);

Object.defineProperty(
  PresentationController.prototype,
  PresentationKeys.FONT_FAMILY,
  {
    get: function ligature(): Observable<EnumSetting> {
      return (this.settings.get(
        PresentationKeys.FONT_FAMILY
      ) as any) as Observable<EnumSetting>;
    },
  }
);

Object.defineProperty(
  PresentationController.prototype,
  PresentationKeys.FONT_SIZE,
  {
    get: function fontSize(): Observable<RangeSetting> {
      return (this.settings.get(
        PresentationKeys.FONT_SIZE
      ) as any) as Observable<RangeSetting>;
    },
  }
);

Object.defineProperty(
  PresentationController.prototype,
  PresentationKeys.LINE_HEIGHT,
  {
    get: function lineHeight(): Observable<RangeSetting> {
      return (this.settings.get(
        PresentationKeys.LINE_HEIGHT
      ) as any) as Observable<RangeSetting>;
    },
  }
);

Object.defineProperty(
  PresentationController.prototype,
  PresentationKeys.PARAGRAPH_INDENT,
  {
    get: function paragraphIndent(): Observable<RangeSetting> {
      return (this.settings.get(
        PresentationKeys.PARAGRAPH_INDENT
      ) as any) as Observable<RangeSetting>;
    },
  }
);

Object.defineProperty(
  PresentationController.prototype,
  PresentationKeys.PARAGRAPH_SPACING,
  {
    get: function paragraphSpacing(): Observable<RangeSetting> {
      return (this.settings.get(
        PresentationKeys.PARAGRAPH_SPACING
      ) as any) as Observable<RangeSetting>;
    },
  }
);

Object.defineProperty(
  PresentationController.prototype,
  PresentationKeys.WORD_SPACING,
  {
    get: function wordSpacing(): Observable<RangeSetting> {
      return (this.settings.get(
        PresentationKeys.WORD_SPACING
      ) as any) as Observable<RangeSetting>;
    },
  }
);

Object.defineProperty(
  PresentationController.prototype,
  PresentationKeys.LETTER_SPACING,
  {
    get: function letterSpacing(): Observable<RangeSetting> {
      return (this.settings.get(
        PresentationKeys.LETTER_SPACING
      ) as any) as Observable<RangeSetting>;
    },
  }
);

Object.defineProperty(
  PresentationController.prototype,
  PresentationKeys.PUBLISHER_DEFAULTS,
  {
    get: function publisherDefaults(): Observable<SwitchSetting> {
      return (this.settings.get(
        PresentationKeys.PUBLISHER_DEFAULTS
      ) as any) as Observable<SwitchSetting>;
    },
  }
);

Object.defineProperty(
  PresentationController.prototype,
  PresentationKeys.READING_PROGRESSION,
  {
    get: function publisherDefaults(): Observable<EnumSetting> {
      return (this.settings.get(
        PresentationKeys.READING_PROGRESSION
      ) as any) as Observable<EnumSetting>;
    },
  }
);

Object.defineProperty(
  PresentationController.prototype,
  PresentationKeys.DOUBLE_PAGE_SPREAD,
  {
    get: function doublePageSpread(): Observable<EnumSetting> {
      return (this.settings.get(
        PresentationKeys.DOUBLE_PAGE_SPREAD
      ) as any) as Observable<EnumSetting>;
    },
  }
);

Object.defineProperty(
  PresentationController.prototype,
  PresentationKeys.COLUMNS,
  {
    get: function columns(): Observable<RangeSetting> {
      return (this.settings.get(PresentationKeys.COLUMNS) as any) as Observable<
        RangeSetting
      >;
    },
  }
);

Object.defineProperty(
  PresentationController.prototype,
  PresentationKeys.OVERFLOW,
  {
    get: function overflow(): Observable<EnumSetting> {
      return (this.settings.get(
        PresentationKeys.OVERFLOW
      ) as any) as Observable<EnumSetting>;
    },
  }
);

Object.defineProperty(
  PresentationController.prototype,
  PresentationKeys.CONTINUOUS,
  {
    get: function continuous(): Observable<SwitchSetting> {
      return (this.settings.get(
        PresentationKeys.CONTINUOUS
      ) as any) as Observable<SwitchSetting>;
    },
  }
);

Object.defineProperty(
  PresentationController.prototype,
  PresentationKeys.ORIENTATION,
  {
    get: function orientation(): Observable<EnumSetting> {
      return (this.settings.get(
        PresentationKeys.ORIENTATION
      ) as any) as Observable<EnumSetting>;
    },
  }
);

Object.defineProperty(PresentationController.prototype, PresentationKeys.FIT, {
  get: function fit(): Observable<EnumSetting> {
    return (this.settings.get(PresentationKeys.FIT) as any) as Observable<
      EnumSetting
    >;
  },
});

Object.defineProperty(
  PresentationController.prototype,
  PresentationKeys.PLAYBACK_RATE,
  {
    get: function playbackRate(): Observable<RangeSetting> {
      return (this.settings.get(
        PresentationKeys.PLAYBACK_RATE
      ) as any) as Observable<RangeSetting>;
    },
  }
);

Object.defineProperty(
  PresentationController.prototype,
  PresentationKeys.PLAYBACK_VOLUME,
  {
    get: function playbackVolume(): Observable<RangeSetting> {
      return (this.settings.get(
        PresentationKeys.PLAYBACK_VOLUME
      ) as any) as Observable<RangeSetting>;
    },
  }
);

Object.defineProperty(
  PresentationController.prototype,
  PresentationKeys.QUALITY,
  {
    get: function quality(): Observable<RangeSetting> {
      return (this.settings.get(PresentationKeys.QUALITY) as any) as Observable<
        RangeSetting
      >;
    },
  }
);

Object.defineProperty(
  PresentationController.prototype,
  PresentationKeys.CAPTIONS,
  {
    get: function captions(): Observable<EnumSetting> {
      return (this.settings.get(
        PresentationKeys.CAPTIONS
      ) as any) as Observable<EnumSetting>;
    },
  }
);
