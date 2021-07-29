//...

import { UserDefaults } from './UserDefaults';
import {
  Enumerable,
  Incrementable,
  Switchable,
  UserProperties,
} from './UserProperties';

export interface UserSettingsConfig {
  hyphens?: boolean;
  fontSize?: number;
  fontFamily?: number;
  appearance?: number;
  verticalScroll?: boolean;
  publisherDefaults?: boolean;
  textAlignment?: number;
  columnCount?: number;
  wordSpacing?: number;
  letterSpacing?: number;
  pageMargins?: number;
  lineHeight?: number;
}

export class UserSettings2 {
  // WARNING: String values must not contain any single or double quotes characters, otherwise it breaks the streamer's injection.
  private appearanceValues = [
    'readium-default-on',
    'readium-sepia-on',
    'readium-night-on',
  ];
  private fontFamilyValues = [
    'Original',
    'Helvetica Neue',
    'Iowan Old Style',
    'Athelas',
    'Seravek',
    'OpenDyslexic',
    'AccessibleDfA',
    'IA Writer Duospace',
  ];
  private textAlignmentValues = ['justify', 'start'];
  private columnCountValues = ['auto', '1', '2'];

  private fontSize: number;
  private fontOverride: boolean;
  private fontFamily: number;
  private appearance: number;
  private verticalScroll: boolean;
  private hyphens: boolean;

  private publisherDefaults: boolean;
  private textAlignment: number;
  private columnCount: number;
  private wordSpacing: number;
  private letterSpacing: number;
  private pageMargins: number;
  private lineHeight: number;

  public userProperties: UserProperties;

  constructor(initialValues: UserSettingsConfig, userDefaults?: UserDefaults) {
    this.userProperties = new UserProperties();

    this.hyphens =
      userDefaults?.getBool('ReadiumCSSName.hyphens') ||
      initialValues?.hyphens ||
      false;

    this.fontSize =
      userDefaults?.getNumber('ReadiumCSSName.fontSize') ||
      initialValues?.fontSize ||
      100;

    this.fontFamily =
      userDefaults?.getNumber('ReadiumCSSName.fontFamily') ||
      initialValues?.fontFamily ||
      0;

    this.fontOverride = this.fontFamily != 0;

    this.appearance =
      userDefaults?.getNumber('ReadiumCSSName.appearance') ||
      initialValues?.appearance ||
      0;

    this.verticalScroll =
      userDefaults?.getBool('ReadiumCSSName.verticalScroll') ||
      initialValues?.verticalScroll ||
      false;

    this.publisherDefaults =
      userDefaults?.getBool('ReadiumCSSName.publisherDefaults') ||
      initialValues?.publisherDefaults ||
      true;

    this.textAlignment =
      userDefaults?.getNumber('ReadiumCSSName.textAlignment') ||
      initialValues?.textAlignment ||
      0;

    this.columnCount =
      userDefaults?.getNumber('ReadiumCSSName.columnCount') ||
      initialValues?.columnCount ||
      0;

    this.wordSpacing =
      userDefaults?.getNumber('ReadiumCSSName.wordSpacing') ||
      initialValues?.wordSpacing ||
      0;

    this.letterSpacing =
      userDefaults?.getNumber('ReadiumCSSName.letterSpacing') ||
      initialValues?.letterSpacing ||
      0;

    this.pageMargins =
      userDefaults?.getNumber('ReadiumCSSName.pageMargins') ||
      initialValues?.pageMargins ||
      1;

    this.lineHeight =
      userDefaults?.getNumber('ReadiumCSSName.lineHeight') ||
      initialValues?.lineHeight ||
      1.5;

    this.buildCssProperties();
  }

  // Build and add CSS properties
  private buildCssProperties() {
    // Hyphens
    this.userProperties.addSwitchable(
      'auto',
      'none',
      this.hyphens,
      'ReadiumCSSReference.hyphens',
      'ReadiumCSSName.hyphens'
    );

    // Font size
    this.userProperties.addIncrementable(
      this.fontSize,
      100,
      300,
      25,
      '%',
      'ReadiumCSSReference.fontSize',
      'ReadiumCSSName.fontSize'
    );

    // Font family
    this.userProperties.addEnumerable(
      this.fontFamily,
      this.fontFamilyValues,
      'ReadiumCSSReference.fontFamily',
      'ReadiumCSSName.fontFamily'
    );

    // Font override
    this.userProperties.addSwitchable(
      'readium-font-on',
      'readium-font-off',
      this.fontOverride,
      'ReadiumCSSReference.fontOverride',
      'ReadiumCSSName.fontOverride'
    );

    // Appearance
    this.userProperties.addEnumerable(
      this.appearance,
      this.appearanceValues,
      'ReadiumCSSReference.appearance',
      'ReadiumCSSName.appearance'
    );

    // Vertical scroll
    this.userProperties.addSwitchable(
      'readium-scroll-on',
      'readium-scroll-off',
      this.verticalScroll,
      'ReadiumCSSReference.scroll',
      'ReadiumCSSName.scroll'
    );

    // Publisher default system
    this.userProperties.addSwitchable(
      'readium-advanced-off',
      'readium-advanced-on',
      this.publisherDefaults,
      'ReadiumCSSReference.publisherDefault',
      'ReadiumCSSName.publisherDefault'
    );

    // Text alignment
    this.userProperties.addEnumerable(
      this.textAlignment,
      this.textAlignmentValues,
      'ReadiumCSSReference.textAlignment',
      'ReadiumCSSName.textAlignment'
    );

    // Column count
    this.userProperties.addEnumerable(
      this.columnCount,
      this.columnCountValues,
      'ReadiumCSSReference.columnCount',
      'ReadiumCSSName.columnCount'
    );

    // Word spacing
    this.userProperties.addIncrementable(
      this.wordSpacing,
      0,
      0.5,
      0.125,
      'rem',
      'ReadiumCSSReference.wordSpacing',
      'ReadiumCSSName.wordSpacing'
    );

    // Letter spacing
    this.userProperties.addIncrementable(
      this.letterSpacing,
      0,
      0.25,
      0.0625,
      'em',
      'ReadiumCSSReference.letterSpacing',
      'ReadiumCSSName.letterSpacing'
    );

    // Page margins
    this.userProperties.addIncrementable(
      this.pageMargins,
      0.5,
      2,
      0.25,
      '',
      'ReadiumCSSReference.pageMargins',
      'ReadiumCSSName.pageMargins'
    );

    // Line height
    this.userProperties.addIncrementable(
      this.lineHeight,
      1,
      2,
      0.25,
      '',
      'ReadiumCSSReference.lineHeight',
      'ReadiumCSSName.lineHeight'
    );
  }

  // Save settings to UserDefaults
  public save(userDefaults: UserDefaults) {
    let currentfontSize = this.userProperties.getProperty(
      'ReadiumCSSReference.fontSize'
    );
    if (currentfontSize) {
      userDefaults.setNumber(
        'ReadiumCSSName.fontSize',
        (currentfontSize as Incrementable).value
      );
    }

    let currentfontFamily = this.userProperties.getProperty(
      'ReadiumCSSReference.fontFamily'
    );
    if (currentfontFamily) {
      userDefaults.setNumber(
        'ReadiumCSSName.fontFamily',
        (currentfontFamily as Enumerable).index
      );
    }

    let currentfontOverride = this.userProperties.getProperty(
      'ReadiumCSSReference.fontOverride'
    );
    if (currentfontOverride) {
      userDefaults.setBool(
        'ReadiumCSSName.fontOverride',
        (currentfontOverride as Switchable).on
      );
    }

    let currentAppearance = this.userProperties.getProperty(
      'ReadiumCSSReference.appearance'
    );
    if (currentAppearance) {
      userDefaults.setNumber(
        'ReadiumCSSName.appearance',
        (currentAppearance as Enumerable).index
      );
    }

    let currentVerticalScroll = this.userProperties.getProperty(
      'ReadiumCSSReference.scroll'
    );
    if (currentVerticalScroll) {
      userDefaults.setBool(
        'ReadiumCSSName.scroll',
        (currentVerticalScroll as Switchable).on
      );
    }

    let currentPublisherDefaults = this.userProperties.getProperty(
      'ReadiumCSSReference.publisherDefault'
    );
    if (currentPublisherDefaults) {
      userDefaults.setBool(
        'ReadiumCSSName.publisherDefault',
        (currentPublisherDefaults as Switchable).on
      );
    }

    let currentTextAlignment = this.userProperties.getProperty(
      'ReadiumCSSReference.textAlignment'
    );
    if (currentTextAlignment) {
      userDefaults.setNumber(
        'ReadiumCSSName.textAlignment',
        (currentTextAlignment as Enumerable).index
      );
    }

    let currentColumnCount = this.userProperties.getProperty(
      'ReadiumCSSReference.columnCount'
    );
    if (currentColumnCount) {
      userDefaults.setNumber(
        'ReadiumCSSName.columnCount',
        (currentColumnCount as Enumerable).index
      );
    }

    let currentWordSpacing = this.userProperties.getProperty(
      'ReadiumCSSReference.wordSpacing'
    );
    if (currentWordSpacing) {
      userDefaults.setNumber(
        'ReadiumCSSName.wordSpacing',
        (currentWordSpacing as Incrementable).value
      );
    }

    let currentLetterSpacing = this.userProperties.getProperty(
      'ReadiumCSSReference.letterSpacing'
    );
    if (currentLetterSpacing) {
      userDefaults.setNumber(
        'ReadiumCSSName.letterSpacing',
        (currentLetterSpacing as Incrementable).value
      );
    }

    let currentPageMargins = this.userProperties.getProperty(
      'ReadiumCSSReference.pageMargins'
    );
    if (currentPageMargins) {
      userDefaults.setNumber(
        'ReadiumCSSName.pageMargins',
        (currentPageMargins as Incrementable).value
      );
    }

    let currentLineHeight = this.userProperties.getProperty(
      'ReadiumCSSReference.lineHeight'
    );
    if (currentLineHeight) {
      userDefaults.setNumber(
        'ReadiumCSSName.lineHeight',
        (currentLineHeight as Incrementable).value
      );
    }
  }
}
