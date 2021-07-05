import { Properties } from '../src';

describe('Properties Tests', () => {
  it('parse undefined JSON', () => {
    expect(Properties.deserialize(undefined)).toEqual(undefined);
  });

  it('parse minimal JSON', () => {
    expect(Properties.deserialize({})).toEqual(new Properties({}));
  });

  it('parse full JSON', () => {
    expect(
      Properties.deserialize({
        'other-property1': 'value',
        'other-property2': [42],
      })
    ).toEqual(
      new Properties({
        'other-property1': 'value',
        'other-property2': [42],
      })
    );
  });

  it('get minimal JSON', () => {
    expect(new Properties({}).serialize()).toEqual({});
  });

  it('get full JSON', () => {
    expect(
      new Properties({
        'other-property1': 'value',
        'other-property2': [42],
      }).serialize()
    ).toEqual({
      'other-property1': 'value',
      'other-property2': [42],
    });
  });

  it('copy after adding the given {properties}', () => {
    const properties = new Properties({
      'other-property1': 'value',
      'other-property2': [42],
    });

    expect(properties.add({ additional: 'property' }).serialize()).toEqual({
      'other-property1': 'value',
      'other-property2': [42],
      additional: 'property',
    });
  });
});
