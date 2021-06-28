import { Properties } from '../src/Publication/Properties';

describe('Properties Tests', () => {
  it('parse null JSON', () => {
    expect(undefined).toEqual(Properties.fromJSON(undefined));
  });

  it('parse minimal JSON', () => {
    expect(new Properties({})).toEqual(Properties.fromJSON({}));
  });

  it('parse full JSON', () => {
    expect(
      new Properties({
        'other-property1': 'value',
        'other-property2': [42],
      })
    ).toEqual(
      Properties.fromJSON({
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
