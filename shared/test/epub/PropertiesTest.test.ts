import { EPUBLayout, Properties } from '../../src';

describe('Epub Properties Tests', () => {
  it('get Properties {contains} when available', () => {
    expect(
      new Properties({ contains: ['mathml', 'onix'] }).getContains()
    ).toEqual(new Set(['mathml', 'onix']));
  });

  it('get Properties {contains} removes duplicates', () => {
    expect(
      new Properties({ contains: ['mathml', 'onix', 'onix'] }).getContains()
    ).toEqual(new Set(['mathml', 'onix']));
  });

  it('get Properties {contains} when missing', () => {
    expect(new Properties({}).getContains()).toEqual(new Set());
  });

  it('get Properties {contains} skips duplicates', () => {
    expect(
      new Properties({ contains: ['mathml', 'mathml'] }).getContains()
    ).toEqual(new Set(['mathml']));
  });

  it('get Properties {layout} when available', () => {
    expect(new Properties({ layout: 'fixed' }).getLayout()).toEqual(
      EPUBLayout.fixed
    );
  });

  it('get Properties {layout} when missing', () => {
    expect(new Properties({}).getLayout()).toBeUndefined();
  });
});
