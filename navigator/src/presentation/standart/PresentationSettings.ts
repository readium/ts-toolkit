/* Copyright 2021 Readium Foundation. All rights reserved.
 * Use of this source code is governed by a BSD-style license,
 * available in the LICENSE file present in the Github repository of the project.
 */

import { Color } from '../../ui/Color';
import { PresentationSettings } from '../PresentationSettings';
import { PresentationKeys } from './PresentationKeys';

/**
 * Extension for Standart Presentation Settings
 */
declare module '../PresentationSettings' {
  export interface PresentationSettings {
    verticalPageMargins: number | undefined;
    horizontalPageMargins: number | undefined;
    appearance: string | undefined;
    backgroundColor: Color | undefined;
    textColor: Color | undefined;
    textAlignment: string | undefined;
    hyphenation: boolean | undefined;
    ligature: boolean | undefined;
    fontFamily: string | undefined;
    fontSize: number | undefined;
    lineHeight: number | undefined;
    paragraphIndent: number | undefined;
    paragraphSpacing: number | undefined;
    wordSpacing: number | undefined;
    letterSpacing: number | undefined;
    publisherDefaults: boolean | undefined;
    readingProgression: string | undefined;
    doublePageSpread: string | undefined;
    columns: number | undefined;
    overflow: string | undefined;
    continuous: boolean | undefined;
    orientation: string | undefined;
    fit: string | undefined;
    playbackRate: number | undefined;
    quality: number | undefined;
    captions: string | undefined;
  }
}

Object.defineProperty(
  PresentationSettings.prototype,
  PresentationKeys.VERTICAL_PAGE_MARGINS,
  {
    get: function verticalPageMargins(): number | undefined {
      return this.settings[PresentationKeys.VERTICAL_PAGE_MARGINS];
    },
    set: function verticalPageMargins(v: number | undefined): void {
      this.settings[PresentationKeys.VERTICAL_PAGE_MARGINS] = v;
    },
  }
);

Object.defineProperty(
  PresentationSettings.prototype,
  PresentationKeys.HORIZONTAL_PAGE_MARGINS,
  {
    get: function horizontalPageMargins(): number | undefined {
      return this.settings[PresentationKeys.HORIZONTAL_PAGE_MARGINS];
    },
    set: function horizontalPageMargins(v: number | undefined): void {
      this.settings[PresentationKeys.HORIZONTAL_PAGE_MARGINS] = v;
    },
  }
);

Object.defineProperty(
  PresentationSettings.prototype,
  PresentationKeys.APPEARANCE,
  {
    get: function appearance(): string | undefined {
      return this.settings[PresentationKeys.APPEARANCE];
    },
    set: function appearance(v: string | undefined): void {
      this.settings[PresentationKeys.APPEARANCE] = v;
    },
  }
);

Object.defineProperty(
  PresentationSettings.prototype,
  PresentationKeys.BACKGROUND_COLOR,
  {
    get: function backgroundColor(): Color | undefined {
      return this.settings[PresentationKeys.BACKGROUND_COLOR];
    },
    set: function backgroundColor(v: Color | undefined): void {
      this.settings[PresentationKeys.BACKGROUND_COLOR] = v;
    },
  }
);

Object.defineProperty(
  PresentationSettings.prototype,
  PresentationKeys.TEXT_COLOR,
  {
    get: function textColor(): Color | undefined {
      return this.settings[PresentationKeys.TEXT_COLOR];
    },
    set: function textColor(v: Color | undefined): void {
      this.settings[PresentationKeys.TEXT_COLOR] = v;
    },
  }
);

Object.defineProperty(
  PresentationSettings.prototype,
  PresentationKeys.TEXT_ALIGNMENT,
  {
    get: function textAlignment(): string | undefined {
      return this.settings[PresentationKeys.TEXT_ALIGNMENT];
    },
    set: function textAlignment(v: string | undefined): void {
      this.settings[PresentationKeys.TEXT_ALIGNMENT] = v;
    },
  }
);

Object.defineProperty(
  PresentationSettings.prototype,
  PresentationKeys.HYPHENATION,
  {
    get: function hyphenation(): boolean | undefined {
      return this.settings[PresentationKeys.HYPHENATION];
    },
    set: function hyphenation(v: boolean | undefined): void {
      this.settings[PresentationKeys.HYPHENATION] = v;
    },
  }
);

Object.defineProperty(
  PresentationSettings.prototype,
  PresentationKeys.LIGATURE,
  {
    get: function ligature(): boolean | undefined {
      return this.settings[PresentationKeys.LIGATURE];
    },
    set: function ligature(v: boolean | undefined): void {
      this.settings[PresentationKeys.LIGATURE] = v;
    },
  }
);

Object.defineProperty(
  PresentationSettings.prototype,
  PresentationKeys.FONT_FAMILY,
  {
    get: function fontFamily(): string | undefined {
      return this.settings[PresentationKeys.FONT_FAMILY];
    },
    set: function fontFamily(v: string | undefined): void {
      this.settings[PresentationKeys.FONT_FAMILY] = v;
    },
  }
);

Object.defineProperty(
  PresentationSettings.prototype,
  PresentationKeys.FONT_SIZE,
  {
    get: function fontSize(): number | undefined {
      return this.settings[PresentationKeys.FONT_SIZE];
    },
    set: function fontSize(v: number | undefined): void {
      this.settings[PresentationKeys.FONT_SIZE] = v;
    },
  }
);

Object.defineProperty(
  PresentationSettings.prototype,
  PresentationKeys.LINE_HEIGHT,
  {
    get: function lineHeight(): number | undefined {
      return this.settings[PresentationKeys.LINE_HEIGHT];
    },
    set: function lineHeight(v: number | undefined): void {
      this.settings[PresentationKeys.LINE_HEIGHT] = v;
    },
  }
);

Object.defineProperty(
  PresentationSettings.prototype,
  PresentationKeys.PARAGRAPH_INDENT,
  {
    get: function paragraphIndent(): number | undefined {
      return this.settings[PresentationKeys.PARAGRAPH_INDENT];
    },
    set: function paragraphIndent(v: number | undefined): void {
      this.settings[PresentationKeys.PARAGRAPH_INDENT] = v;
    },
  }
);

Object.defineProperty(
  PresentationSettings.prototype,
  PresentationKeys.PARAGRAPH_SPACING,
  {
    get: function paragraphSpacing(): number | undefined {
      return this.settings[PresentationKeys.PARAGRAPH_SPACING];
    },
    set: function paragraphSpacing(v: number | undefined): void {
      this.settings[PresentationKeys.PARAGRAPH_SPACING] = v;
    },
  }
);

Object.defineProperty(
  PresentationSettings.prototype,
  PresentationKeys.WORD_SPACING,
  {
    get: function wordSpacing(): number | undefined {
      return this.settings[PresentationKeys.WORD_SPACING];
    },
    set: function wordSpacing(v: number | undefined): void {
      this.settings[PresentationKeys.WORD_SPACING] = v;
    },
  }
);

Object.defineProperty(
  PresentationSettings.prototype,
  PresentationKeys.LETTER_SPACING,
  {
    get: function letterSpacing(): number | undefined {
      return this.settings[PresentationKeys.LETTER_SPACING];
    },
    set: function letterSpacing(v: number | undefined): void {
      this.settings[PresentationKeys.LETTER_SPACING] = v;
    },
  }
);

Object.defineProperty(
  PresentationSettings.prototype,
  PresentationKeys.PUBLISHER_DEFAULTS,
  {
    get: function publisherDefaults(): boolean | undefined {
      return this.settings[PresentationKeys.PUBLISHER_DEFAULTS];
    },
    set: function publisherDefaults(v: boolean | undefined): void {
      this.settings[PresentationKeys.PUBLISHER_DEFAULTS] = v;
    },
  }
);

Object.defineProperty(
  PresentationSettings.prototype,
  PresentationKeys.READING_PROGRESSION,
  {
    get: function readingProgression(): string | undefined {
      return this.settings[PresentationKeys.READING_PROGRESSION];
    },
    set: function readingProgression(v: string | undefined): void {
      this.settings[PresentationKeys.READING_PROGRESSION] = v;
    },
  }
);

Object.defineProperty(
  PresentationSettings.prototype,
  PresentationKeys.DOUBLE_PAGE_SPREAD,
  {
    get: function doublePageSpread(): string | undefined {
      return this.settings[PresentationKeys.DOUBLE_PAGE_SPREAD];
    },
    set: function doublePageSpread(v: string | undefined): void {
      this.settings[PresentationKeys.DOUBLE_PAGE_SPREAD] = v;
    },
  }
);

Object.defineProperty(
  PresentationSettings.prototype,
  PresentationKeys.COLUMNS,
  {
    get: function columns(): number | undefined {
      return this.settings[PresentationKeys.COLUMNS];
    },
    set: function columns(v: number | undefined): void {
      this.settings[PresentationKeys.COLUMNS] = v;
    },
  }
);

Object.defineProperty(
  PresentationSettings.prototype,
  PresentationKeys.OVERFLOW,
  {
    get: function overflow(): string | undefined {
      return this.settings[PresentationKeys.OVERFLOW];
    },
    set: function overflow(v: string | undefined): void {
      this.settings[PresentationKeys.OVERFLOW] = v;
    },
  }
);

Object.defineProperty(
  PresentationSettings.prototype,
  PresentationKeys.CONTINUOUS,
  {
    get: function continuous(): boolean | undefined {
      return this.settings[PresentationKeys.CONTINUOUS];
    },
    set: function continuous(v: boolean | undefined): void {
      this.settings[PresentationKeys.CONTINUOUS] = v;
    },
  }
);

Object.defineProperty(
  PresentationSettings.prototype,
  PresentationKeys.ORIENTATION,
  {
    get: function orientation(): string | undefined {
      return this.settings[PresentationKeys.ORIENTATION];
    },
    set: function orientation(v: string | undefined): void {
      this.settings[PresentationKeys.ORIENTATION] = v;
    },
  }
);

Object.defineProperty(PresentationSettings.prototype, PresentationKeys.FIT, {
  get: function fit(): string | undefined {
    return this.settings[PresentationKeys.FIT];
  },
  set: function fit(v: string | undefined): void {
    this.settings[PresentationKeys.FIT] = v;
  },
});

Object.defineProperty(
  PresentationSettings.prototype,
  PresentationKeys.PLAYBACK_RATE,
  {
    get: function playbackRate(): number | undefined {
      return this.settings[PresentationKeys.PLAYBACK_RATE];
    },
    set: function playbackRate(v: number | undefined): void {
      this.settings[PresentationKeys.PLAYBACK_RATE] = v;
    },
  }
);

Object.defineProperty(
  PresentationSettings.prototype,
  PresentationKeys.PLAYBACK_VOLUME,
  {
    get: function playbackVolume(): number | undefined {
      return this.settings[PresentationKeys.PLAYBACK_VOLUME];
    },
    set: function playbackVolume(v: number | undefined): void {
      this.settings[PresentationKeys.PLAYBACK_VOLUME] = v;
    },
  }
);

Object.defineProperty(
  PresentationSettings.prototype,
  PresentationKeys.QUALITY,
  {
    get: function quality(): number | undefined {
      return this.settings[PresentationKeys.QUALITY];
    },
    set: function quality(v: number | undefined): void {
      this.settings[PresentationKeys.QUALITY] = v;
    },
  }
);

Object.defineProperty(
  PresentationSettings.prototype,
  PresentationKeys.CAPTIONS,
  {
    get: function captions(): string | undefined {
      return this.settings[PresentationKeys.CAPTIONS];
    },
    set: function captions(v: string | undefined): void {
      this.settings[PresentationKeys.CAPTIONS] = v;
    },
  }
);
