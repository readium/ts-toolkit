// import {
//   Enum1,
//   PresentationSettings,
// } from './PresentationSettings/PresentationSettings';
// import { ISetting } from './PresentationSettings/Setting';
// import { ColumnCountType, HyphenType, ReadiumCss } from './readiumCss';

import {
  PresentationController,
  PresentationNavigator,
  PresentationSettings,
} from './presentation';
import { PresentationKeys } from './presentation/standart/PresentationKeys';

export const ___y = '';

class TestNavigator extends PresentationNavigator {
  apply(setting: PresentationSettings): void {
    console.log('applying presentation settings : ');
    console.log(setting);
  }
}

// let rcss = new ReadiumCss({
//   columnCountType: ColumnCountType.OneColumn,
//   hyphens: HyphenType.Auto,
// });

// let css = rcss.toCss();

// console.log(css);

// Set up a list of app-level default settings statically.
let appSettings: PresentationSettings = new PresentationSettings({
  [PresentationKeys.PUBLISHER_DEFAULTS]: true,
  [PresentationKeys.FONT_SIZE]: 0.4,
  [PresentationKeys.LETTER_SPACING]: 0.7,
});

// Load the saved user settings.
let userSettings: PresentationSettings = new PresentationSettings({
  [PresentationKeys.PUBLISHER_DEFAULTS]: true,
  [PresentationKeys.FONT_SIZE]: 0.5,
  [PresentationKeys.LETTER_SPACING]: 0.2,
});

let navigator = new TestNavigator();

let presentation = new PresentationController(
  navigator,
  appSettings,
  userSettings
);

presentation.userSettings.observe(settings => {
  //console.log('Save user settings', settings);
});

// if (presentation.fontSize)
//   presentation.fontSize.value = undefined;

presentation.publisherDefaults.observe(setting => {
  if (setting) {
    console.log(setting);
  }
});

class MockControl {
  public color?: string;
  public text?: string;
  public onClick?: () => void;
}

let fontSizeControl = new MockControl();

fontSizeControl.onClick = () => {
  console.log('onClick 1');
  presentation.increment(presentation.fontSize.value);
  presentation.apply();
};

presentation.fontSize.observe(setting => {
  if (setting) {
    // If the font size is currently inactive in the
    // Navigator, we can show it in the user interface.
    fontSizeControl.color = setting.isActive ? 'black' : 'gray';
    // Display the current value for the font size
    //  as a localized user string, e.g. 14 pt
    fontSizeControl.text = setting
      .labelForValue(setting.value)
      .getTranslation();

    // Setup the action when the user clicks on the "+" button.
    // We increase the font size and then update the Navigator.
    fontSizeControl.onClick = () => {
      console.log('onClick 2');
      presentation.increment(setting);
      presentation.apply();
    };
  } else {
    // Font size is not supported by this Navigator.
    // We should hide the views.
  }
});

fontSizeControl.onClick();
// fontSizeControl.onClick();

let letterSpacingControl = new MockControl();

letterSpacingControl.onClick = () => {
  console.log('onClick 1');
  presentation.increment(presentation.letterSpacing.value);
  presentation.apply();
};

presentation.letterSpacing.observe(setting => {
  if (setting) {
    console.log(setting);
    // If the font size is currently inactive in the
    // Navigator, we can show it in the user interface.
    letterSpacingControl.color = setting.isActive ? 'black' : 'gray';
    // Display the current value for the font size
    //  as a localized user string, e.g. 14 pt
    letterSpacingControl.text = setting
      .labelForValue(setting.value)
      .getTranslation();

    // Setup the action when the user clicks on the "+" button.
    // We increase the font size and then update the Navigator.
    letterSpacingControl.onClick = () => {
      console.log('onClick 2');
      presentation.increment(setting);
      presentation.apply();
    };
  } else {
    // Font size is not supported by this Navigator.
    // We should hide the views.
  }
});

letterSpacingControl.onClick();
letterSpacingControl.onClick();

// const testConfig = {
//   setting1: {
//     type: 'string',
//     description: 'Setting1',
//     value: 'value2',
//     defaultValue: 'value1',
//     additionalSettings: {
//       additionalKey1: 'additionalValue1',
//       additionalKey2: 'additionalValue2',
//     },
//   },
//   setting2: {
//     type: 'selection',
//     description: 'Setting2',
//     value: 'value2',
//     defaultValue: 'value1',
//     items: { value1: 'Value1', value2: 'Value2', value3: 'Value3' },
//   },
//   setting3: {
//     type: 'boolean',
//     description: 'Setting3',
//     value: true,
//     defaultValue: false,
//   },
//   setting4: {
//     type: 'numeric',
//     description: 'Setting4',
//     value: 4,
//     defaultValue: 0,
//     minValue: 0,
//     maxValue: 10,
//     stepValue: 1,
//     unit: 'px',
//     requiredSettings: { setting3: true },
//   },
// };

// const settings = PresentationSettings.deserialize(testConfig);

// const setting1 = settings.items.get('setting4');
// if (setting1) {
//   setting1.value = 5;
// }

// console.log(settings);

// const printSetting = (setting: ISetting<any>) => {
//   console.log(
//     setting.desciption +
//       ' : [value:' +
//       setting.value +
//       '][default:' +
//       setting.defaultValue +
//       '][effective:' +
//       setting.getEffectiveValue() +
//       ']'
//   );
// };

// const printSettings = (settings: PresentationSettings) => {
//   console.log('print settings:');
//   printSetting(settings.setting1);
//   printSetting(settings.setting2);
//   printSetting(settings.requiredSetting1);
//   console.log('');
// };

// let ps = new PresentationSettings({
//   setting1: Enum1.val1,
//   requiredSetting1: false,
//   setting2: 100,
// });

// printSettings(ps);

// ps.setting2.incrementValue();

// printSettings(ps);

// //ps.columnCountType.value = ColumnCountType.OneColumn;
// ps.hyphens.value = HyphenType.Auto;
// //ps.advancedSettings.value = true;
// //ps.hyphens.value = undefined;
// //ps.fontOverride.value = false;
// //ps.fontOverride.reset();

// //ps.fontSize.value = 125;
// //ps.fontFamily.value = 'fffffff';
// //ps.textAlign.value  = TextAlign.Justify;

// ps.printValues();

// ps.hyphens.reset();
// ps.fontSize.reset();
// ps.fontFamily.reset();

// ps.printValues();

// //console.log(ps.hyphens.getEffectiveValue());

// let css = ps.toCss();

// console.log(css);
