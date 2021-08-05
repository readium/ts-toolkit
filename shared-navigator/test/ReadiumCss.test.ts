import {
  ColumnCountType,
  HyphenType,
  PresentationSettings,
} from '../src/csswrapper/variables/ColumnCount';

describe('Readium Css Tests', () => {
  // it('test', async () => {

  //   let r:ReadiumCss=new ReadiumCss();

  //   r.columnCountType.value = ColumnCountType.OneColumn;
  //   r.hyphens.value = HyphenType.Auto;
  //    r.hyphens.value = HyphenType.None;
  //    //r.hyphens.value = undefined;

  //   console.log(r.getCssVariables());

  //   //expect(await settings.getSetting(key)).toEqual(value);
  // });

  it('test', async () => {
    let ps = new PresentationSettings({
      values: {},
      initialValues: {
        columnCountType: ColumnCountType.Auto,
        advancedSettings: false,
        //hyphens:HyphenType.Auto
      },
    });

    ps.printValues();
    //ps.columnCountType.value = ColumnCountType.OneColumn;
    ps.hyphens.value = HyphenType.Auto;
    //ps.hyphens.value = undefined;

    ps.printValues();

    //console.log(ps.hyphens.getEffectiveValue());

    let css = ps.toCss();

    console.log(css);

    //expect(await settings.getSetting(key)).toEqual(value);
  });
});
