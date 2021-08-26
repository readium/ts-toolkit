/* Copyright 2021 Readium Foundation. All rights reserved.
 * Use of this source code is governed by a BSD-style license,
 * available in the LICENSE file present in the Github repository of the project.
 */

import { IPresentationNavigator } from '../PresentationNavigator';
import { Observable } from './Observable';
import { RangeProperty } from './PresentationProperty';
import { PresentationSettings } from './PresentationSettings';
import {
  IPresentationSetting,
  RangeSetting,
  SwitchSetting,
} from './PresentationSetting';

/**
 * Helper class which simplifies the modification of Presentation Settings and designing a user settings interface.
 */
export class PresentationController {
  /**
   * Navigator apply settings
   */
  public readonly navigator: IPresentationNavigator;

  /**
   * An immutable list of Presentation Settings that the app chooses to customize but without user input.
   */
  public applicationSettings: PresentationSettings;

  /**
   * Current set of raw User Presentation Settings, which is updated every time the settings are changed.
   * The initial value is the one provided in the constructor.
   * The reading app can observe it to persist the latest user settings.
   */
  public userSettings: Observable<PresentationSettings>;

  /**
   * Maps each Property Key to a high-level user setting object.
   * If a setting is null, it means that the Navigator does not support the matching Presentation Property.
   */
  public settings: Map<string, Observable<IPresentationSetting<any>>>;

  /**
   * Creates Presentation Controller
   */
  constructor(
    navigator: IPresentationNavigator,
    applicationSettings: PresentationSettings,
    userSettings: PresentationSettings
  ) {
    this.navigator = navigator;
    this.applicationSettings = applicationSettings;
    this.userSettings = new Observable();
    this.settings = new Map();
    this.initializeSettings();
    this.mapUserSettingsValues(userSettings);
    this.apply();
  }

  /**
   * Create setting handlers for settings
   */
  public initializeSettings() {
    this.navigator.presentation.properties.forEach(property => {
      if (property.value) {
        this.settings.set(
          property.value.key,
          (new Observable(property.value.createSetting()) as any) as Observable<
            IPresentationSetting<any>
          >
        );
      }
    });
  }

  /**
   * Map new setting values
   */
  public mapUserSettingsValues(presentationSettings?: PresentationSettings) {
    if (presentationSettings) {
      let newSettings = presentationSettings.clone();
      let mergedSettings = this.applicationSettings.merge(newSettings);

      let keys = Object.keys(mergedSettings.settings);

      let currentIndex = 0;
      while (currentIndex < keys.length) {
        const key = keys[currentIndex];
        const value = mergedSettings.settings[key];

        const setting = this.settings.get(key);
        if (setting) {
          const property = this.navigator.presentation.properties.get(key);
          if (property?.value) {
            let active = false;

            if (setting.value) {
              const isActiveHandler = property.value.isActiveForSettings;
              active =
                isActiveHandler === undefined ||
                isActiveHandler(mergedSettings);

              if (!active) {
                newSettings = this.activate(newSettings, setting.value);
                mergedSettings = this.applicationSettings.merge(newSettings);

                const currentKeys = [...keys];

                keys = [
                  ...keys,
                  ...Object.keys(mergedSettings.settings).filter(
                    k1 => !currentKeys.some(k2 => k1 === k2)
                  ),
                ];

                active =
                  isActiveHandler === undefined ||
                  isActiveHandler(mergedSettings);
              }
            }

            setting.value = property.value.createSetting(value, active);
          }
        }

        currentIndex++;
      }

      this.userSettings.value = newSettings;
    }
  }

  /**
   * Applies the current set of userSettings to the Navigator.
   * Typically, this is called after the user changes a single setting, or after restoring a bunch of settings together.
   */
  public apply(): void {
    this.navigator.apply(this.mergedSettings());
  }

  /**
   * Returns usersettings and application settings merged
   */
  private mergedSettings(): PresentationSettings {
    return this.applicationSettings.merge(this.userSettings.value);
  }

  /**
   * Clears all user settings to revert to the Navigator default values.
   */
  public reset(): void {
    if (this.userSettings) {
      this.userSettings.value = PresentationSettings.emptySettings;
    }
  }

  /**
   *
   * Changes the value of the given setting.
   * The new value will be saved in the userSettings object.
   */
  public set<T>(setting?: IPresentationSetting<T>, value?: T): void {
    if (setting) {
      this.mapUserSettingsValues(
        this.userSettings.value?.cloneWithValues({
          [setting.key]: value,
        })
      );
    }
  }

  /**
   * Updates the user setting to ensure the matching Presentation Property is active.
   */
  private activate<T>(
    settings: PresentationSettings,
    setting: IPresentationSetting<T>
  ): PresentationSettings {
    const property = this.navigator.presentation.properties.get(setting.key);
    if (property && property.value && property.value.activateInSettings) {
      return property.value.activateInSettings(settings);
    }
    return settings;
  }

  /**
   * Inverts the value of the given switch setting.
   */
  public toggle(setting?: SwitchSetting): void {
    if (setting) {
      this.set(setting, !setting.value);
    }
  }

  /**
   *
   * Increments the value of the given range setting to the next effective step.
   * The minimum step is calculated from the setting.stepCount property.
   */
  public increment(setting?: RangeSetting): void {
    if (setting?.value) {
      const property = this.navigator.presentation.properties.get(setting.key)
        ?.value as RangeProperty | undefined;
      if (property) {
        const value = setting.value + (property.stepsCount ?? 0);
        this.set(setting, Math.min(value, 1));
      }
    }
  }

  /**
   * Decrements the value of the given range setting to the previous effective step.
   * The minimum step is calculated from the setting.stepCount property.
   */
  public decrement(setting?: RangeSetting): void {
    if (setting?.value) {
      const property = this.navigator.presentation.properties.get(
        setting.key
      ) as RangeProperty | undefined;
      if (property) {
        const value = setting.value - (property.stepsCount ?? 0);
        this.set(setting, Math.max(value, 0));
      }
    }
  }
}
