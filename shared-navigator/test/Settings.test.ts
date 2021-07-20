import { Settings } from '../src';

describe('Settings Tests', () => {
  it('Should save settings', async () => {
    const settings = new Settings();

    const key = 'key';
    const value = 'value';

    let savedValue: string | undefined;

    settings.onSaveSetting = async (_key, value) => {
      savedValue = value;
    };

    await settings.setSetting(key, value);

    expect(savedValue).toEqual(value);
    expect(await settings.getSetting(key)).toEqual(value);
  });

  it('Should load settings', async () => {
    const settings = new Settings();

    const key = 'key';
    const value = 'value';

    settings.onLoadSetting = async _key => {
      return value;
    };

    const loadedValue = await settings.getSetting(key);

    expect(loadedValue).toEqual(value);
  });
});
