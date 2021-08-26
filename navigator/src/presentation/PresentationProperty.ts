/* Copyright 2021 Readium Foundation. All rights reserved.
 * Use of this source code is governed by a BSD-style license,
 * available in the LICENSE file present in the Github repository of the project.
 */

import { LocalizedString } from '@readium/shared';
import { Color } from '../ui/Color';
import {
  ColorSetting,
  EnumSetting,
  IPresentationSetting,
  RangeSetting,
  SwitchSetting,
} from './PresentationSetting';
import { PresentationSettings } from './PresentationSettings';

export declare type IsActiveForSettingsHandler = (
  settings: PresentationSettings
) => boolean;
export declare type ActivateInSettingsHandler = (
  settings: PresentationSettings
) => PresentationSettings;

/**
 * Holds the current value and the metadata of a Presentation Property of type T
 */
export interface IPresentationProperty<T> {
  /**
   * Key for the property
   */
  key: string;

  /**
   * Current value for the property
   */
  value: T;

  /**
   * List of available values for this property, in logical order.
   */
  values?: Array<string>;

  /**
   * Determines whether the property will be active when the given settings are applied to the Navigator.
   * For example, with an EPUB Navigator using Readium CSS, the property
   * "letter spacing" requires to switch off the "publisher defaults" setting to be active.
   * This is useful to determine whether to grey out a view in the user settings interface.
   */
  isActiveForSettings?: IsActiveForSettingsHandler;

  /**
   * Modifies the given settings to make sure the property will be activated when applying them to the Navigator.
   * For example, with an EPUB Navigator using Readium CSS, activating the "letter spacing" property means
   * ensuring the "publisher defaults" setting is disabled.
   * If the property cannot be activated, returns a user-facing error.
   */
  activateInSettings?: ActivateInSettingsHandler;

  /**
   * Returns a user-facing localized label for the given value, which can be used in the user interface.
   */
  getLabelForValue(value?: T): LocalizedString;

  /**
   * Returns immutable setting for the property
   */
  createSetting(value?: any, active?: boolean): IPresentationSetting<any>;
}

export interface PresentationPropertyConfig<T> {
  key: string;
  value: T;
  values?: Array<string>;
  isActiveForSettings?: IsActiveForSettingsHandler;
  activateInSettings?: ActivateInSettingsHandler;
}

export abstract class PresentationProperty<T>
  implements IPresentationProperty<T> {
  public readonly key: string;

  public readonly value: T;

  public readonly values?: Array<string>;

  public isActiveForSettings?: IsActiveForSettingsHandler;
  public activateInSettings?: ActivateInSettingsHandler;

  constructor(config: PresentationPropertyConfig<T>) {
    this.key = config.key;
    this.value = config.value;
    this.values = config?.values ?? [];
    this.isActiveForSettings = config?.isActiveForSettings;
    this.activateInSettings = config?.activateInSettings;
  }

  public abstract getLabelForValue(value?: T): LocalizedString;
  public abstract createSetting(
    value?: any,
    active?: boolean
  ): IPresentationSetting<any>;
}

/**
 * Property representable as a toggle switch in the user interface.
 * For example, "publisher defaults" or "continuous"
 */
export class SwitchProperty extends PresentationProperty<boolean> {
  /**
   * Returns a user-facing localized label for the given value, which can be used in the user interface.
   * For example, with the "reading progression" property, the value ltr has for label "Left to right" in English.
   */
  public getLabelForValue(value?: boolean): LocalizedString {
    return new LocalizedString(value ? 'true' : 'false');
  }

  public createSetting(
    value?: any,
    active?: boolean
  ): IPresentationSetting<any> {
    return new SwitchSetting(this.key, value, !!active);
  }
}

/**
 * Property representable as a dropdown menu or radio buttons group in the user interface.
 * For example, "reading progression" or "font family".
 */
export class EnumProperty extends PresentationProperty<string> {
  /**
   * Returns a user-facing localized label for the given value, which can be used in the user interface.
   * For example, with the "reading progression" property, the value ltr has for label "Left to right" in English.
   */
  public getLabelForValue(value: string): LocalizedString {
    return new LocalizedString(value);
  }

  public createSetting(
    value?: any,
    active?: boolean
  ): IPresentationSetting<any> {
    return new EnumSetting(this.key, value, !!active);
  }
}

/**
 * Property representable as a draggable slider or a pair of increment/decrement buttons.
 * For example, "font size" or "playback volume".
 * A range value is valid between 0.0 to 1.0.
 */
export class RangeProperty extends PresentationProperty<number> {
  /**
   * Number of discrete values in the range.
   */
  public stepsCount?: number;

  constructor(config: PresentationPropertyConfig<number>, stepsCount?: number) {
    super(config);
    this.stepsCount = stepsCount;
  }

  /**
   * Returns a user-facing localized label for the given value, which can be used in the user interface.
   */
  public getLabelForValue(value?: number): LocalizedString {
    return new LocalizedString(value?.toString() ?? '');
  }

  public createSetting(
    value?: any,
    active?: boolean
  ): IPresentationSetting<any> {
    return new RangeSetting(this.key, value, !!active);
  }
}

/**
 * Property holding an arbitrary color.
 * For example, "text color" or "background color".
 */
export class ColorProperty extends PresentationProperty<Color> {
  /**
   * Returns a user-facing localized label for the given value, which can be used in the user interface.
   * For example, with the "reading progression" property, the value ltr has for label "Left to right" in English.
   */
  public getLabelForValue(value?: Color): LocalizedString {
    return new LocalizedString(value?.toString() ?? '');
  }

  public createSetting(
    value?: any,
    active?: boolean
  ): IPresentationSetting<any> {
    return new ColorSetting(this.key, value, !!active);
  }
}
