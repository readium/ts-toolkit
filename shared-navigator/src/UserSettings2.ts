//...

import { ColumnCountType, HyphenType } from './ReadiumCss';
import { UserDefaults } from './UserDefaults';
import {
  // Enumerable,
  // Incrementable,
  // Switchable,
  UserProperties,
} from './UserProperties';

export interface UserSettingsConfig {
  hyphens?: HyphenType;
  fontSize?: number;
  fontFamily?: number;
  appearance?: number;
  verticalScroll?: boolean;
  publisherDefaults?: boolean;
  textAlignment?: number;
  columnCountType?: ColumnCountType;
  wordSpacing?: number;
  letterSpacing?: number;
  pageMargins?: number;
  lineHeight?: number;
}

export function parseHyphenType(value?: string): HyphenType | undefined {
  return value ? Object.values(HyphenType).find(x => x === value) : undefined;
}

export function parseColumnCountType(
  value?: string
): ColumnCountType | undefined {
  return value
    ? Object.values(ColumnCountType).find(x => x === value)
    : undefined;
}

const ColumnCountTypeKey = 'ColumnCountType';
const HyphenTypeKey = 'HyphenType';

export class UserSettings2 {
  // WARNING: String values must not contain any single or double quotes characters, otherwise it breaks the streamer's injection.
  // private appearanceValues = [
  //   'readium-default-on',
  //   'readium-sepia-on',
  //   'readium-night-on',
  // ];
  // private fontFamilyValues = [
  //   'Original',
  //   'Helvetica Neue',
  //   'Iowan Old Style',
  //   'Athelas',
  //   'Seravek',
  //   'OpenDyslexic',
  //   'AccessibleDfA',
  //   'IA Writer Duospace',
  // ];
  // private textAlignmentValues = ['justify', 'start'];
  //private columnCountValues = ['auto', '1', '2'];

  // private fontSize: number;
  // private fontOverride: boolean;
  // private fontFamily: number;
  // private appearance: number;
  // private verticalScroll: boolean;
  // private hyphens: boolean;

  // private publisherDefaults: boolean;
  // private textAlignment: number;

  //private columnCount: ColumnCountType;

  public get hyphenType(): HyphenType {
    return (
      this.userValues?.hyphens ||
      this.initialValues?.hyphens ||
      (this.systemValues.hyphens as HyphenType)
    );
  }
  public set hyphenType(v: HyphenType) {
    this.userValues.hyphens = v;
  }

  public get columnCountType(): ColumnCountType {
    return (
      this.userValues?.columnCountType ||
      this.initialValues?.columnCountType ||
      (this.systemValues.columnCountType as ColumnCountType)
    );
  }
  public set columnCountType(v: ColumnCountType) {
    this.userValues.columnCountType = v;
  }

  // private wordSpacing: number;
  // private letterSpacing: number;
  // private pageMargins: number;
  // private lineHeight: number;

  public userProperties: UserProperties;

  initialValues: UserSettingsConfig;
  userValues: UserSettingsConfig;
  systemValues: UserSettingsConfig;

  constructor(initialValues: UserSettingsConfig, userDefaults?: UserDefaults) {
    this.userProperties = new UserProperties();

    this.initialValues = initialValues;

    this.systemValues = {
      hyphens: undefined,
      columnCountType: ColumnCountType.Auto,
    };

    this.userValues = {};

    if (userDefaults) {
      this.userValues.hyphens = parseHyphenType(
        userDefaults?.getString(HyphenTypeKey)
      );
      this.userValues.columnCountType = parseColumnCountType(
        userDefaults?.getString(ColumnCountTypeKey)
      );
    }

    // this.hyphens =
    //   userDefaults?.getBool('ReadiumCSSName.hyphens') ||
    //   initialValues?.hyphens ||
    //   false;

    // this.fontSize =
    //   userDefaults?.getNumber('ReadiumCSSName.fontSize') ||
    //   initialValues?.fontSize ||
    //   100;

    // this.fontFamily =
    //   userDefaults?.getNumber('ReadiumCSSName.fontFamily') ||
    //   initialValues?.fontFamily ||
    //   0;

    // this.fontOverride = this.fontFamily != 0;

    // this.appearance =
    //   userDefaults?.getNumber('ReadiumCSSName.appearance') ||
    //   initialValues?.appearance ||
    //   0;

    // this.verticalScroll =
    //   userDefaults?.getBool('ReadiumCSSName.verticalScroll') ||
    //   initialValues?.verticalScroll ||
    //   false;

    // this.publisherDefaults =
    //   userDefaults?.getBool('ReadiumCSSName.publisherDefaults') ||
    //   initialValues?.publisherDefaults ||
    //   true;

    // this.textAlignment =
    //   userDefaults?.getNumber('ReadiumCSSName.textAlignment') ||
    //   initialValues?.textAlignment ||
    //   0;

    // this.columnCount =
    //   parseColumnCountType(userDefaults?.getString(CssVariables.ColumnCount.toString())) ||
    //   initialValues?.columnCount ||
    //   ColumnCountType.Auto;

    // this.wordSpacing =
    //   userDefaults?.getNumber('ReadiumCSSName.wordSpacing') ||
    //   initialValues?.wordSpacing ||
    //   0;

    // this.letterSpacing =
    //   userDefaults?.getNumber('ReadiumCSSName.letterSpacing') ||
    //   initialValues?.letterSpacing ||
    //   0;

    // this.pageMargins =
    //   userDefaults?.getNumber('ReadiumCSSName.pageMargins') ||
    //   initialValues?.pageMargins ||
    //   1;

    // this.lineHeight =
    //   userDefaults?.getNumber('ReadiumCSSName.lineHeight') ||
    //   initialValues?.lineHeight ||
    //   1.5;

    this.buildCssProperties();
  }

  public toCss(): string {
    return '';
    // let readiumCss = new PresentationSettings();
    // readiumCss.columnCountType.value = this.columnCountType;

    // return readiumCss.toCss();
  }

  // Build and add CSS properties
  private buildCssProperties() {
    // Hyphens
    // this.userProperties.addSwitchable(
    //   'auto',
    //   'none',
    //   this.hyphens,
    //   'ReadiumCSSReference.hyphens',
    //   'ReadiumCSSName.hyphens'
    // );
    // // Font size
    // this.userProperties.addIncrementable(
    //   this.fontSize,
    //   100,
    //   300,
    //   25,
    //   '%',
    //   'ReadiumCSSReference.fontSize',
    //   'ReadiumCSSName.fontSize'
    // );
    // // Font family
    // this.userProperties.addEnumerable(
    //   this.fontFamily,
    //   this.fontFamilyValues,
    //   'ReadiumCSSReference.fontFamily',
    //   'ReadiumCSSName.fontFamily'
    // );
    // // Font override
    // this.userProperties.addSwitchable(
    //   'readium-font-on',
    //   'readium-font-off',
    //   this.fontOverride,
    //   'ReadiumCSSReference.fontOverride',
    //   'ReadiumCSSName.fontOverride'
    // );
    // // Appearance
    // this.userProperties.addEnumerable(
    //   this.appearance,
    //   this.appearanceValues,
    //   'ReadiumCSSReference.appearance',
    //   'ReadiumCSSName.appearance'
    // );
    // // Vertical scroll
    // this.userProperties.addSwitchable(
    //   'readium-scroll-on',
    //   'readium-scroll-off',
    //   this.verticalScroll,
    //   'ReadiumCSSReference.scroll',
    //   'ReadiumCSSName.scroll'
    // );
    // // Publisher default system
    // this.userProperties.addSwitchable(
    //   'readium-advanced-off',
    //   'readium-advanced-on',
    //   this.publisherDefaults,
    //   'ReadiumCSSReference.publisherDefault',
    //   'ReadiumCSSName.publisherDefault'
    // );
    // // Text alignment
    // this.userProperties.addEnumerable(
    //   this.textAlignment,
    //   this.textAlignmentValues,
    //   'ReadiumCSSReference.textAlignment',
    //   'ReadiumCSSName.textAlignment'
    // );
    // Column count
    // this.userProperties.addEnumerable(
    //   this.columnCount,
    //   this.columnCountValues,
    //   'ReadiumCSSReference.columnCount',
    //   'ReadiumCSSName.columnCount'
    // );
    // // Word spacing
    // this.userProperties.addIncrementable(
    //   this.wordSpacing,
    //   0,
    //   0.5,
    //   0.125,
    //   'rem',
    //   'ReadiumCSSReference.wordSpacing',
    //   'ReadiumCSSName.wordSpacing'
    // );
    // // Letter spacing
    // this.userProperties.addIncrementable(
    //   this.letterSpacing,
    //   0,
    //   0.25,
    //   0.0625,
    //   'em',
    //   'ReadiumCSSReference.letterSpacing',
    //   'ReadiumCSSName.letterSpacing'
    // );
    // // Page margins
    // this.userProperties.addIncrementable(
    //   this.pageMargins,
    //   0.5,
    //   2,
    //   0.25,
    //   '',
    //   'ReadiumCSSReference.pageMargins',
    //   'ReadiumCSSName.pageMargins'
    // );
    // // Line height
    // this.userProperties.addIncrementable(
    //   this.lineHeight,
    //   1,
    //   2,
    //   0.25,
    //   '',
    //   'ReadiumCSSReference.lineHeight',
    //   'ReadiumCSSName.lineHeight'
    // );
  }

  // Save settings to UserDefaults
  public save(userDefaults: UserDefaults) {
    // let currentfontSize = this.userProperties.getProperty(
    //   'ReadiumCSSReference.fontSize'
    // );
    // if (currentfontSize) {
    //   userDefaults.setNumber(
    //     'ReadiumCSSName.fontSize',
    //     (currentfontSize as Incrementable).value
    //   );
    // }

    // let currentfontFamily = this.userProperties.getProperty(
    //   'ReadiumCSSReference.fontFamily'
    // );
    // if (currentfontFamily) {
    //   userDefaults.setNumber(
    //     'ReadiumCSSName.fontFamily',
    //     (currentfontFamily as Enumerable).index
    //   );
    // }

    // let currentfontOverride = this.userProperties.getProperty(
    //   'ReadiumCSSReference.fontOverride'
    // );
    // if (currentfontOverride) {
    //   userDefaults.setBool(
    //     'ReadiumCSSName.fontOverride',
    //     (currentfontOverride as Switchable).on
    //   );
    // }

    // let currentAppearance = this.userProperties.getProperty(
    //   'ReadiumCSSReference.appearance'
    // );
    // if (currentAppearance) {
    //   userDefaults.setNumber(
    //     'ReadiumCSSName.appearance',
    //     (currentAppearance as Enumerable).index
    //   );
    // }

    // let currentVerticalScroll = this.userProperties.getProperty(
    //   'ReadiumCSSReference.scroll'
    // );
    // if (currentVerticalScroll) {
    //   userDefaults.setBool(
    //     'ReadiumCSSName.scroll',
    //     (currentVerticalScroll as Switchable).on
    //   );
    // }

    // let currentPublisherDefaults = this.userProperties.getProperty(
    //   'ReadiumCSSReference.publisherDefault'
    // );
    // if (currentPublisherDefaults) {
    //   userDefaults.setBool(
    //     'ReadiumCSSName.publisherDefault',
    //     (currentPublisherDefaults as Switchable).on
    //   );
    // }

    // let currentTextAlignment = this.userProperties.getProperty(
    //   'ReadiumCSSReference.textAlignment'
    // );
    // if (currentTextAlignment) {
    //   userDefaults.setNumber(
    //     'ReadiumCSSName.textAlignment',
    //     (currentTextAlignment as Enumerable).index
    //   );
    // }

    if (this.columnCountType) {
      userDefaults.setString(
        ColumnCountTypeKey,
        this.columnCountType.toString()
      );
    } else {
      userDefaults.deleteKey(ColumnCountTypeKey);
    }

    // let currentWordSpacing = this.userProperties.getProperty(
    //   'ReadiumCSSReference.wordSpacing'
    // );
    // if (currentWordSpacing) {
    //   userDefaults.setNumber(
    //     'ReadiumCSSName.wordSpacing',
    //     (currentWordSpacing as Incrementable).value
    //   );
    // }

    // let currentLetterSpacing = this.userProperties.getProperty(
    //   'ReadiumCSSReference.letterSpacing'
    // );
    // if (currentLetterSpacing) {
    //   userDefaults.setNumber(
    //     'ReadiumCSSName.letterSpacing',
    //     (currentLetterSpacing as Incrementable).value
    //   );
    // }

    // let currentPageMargins = this.userProperties.getProperty(
    //   'ReadiumCSSReference.pageMargins'
    // );
    // if (currentPageMargins) {
    //   userDefaults.setNumber(
    //     'ReadiumCSSName.pageMargins',
    //     (currentPageMargins as Incrementable).value
    //   );
    // }

    // let currentLineHeight = this.userProperties.getProperty(
    //   'ReadiumCSSReference.lineHeight'
    // );
    // if (currentLineHeight) {
    //   userDefaults.setNumber(
    //     'ReadiumCSSName.lineHeight',
    //     (currentLineHeight as Incrementable).value
    //   );
    // }
  }
}
