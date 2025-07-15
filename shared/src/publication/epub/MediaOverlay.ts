/* Copyright 2025 Readium Foundation. All rights reserved.
 * Use of this source code is governed by a BSD-style license,
 * available in the LICENSE file present in the Github repository of the project.
 */

export class MediaOverlay {
  /** Author-defined CSS class name to apply to the currently-playing EPUB Content Document element. */
  public activeClass?: string;

  /** Author-defined CSS class name to apply to the EPUB Content Document's document element when playback is active. */
  public playbackActiveClass?: string;

  /** Creates a MediaOverlay object */
  constructor(values: {
    activeClass?: string;
    playbackActiveClass?: string;
  }) {
    this.activeClass = values.activeClass;
    this.playbackActiveClass = values.playbackActiveClass;
  }

  /**
   * Parses a MediaOverlay from its RWPM JSON representation.
   */
  public static deserialize(json: any): MediaOverlay | undefined {
    if (!json) return;
    
    return new MediaOverlay({
      activeClass: json.activeClass,
      playbackActiveClass: json.playbackActiveClass,
    });
  }

  /**
   * Serializes a MediaOverlay to its RWPM JSON representation.
   */
  public serialize(): any {
    const json: any = {};
    if (this.activeClass) json.activeClass = this.activeClass;
    if (this.playbackActiveClass) json.playbackActiveClass = this.playbackActiveClass;
    return json;
  }
}
