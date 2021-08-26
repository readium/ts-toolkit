/* Copyright 2021 Readium Foundation. All rights reserved.
 * Use of this source code is governed by a BSD-style license,
 * available in the LICENSE file present in the Github repository of the project.
 */

import { LocalizedString } from '@readium/shared';
import { Color } from '../ui/Color';

export interface IPresentationSetting<T> {
  readonly key: string;
  readonly value: T | undefined;
  readonly isActive: boolean;
}

export class PresentationSetting<T> implements IPresentationSetting<T> {
  public readonly key: string;
  public readonly value: T | undefined;
  public readonly isActive: boolean;

  constructor(key: string, value: T | undefined, isActive: boolean) {
    this.key = key;
    this.value = value;
    this.isActive = isActive;
  }
}

/**
 * Setting representable as a toggle switch in the user interface.
 * For example, "publisher defaults" or "continuous"
 */
export class SwitchSetting extends PresentationSetting<boolean> {
  /**
   * Returns a user-facing localized label for the given value, which can be used in the user interface.
   */
  public labelForValue(value?: string): LocalizedString {
    return new LocalizedString(value ?? '');
  }
}

/**
 * Setting representable as a dropdown menu or radio buttons group in the user interface.
 * For example, "reading progression" or "font family".
 */
export class EnumSetting extends PresentationSetting<string> {
  /**
   * Returns a user-facing localized label for the given value, which can be used in the user interface.
   */
  public labelForValue(value?: string): LocalizedString {
    return new LocalizedString(value ?? '');
  }
}

/**
 * Setting representable as a draggable slider or a pair of increment/decrement buttons.
 * For example, "font size" or "playback volume".
 * A range value is valid between 0.0 to 1.0.
 */
export class RangeSetting extends PresentationSetting<number> {
  /**
   * Returns a user-facing localized label for the given value, which can be used in the user interface.
   */
  public labelForValue(value?: number): LocalizedString {
    return new LocalizedString(`${value ?? ''}`);
  }
}

/**
 * Setting holding an arbitrary color.
 * For example, "text color" or "background color".
 */
export class ColorSetting extends PresentationSetting<Color> {
  /**
   * Returns a user-facing localized label for the given value, which can be used in the user interface.
   */
  public labelForValue(value?: string): LocalizedString {
    return new LocalizedString(value ?? '');
  }
}
