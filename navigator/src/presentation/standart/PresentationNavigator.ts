/* Copyright 2021 Readium Foundation. All rights reserved.
 * Use of this source code is governed by a BSD-style license,
 * available in the LICENSE file present in the Github repository of the project.
 */

import { IPresentationNavigator } from '../../PresentationNavigator';
import { Color } from '../../ui/Color';
import { Observable } from '../Observable';
import { PresentationProperties } from '../PresentationProperties';
import {
  ColorProperty,
  EnumProperty,
  IPresentationProperty,
  RangeProperty,
  SwitchProperty,
} from '../PresentationProperty';
import { PresentationSettings } from '../PresentationSettings';
import { PresentationKeys } from './PresentationKeys';

export class PresentationNavigator implements IPresentationNavigator {
  public presentation: PresentationProperties;

  apply(setting: PresentationSettings): void {}

  addProperty<T>(setting: IPresentationProperty<T>) {
    this.presentation.properties.set(
      setting.key,
      new Observable<IPresentationProperty<T>>(setting)
    );
  }

  constructor() {
    this.presentation = new PresentationProperties();
    this.addProperty(
      new RangeProperty(
        { key: PresentationKeys.VERTICAL_PAGE_MARGINS, value: 0.5 },
        0.1
      )
    );

    this.addProperty(
      new RangeProperty(
        { key: PresentationKeys.HORIZONTAL_PAGE_MARGINS, value: 0.5 },
        0.1
      )
    );

    this.addProperty(
      new EnumProperty({
        key: PresentationKeys.APPEARANCE,
        value: 'sepia',
        values: ['sepia', 'dark'],
      })
    );

    this.addProperty(
      new ColorProperty({
        key: PresentationKeys.BACKGROUND_COLOR,
        value: Color.white,
      })
    );

    this.addProperty(
      new ColorProperty({
        key: PresentationKeys.TEXT_COLOR,
        value: Color.black,
      })
    );

    this.addProperty(
      new EnumProperty({
        key: PresentationKeys.TEXT_ALIGNMENT,
        value: 'left',
        values: ['left', 'right', 'center', 'justify'],
      })
    );

    this.addProperty(
      new SwitchProperty({
        key: PresentationKeys.HYPHENATION,
        value: false,
        values: ['false', 'true'],
      })
    );

    this.addProperty(
      new SwitchProperty({
        key: PresentationKeys.LIGATURE,
        value: false,
        values: ['false', 'true'],
      })
    );

    this.addProperty(
      new EnumProperty({
        key: PresentationKeys.FONT_FAMILY,
        value: 'arial',
        values: ['arial', 'times new roman', 'helvetica', 'sans serif'],
      })
    );

    this.addProperty(
      new RangeProperty({ key: PresentationKeys.FONT_SIZE, value: 0.1 }, 0.1)
    );

    this.addProperty(
      new RangeProperty({ key: PresentationKeys.LINE_HEIGHT, value: 0.1 }, 0.1)
    );

    this.addProperty(
      new RangeProperty(
        { key: PresentationKeys.PARAGRAPH_INDENT, value: 0.1 },
        0.1
      )
    );

    this.addProperty(
      new RangeProperty(
        { key: PresentationKeys.PARAGRAPH_SPACING, value: 0.1 },
        0.1
      )
    );

    this.addProperty(
      new RangeProperty({ key: PresentationKeys.WORD_SPACING, value: 0.1 }, 0.1)
    );

    this.addProperty(
      new RangeProperty(
        {
          key: PresentationKeys.LETTER_SPACING,
          value: 0.1,
          isActiveForSettings: settings => {
            return !settings.publisherDefaults;
          },
          activateInSettings: settings =>
            settings.cloneWithValues({ publisherDefaults: false }),
        },
        0.1
      )
    );

    this.addProperty(
      new SwitchProperty({
        key: PresentationKeys.PUBLISHER_DEFAULTS,
        value: true,
        values: ['false', 'true'],
      })
    );

    this.addProperty(
      new EnumProperty({
        key: PresentationKeys.READING_PROGRESSION,
        value: 'auto',
        values: ['ltr', 'rtl', 'ttb', 'btt', 'auto'],
      })
    );

    this.addProperty(
      new EnumProperty({
        key: PresentationKeys.DOUBLE_PAGE_SPREAD,
        value: 'auto',
        values: ['landscape', 'portrait', 'both', 'auto'],
      })
    );

    this.addProperty(
      new RangeProperty({ key: PresentationKeys.COLUMNS, value: 0.1 }, 0.1)
    );

    this.addProperty(
      new EnumProperty({
        key: PresentationKeys.OVERFLOW,
        value: 'auto',
        values: ['paginated', 'scrolled', 'auto'],
      })
    );

    this.addProperty(
      new SwitchProperty({
        key: PresentationKeys.CONTINUOUS,
        value: true,
        values: ['false', 'true'],
      })
    );

    this.addProperty(
      new EnumProperty({
        key: PresentationKeys.ORIENTATION,
        value: 'auto',
        values: ['landscape', 'portrait', 'auto'],
      })
    );

    this.addProperty(
      new EnumProperty({
        key: PresentationKeys.FIT,
        value: 'contain',
        values: ['contain', 'cover', 'width', 'height'],
      })
    );

    this.addProperty(
      new RangeProperty(
        { key: PresentationKeys.PLAYBACK_RATE, value: 0.1 },
        0.1
      )
    );

    this.addProperty(
      new RangeProperty(
        { key: PresentationKeys.PLAYBACK_VOLUME, value: 0.1 },
        0.1
      )
    );

    this.addProperty(
      new RangeProperty({ key: PresentationKeys.QUALITY, value: 0.1 }, 0.1)
    );

    this.addProperty(
      new EnumProperty({
        key: PresentationKeys.CAPTIONS,
        value: 'auto',
        values: ['caption', 'source'],
      })
    );
  }
}
