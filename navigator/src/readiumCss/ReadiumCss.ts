/* Copyright 2021 Readium Foundation. All rights reserved.
 * Use of this source code is governed by a BSD-style license,
 * available in the LICENSE file present in the Github repository of the project.
 */

import { ColumnCountType } from './ColumnCountType';
import { HyphenType } from './HyphenType';
import { ReadiumCssSettings } from './ReadiumCssSettings';

export declare type ApplyCss = (cssKey: string, cssValue: any) => void;
export declare type GetCssValue<T> = (value: T) => string;
export declare type ApplyRequiredSetting = () => void;

export class ReadiumSetting<T> {
  private defaultValue?: T;
  private cssKey: string;
  private _value?: T;
  public get value(): T | undefined {
    return this._value;
  }
  public set value(v: T | undefined) {
    this._value = v;
    this.onApplyCss(this.cssKey, this.getCssValue());
    if (this.onApplyRequiredSetting) {
      this.onApplyRequiredSetting();
    }
  }

  public getCssValue() {
    return this._value === undefined || this._value === this.defaultValue
      ? undefined
      : this.onGetCssValue(this._value);
  }

  private onGetCssValue: GetCssValue<T>;
  private onApplyCss: ApplyCss;
  private onApplyRequiredSetting?: ApplyRequiredSetting;

  constructor(config: {
    cssKey: string;
    defaultValue?: T;
    onGetCssValue: GetCssValue<T>;
    onApplyCss: ApplyCss;
    onApplyRequiredSetting?: ApplyRequiredSetting;
  }) {
    this.cssKey = config.cssKey;
    this.onGetCssValue = config.onGetCssValue;
    this.onApplyRequiredSetting = config.onApplyRequiredSetting;
    this.onApplyCss = config.onApplyCss;
    this.defaultValue = config.defaultValue;
  }
}

export class ReadiumCss {
  private readonly cssValues: Map<string, string>;
  public element?: HTMLElement;

  public readonly columnCountType: ReadiumSetting<ColumnCountType>;
  public readonly advancedSettings: ReadiumSetting<boolean>;
  public readonly hyphens: ReadiumSetting<HyphenType>;

  constructor(settings: ReadiumCssSettings) {
    this.cssValues = new Map<string, string>();

    this.columnCountType = new ReadiumSetting<ColumnCountType>({
      cssKey: '--USER__colCount',
      defaultValue: ColumnCountType.Auto,
      onGetCssValue: v => v.toString(),
      onApplyCss: this.applyCss.bind(this),
    });

    this.advancedSettings = new ReadiumSetting<boolean>({
      cssKey: '--USER__advancedSettings',
      defaultValue: false,
      onGetCssValue: v => (v ? 'readium-advanced-on' : ''),
      onApplyCss: this.applyCss.bind(this),
    });

    this.hyphens = new ReadiumSetting<HyphenType>({
      cssKey: '--USER__bodyHyphens',
      onGetCssValue: v => v.toString(),
      onApplyCss: this.applyCss.bind(this),
      onApplyRequiredSetting: this.applyRequiredAdvancedSettings.bind(this),
    });

    this.columnCountType.value = settings.columnCountType;
    this.advancedSettings.value = false;
    this.hyphens.value = settings.hyphens;
  }

  private applyCss(css: string, value: any): void {
    if (value === undefined) {
      this.element?.style.removeProperty(css);
      this.cssValues.delete(css);
    } else {
      this.element?.style.setProperty(css, value);
      this.cssValues.set(css, value);
    }
  }

  private applyRequiredAdvancedSettings(): void {
    this.advancedSettings.value = this.hyphens.getCssValue() !== undefined;
  }

  public toCss(): string {
    return Array.from(this.cssValues).reduce<string>(
      (prev, [css, value]) => (prev += `${css}: ${value}; `),
      ''
    );
  }
}
