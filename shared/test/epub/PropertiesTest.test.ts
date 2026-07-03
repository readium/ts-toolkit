import { Properties, getContains } from '../../src';

describe('Epub Properties Tests', () => {
  it('get Properties {contains} when available', () => {
    expect(
      getContains(new Properties({ contains: ['mathml', 'onix'] }))
    ).toEqual(new Set(['mathml', 'onix']));
  });

  it('get Properties {contains} removes duplicates', () => {
    expect(
      getContains(new Properties({ contains: ['mathml', 'onix', 'onix'] }))
    ).toEqual(new Set(['mathml', 'onix']));
  });

  it('get Properties {contains} when missing', () => {
    expect(getContains(new Properties({}))).toEqual(new Set());
  });

  it('get Properties {contains} skips duplicates', () => {
    expect(
      getContains(new Properties({ contains: ['mathml', 'mathml'] }))
    ).toEqual(new Set(['mathml']));
  });
});
