/* Copyright 2021 Readium Foundation. All rights reserved.
 * Use of this source code is governed by a BSD-style license,
 * available in the LICENSE file present in the Github repository of the project.
 */

/**
 * Holds a list of key-value pairs provided by the app to influence a Navigator's Presentation Properties.
 * The keys must be valid Presentation Property Keys.
 */
export class PresentationSettings {
  /**
   * Maps a Presentation Property Key with a value.
   * Contrary to PresentationProperties, the value of a setting can be null to let the Navigator use a default value.
   */
  public settings: { [key: string]: any };

  constructor(settings: { [key: string]: any }) {
    this.settings = settings;
  }

  /**
   * Returns a copy of self after overwriting any setting with the values from other.
   */
  public merge(other?: PresentationSettings): PresentationSettings {
    return new PresentationSettings({ ...this.settings, ...other?.settings });
  }

  /**
   * Clones settings
   */
  public clone(): PresentationSettings {
    return new PresentationSettings({ ...this.settings });
  }

  /**
   * Clones settings merging with provided settings
   */
  public cloneWithValues(values: { [key: string]: any }): PresentationSettings {
    return new PresentationSettings({ ...this.settings, ...values });
  }

  /**
   * Returns empty settings
   */
  public static get emptySettings(): PresentationSettings {
    return new PresentationSettings({});
  }

  /**
   * Parses Presentation Settings from a serialized JSON object.
   */
  public static deserialize(json: any): undefined | PresentationSettings {
    if (!(json && (typeof json === 'string' || json.constructor === Object)))
      return;
    return new PresentationSettings(json);
  }

  /**
   * Serializes the settings into a JSON object.
   */
  public serialize(): any {
    return this.settings;
  }
}
