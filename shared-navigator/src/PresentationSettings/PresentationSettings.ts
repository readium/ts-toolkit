import { Appearance } from './Appearance';
import { BooleanSetting } from './BooleanSetting';
import { ColumnCountType } from './ColumnCountType';
import { HyphenType } from './HyphenType';
import { ISetting } from './ISetting';
import { NumericSetting } from './NumericSetting';
import { PresentationSettingsConfig } from './PresentationSettingsConfig';
import { PresentationSettingTypes } from './PresentationSettingTypes';
import { RequiredSetting } from './RequiredSetting';
import { SelectionSetting } from './SelectionSetting';
import { Setting } from './Setting';
import { StringSetting } from './StringSetting';
import { TextAlign } from './TextAlign';
import { View } from './View';

export class PresentationSettings {
  readonly settings: Map<PresentationSettingTypes, ISetting>;

  public readonly advancedSettings: RequiredSetting;
  public readonly columnCountType: SelectionSetting<ColumnCountType>;
  public readonly hyphens: SelectionSetting<HyphenType>;

  public readonly fontOverride: RequiredSetting;
  public readonly fontSize: NumericSetting;
  public readonly fontFamily: StringSetting;

  public readonly appearance: SelectionSetting<Appearance>;
  public readonly view: SelectionSetting<View>;
  public readonly textAlign: SelectionSetting<TextAlign>;

  public readonly wordSpacing: NumericSetting;
  public readonly letterSpacing: NumericSetting;

  public readonly pageMargins: NumericSetting;

  public readonly lineHeight: NumericSetting;

  public readonly accessibility: BooleanSetting;

  public readonly backgroundColor: StringSetting;
  public readonly textColor: StringSetting;

  public readonly typeScale: SelectionSetting<number>;

  public readonly paragraphSpacing: NumericSetting;
  public readonly paragraphIndent: NumericSetting;

  constructor(config: {
    values: PresentationSettingsConfig;
    initialValues: PresentationSettingsConfig;
  }) {
    this.settings = new Map<PresentationSettingTypes, ISetting>();

    this.columnCountType = new SelectionSetting<ColumnCountType>(
      {
        desciption: 'Column Type',
        cssName: '--USER__colCount',
        value: config.values.columnCountType,
        initialValue: config.initialValues.columnCountType,
        defaultValue: ColumnCountType.Auto,
      },
      new Map(Object.entries(ColumnCountType))
    );

    this.advancedSettings = new RequiredSetting(
      {
        desciption: 'Advanced Settings',
        cssName: '--USER__advancedSettings',
        value: config.values.advancedSettings,
        initialValue: config.initialValues.advancedSettings,
        defaultValue: false,
      },
      'readium-advanced-on',
      'readium-advanced-off'
    );

    this.hyphens = new SelectionSetting<HyphenType>(
      {
        desciption: 'Hyphenation',
        cssName: '--USER__bodyHyphens',
        value: config.values.hyphens,
        initialValue: config.initialValues.hyphens,
        requiredSettings: [this.advancedSettings],
      },
      new Map(Object.entries(HyphenType))
    );

    this.fontOverride = new RequiredSetting(
      {
        desciption: 'Font Override',
        cssName: '--USER__fontOverride',
        value: config.values.fontOverride,
        initialValue: config.initialValues.fontOverride,
        defaultValue: false,
      },
      'readium-font-on',
      'readium-font-off'
    );

    this.fontSize = new NumericSetting(
      {
        desciption: 'Font Size',
        cssName: '--USER__fontSize',
        value: config.values.fontSize,
        initialValue: config.initialValues.fontSize,
        defaultValue: 100,
        requiredSettings: [this.fontOverride],
      },
      100,
      300,
      25,
      '%'
    );

    this.fontFamily = new StringSetting({
      desciption: 'Font Family',
      cssName: '--USER__fontFamily',
      value: config.values.fontFamily,
      initialValue: config.initialValues.fontFamily,
      requiredSettings: [this.fontOverride],
    });

    this.appearance = new SelectionSetting<Appearance>(
      {
        desciption: 'Appearance',
        cssName: '--USER__appearance',
        value: config.values.appearance,
        initialValue: config.initialValues.appearance,
        defaultValue: Appearance.ReadiumDayOn,
      },
      new Map(Object.entries(Appearance))
    );

    this.view = new SelectionSetting<View>(
      {
        desciption: 'View',
        cssName: '--USER__view',
        value: config.values.view,
        initialValue: config.initialValues.view,
        defaultValue: View.ReadiumPagedOn,
      },
      new Map(Object.entries(View))
    );

    this.textAlign = new SelectionSetting<TextAlign>(
      {
        desciption: 'Text Align',
        cssName: '--USER__textAlign',
        value: config.values.textAlign,
        initialValue: config.initialValues.textAlign,
        requiredSettings: [this.advancedSettings],
      },
      new Map(Object.entries(TextAlign))
    );

    this.wordSpacing = new NumericSetting(
      {
        desciption: 'Word Spacing',
        cssName: '--USER__wordSpacing',
        value: config.values.wordSpacing,
        initialValue: config.initialValues.wordSpacing,
        defaultValue: 0,
        requiredSettings: [this.advancedSettings],
      },
      0,
      1,
      0.125,
      'rem'
    );

    this.letterSpacing = new NumericSetting(
      {
        desciption: 'Letter Spacing',
        cssName: '--USER__letterSpacing',
        value: config.values.letterSpacing,
        initialValue: config.initialValues.letterSpacing,
        defaultValue: 0,
        requiredSettings: [this.advancedSettings],
      },
      0,
      0.5,
      0.125,
      'rem'
    );

    this.pageMargins = new NumericSetting(
      {
        desciption: 'Page Margins',
        cssName: '--USER__pageMargins',
        value: config.values.pageMargins,
        initialValue: config.initialValues.pageMargins,
        defaultValue: 1,
      },
      0.5,
      2,
      0.125
    );

    this.lineHeight = new NumericSetting(
      {
        desciption: 'Line Height',
        cssName: '--USER__lineHeight',
        value: config.values.lineHeight,
        initialValue: config.initialValues.lineHeight,
        requiredSettings: [this.advancedSettings],
      },
      1,
      2,
      0.125
    );

    this.accessibility = new BooleanSetting({
      desciption: 'Accessibility',
      cssName: '--USER__a11yNormalize',
      value: config.values.accessibility,
      initialValue: config.initialValues.accessibility,
      defaultValue: false,
      requiredSettings: [this.fontOverride],
    });

    this.backgroundColor = new StringSetting({
      desciption: 'Background Color',
      cssName: '--USER__backgroundColor',
      value: config.values.backgroundColor,
      initialValue: config.initialValues.backgroundColor,
    });

    this.textColor = new StringSetting({
      desciption: 'Text Color',
      cssName: '--USER__textColor',
      value: config.values.textColor,
      initialValue: config.initialValues.textColor,
    });

    this.typeScale = new SelectionSetting<number>(
      {
        desciption: 'Type Scale',
        cssName: '--USER__typeScale',
        value: config.values.lineHeight,
        initialValue: config.initialValues.lineHeight,
        requiredSettings: [this.advancedSettings],
      },
      new Map([
        ['1', 1],
        ['1.067', 1.067],
        ['1.125', 1.125],
        ['1.2', 1.1],
        ['1.333', 1.333],
        ['1.414', 1.414],
        ['1.5', 1.5],
        ['1.618', 1.618],
      ])
    );

    this.paragraphSpacing = new NumericSetting(
      {
        desciption: 'Paragraph Spacing',
        cssName: '--USER__paraSpacing',
        value: config.values.paragraphSpacing,
        initialValue: config.initialValues.paragraphSpacing,
        requiredSettings: [this.advancedSettings],
      },
      0,
      2,
      0.125,
      'rem'
    );

    this.paragraphIndent = new NumericSetting(
      {
        desciption: 'Paragraph Indent',
        cssName: '--USER__paraIndent',
        value: config.values.paragraphIndent,
        initialValue: config.initialValues.paragraphIndent,
        requiredSettings: [this.advancedSettings],
      },
      0,
      2,
      0.125,
      'rem'
    );

    Object.entries(this)
      .filter(([_key, value]) => value instanceof Setting)
      .forEach(([key, value]) =>
        this.settings.set(key as PresentationSettingTypes, value)
      );
  }

  public printValues() {
    console.log('printEffectiveValues');
    this.settings.forEach((setting, settingType) => {
      console.log(
        settingType.toString() +
          ' : [value:' +
          setting.value +
          '][initial:' +
          setting.initialValue +
          '][default:' +
          setting.defaultValue +
          '][effective:' +
          setting.getEffectiveValue() +
          ']'
      );
    });
    console.log('css:' + this.toCss());
    console.log('');
  }

  public getCssValues(): Map<string, string> {
    var result = new Map<string, string>();
    this.settings.forEach((setting, _settingType) => {
      if (setting.applyCss()) {
        result.set(setting.cssName, setting.getCssValue());
      }
    });
    return result;
  }

  public toCss(): string {
    return Array.from(this.getCssValues()).reduce<string>(
      (p, [k, v]) => (p += `${k}: ${v}; `),
      ''
    );
  }

  public applyCss(root: HTMLElement) {
    this.settings.forEach((setting, _settingType) => {
      if (setting.applyCss()) {
        root.style.setProperty(setting.cssName, setting.getCssValue());
      } else {
        root.style.removeProperty(setting.cssName);
      }
    });
  }

  public getSetting(key: PresentationSettingTypes): ISetting {
    return this.settings.get(key) as ISetting;
  }
}
