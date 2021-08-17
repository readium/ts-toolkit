/* Copyright 2021 Readium Foundation. All rights reserved.
 * Use of this source code is governed by a BSD-style license,
 * available in the LICENSE file present in the Github repository of the project.
 */

import {
  INavigator,
  INavigatorDelegate,
  Navigator,
  NavigatorDelegate,
} from './Navigator';
import { Range } from './utils';

/// Status of a played media resource.
export enum MediaPlaybackState {
  paused = 'paused',
  loading = 'loading',
  playing = 'playing',
}

/// Protocol for a navigator rendering an audio or video based publication.
export interface IMediaNavigator extends INavigator {
  /// Total duration in the publication, if known.
  totalDuration?: number;

  /// Volume of playback, from 0.0 to 1.0.
  volume: number;

  /// Speed of playback.
  /// Default is 1.0
  rate: number;

  /// Returns whether the resource is currently playing or not.
  state: MediaPlaybackState;

  /// Resumes or start the playback.
  play(): void;

  /// Pauses the playback.
  pause(): void;

  /// Seeks to the given time in the current resource.
  seekTo(time: number): void;

  /// Seeks relatively from the current time in the current resource.
  seekRelatively(delta: number): void;
}

export abstract class MediaNavigator extends Navigator
  implements IMediaNavigator {
  public abstract get totalDuration(): number | undefined;

  public abstract volume: number;

  public abstract rate: number;

  public abstract get state(): MediaPlaybackState;

  public abstract play(): void;

  public abstract pause(): void;

  public abstract seekTo(time: number): void;

  public abstract seekRelatively(delta: number): void;

  /// Toggles the playback.
  public playPause(): void {
    switch (this.state) {
      case MediaPlaybackState.loading:
      case MediaPlaybackState.playing:
        this.pause();
        break;
      case MediaPlaybackState.paused:
        this.play();
        break;
    }
  }
}

/// Holds metadata about a played media resource.
export class MediaPlaybackInfo {
  /// Index of the current resource in the `readingOrder`.
  public resourceIndex: number;

  /// Indicates whether the resource is currently playing or not.
  public state: MediaPlaybackState;

  /// Current playback position in the resource, in seconds.
  public time: number;

  /// Duration in seconds of the resource, if known.
  public duration?: number;

  /// Progress in the resource, from 0 to 1.
  public get progress(): number {
    return this.duration ? this.time / this.duration : 0;
  }

  constructor(
    resourceIndex: number,
    state: MediaPlaybackState,
    time: number,
    duration?: number
  ) {
    this.resourceIndex = resourceIndex;
    this.state = state;
    this.time = time;
    this.duration = duration;
  }
}

export interface IMediaNavigatorDelegate extends INavigatorDelegate {
  /// Called when the playback updates.
  OnPlaybackDidChange(
    navigator: IMediaNavigator,
    info: MediaPlaybackInfo
  ): void;

  /// Called when the navigator finished playing the current resource.
  /// Returns whether the next resource should be played. Default is true.
  OnShouldPlayNextResource(
    navigator: IMediaNavigator,
    info: MediaPlaybackInfo
  ): boolean;

  /// Called when the ranges of buffered media data change.
  /// Warning: They may be discontinuous.
  OnLoadedTimeRangesDidChange(
    navigator: IMediaNavigator,
    ranges: Array<Range<number>>
  ): void;
}

export abstract class MediaNavigatorDelegate extends NavigatorDelegate
  implements IMediaNavigatorDelegate {
  OnPlaybackDidChange(
    navigator: IMediaNavigator,
    info: MediaPlaybackInfo
  ): void {}

  OnShouldPlayNextResource(
    navigator: IMediaNavigator,
    info: MediaPlaybackInfo
  ): boolean {
    return true;
  }

  OnLoadedTimeRangesDidChange(
    navigator: IMediaNavigator,
    ranges: Range<number>[]
  ): void {}
}
