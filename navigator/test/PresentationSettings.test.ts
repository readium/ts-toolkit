import { PresentationSettings } from '../src';

describe('Presentation Settings Tests', () => {
  const testConfig = {
    setting1: {
      type: 'string',
      description: 'Setting1',
      value: 'value1',
      defaultValue: 'value1',
      additionalSettings: {
        additionalKey1: 'additionalValue1',
        additionalKey2: 'additionalValue2',
      },
    },
    setting2: {
      type: 'selection',
      description: 'Setting2',
      value: 'value2',
      defaultValue: 'value1',
      items: { value1: 'Value1', value2: 'Value2', value3: 'Value3' },
    },
    setting3: {
      type: 'boolean',
      description: 'Setting3',
      value: true,
      defaultValue: false,
    },
    setting4: {
      type: 'numeric',
      description: 'Setting4',
      value: 4,
      defaultValue: 0,
      minValue: 0,
      maxValue: 10,
      stepValue: 1,
      unit: 'px',
      requiredSettings: { setting3: true },
    },
  };

  it('Should deserialize settings', () => {
    const settings = PresentationSettings.deserialize(testConfig);
    expect(settings.getSetting('setting1')?.value).toEqual('value1');
  });
});
