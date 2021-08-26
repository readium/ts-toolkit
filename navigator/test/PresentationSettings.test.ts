/* Copyright 2021 Readium Foundation. All rights reserved.
 * Use of this source code is governed by a BSD-style license,
 * available in the LICENSE file present in the Github repository of the project.
 */

import {
  PresentationController,
  PresentationNavigator,
  PresentationSettings,
} from '../src';

class TestNavigator extends PresentationNavigator {
  public settingsApplied?: boolean;

  apply(setting: PresentationSettings): void {
    this.settingsApplied = true;
  }
}

describe('Presentation Settings Tests', () => {
  it('Navigator test', () => {
    const appSettings: PresentationSettings = new PresentationSettings({
      publisherDefaults: true,
      fontSize: 0.4,
      letterSpacing: 0.7,
    });

    const userSettings: PresentationSettings = new PresentationSettings({
      publisherDefaults: true,
      fontSize: 0.5,
      letterSpacing: 0.2,
    });

    const navigator = new TestNavigator();

    let presentation = new PresentationController(
      navigator,
      appSettings,
      userSettings
    );

    let changesSaved = false;

    presentation.userSettings.observe(settings => {
      changesSaved = true;
    });

    class MockControl {
      public onClick?: () => void;
    }

    let fontSizeControl = new MockControl();

    fontSizeControl.onClick = () => {
      presentation.increment(presentation.fontSize.value);
      presentation.apply();
    };

    presentation.fontSize.observe(setting => {
      if (setting) {
        fontSizeControl.onClick = () => {
          presentation.increment(setting);
          presentation.apply();
        };
      }
    });

    fontSizeControl.onClick();
    fontSizeControl.onClick();

    let letterSpacingControl = new MockControl();

    letterSpacingControl.onClick = () => {
      presentation.increment(presentation.letterSpacing.value);
      presentation.apply();
    };

    presentation.letterSpacing.observe(setting => {
      if (setting) {
        letterSpacingControl.onClick = () => {
          presentation.increment(setting);
          presentation.apply();
        };
      }
    });

    letterSpacingControl.onClick();
    letterSpacingControl.onClick();

    expect(navigator.settingsApplied).toBeTruthy();
    expect(changesSaved).toBeTruthy();
    expect(presentation.fontSize.value).toEqual({
      isActive: true,
      key: 'fontSize',
      value: 0.7,
    });
    expect(presentation.publisherDefaults.value).toEqual({
      isActive: true,
      key: 'publisherDefaults',
      value: false,
    });
    expect(presentation.letterSpacing.value).toEqual({
      isActive: true,
      key: 'letterSpacing',
      value: 0.4,
    });
  });
});
