// import {
//   Enum1,
//   PresentationSettings,
// } from './PresentationSettings/PresentationSettings';
// import { ISetting } from './PresentationSettings/Setting';
// import { ColumnCountType, HyphenType, ReadiumCss } from './readiumCss';

import {  Injections } from './injections/Injection';


export const ___y = '';

// let rcss = new ReadiumCss({
//   columnCountType: ColumnCountType.OneColumn,
//   hyphens: HyphenType.Auto,
// });

// let css = rcss.toCss();

// console.log(css);


const injections = [
  /*
    for each link with type 'text/html' and property 'contains: mathml'
      inject resource '/lib/mathjax.js' in a <script>, as the last element in <body>
  */
  {
      predicates: [
          {
              type: 'text/html',
              properties: {
                  contains: 'mathml'
              }
          }
      ],
      resources: [
          {
              href: '/lib/mathjax.js',
              type: 'application/javascript',
              target: 'body',
              insertion: 'append'
          }
      ]
  },
  /*
    for each link with type 'text/html' or type 'application/xhtml+xml'
      inject resource '/rs/epubReadingSystem.js' in a <script>, as the last element in <body>
      inject resource '/readium-css/ReadiumCSS-before.css' in a <link rel='stylesheet'>, as the first element in <head>
      inject resource '/readium-css/ReadiumCSS-after.css' in a <link rel='stylesheet'>, as the last element in <head>
  */
  {
      predicates: [
          {
              type: 'text/html'
          },
          {
              type: 'application/xhtml+xml'
          }
      ],
      resources: [
          {
              href: '/rs/epubReadingSystem.js',
              type: 'application/javascript',
              target: 'head',
              insertion: 'prepend'
          },
          {
              href: '/readium-css/ReadiumCSS-before.css',
              type: 'text/css',
              target: 'head',
              insertion: 'prepend',
              preload: true
          },
          {
              href: '/readium-css/ReadiumCSS-after.css',
              type: 'text/css',
              target: 'head',
              insertion: 'append',
              preload: true
          }
      ]
  }
]

const injs = Injections.deserialize(injections);

console.log(injs);






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
