import { Properties } from '../src/Publication/Properties';

describe('Properties Tests', () => {
  it('parse undefined JSON', () => {
    expect(Properties.fromJSON(undefined)).toEqual(undefined);
  });

  it('parse minimal JSON', () => {
    expect(Properties.fromJSON({})).toEqual(new Properties({}));
  });

  it('parse full JSON', () => {
    expect(
      Properties.fromJSON({
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
    expect(new Properties({}).toJSON()).toEqual({});
  });

  it('get full JSON', () => {
    expect(
      new Properties({
        'other-property1': 'value',
        'other-property2': [42],
      }).toJSON()
    ).toEqual({
      'other-property1': 'value',
      'other-property2': [42],
    });
  });

  it('copy after adding the given {properties}', () => {
    let properties = new Properties({
      'other-property1': 'value',
      'other-property2': [42],
    });

    expect(properties.add({ additional: 'property' }).toJSON()).toEqual({
      'other-property1': 'value',
      'other-property2': [42],
      additional: 'property',
    });
  });
});
