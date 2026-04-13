import { ConfigurablePreferences } from "../../preferences/Configurable.ts";
import {
  ensureBoolean,
  ensureValueInRange,
  ensureNonNegative
} from "../../preferences/guards";
import {
  volumeRangeConfig,
  playbackRateRangeConfig,
  skipIntervalRangeConfig
} from "../../preferences/Types";

export interface IAudioPreferences {
  volume?: number | null;
  playbackRate?: number | null;
  preservePitch?: boolean | null;
  skipBackwardInterval?: number | null;
  skipForwardInterval?: number | null;
  pollInterval?: number | null;
  autoPlay?: boolean | null;
  enableMediaSession?: boolean | null;
}

export class AudioPreferences implements ConfigurablePreferences<AudioPreferences> {
  public readonly volume: number | null | undefined;
  public readonly playbackRate: number | null | undefined;
  public readonly preservePitch: boolean | null | undefined;
  public readonly skipBackwardInterval: number | null | undefined;
  public readonly skipForwardInterval: number | null | undefined;
  public readonly pollInterval: number | null | undefined;
  public readonly autoPlay: boolean | null | undefined;
  public readonly enableMediaSession: boolean | null | undefined;

  constructor(preferences: IAudioPreferences = {}) {
    this.volume = ensureValueInRange(preferences.volume, volumeRangeConfig.range);
    this.playbackRate = ensureValueInRange(preferences.playbackRate, playbackRateRangeConfig.range);
    this.preservePitch = ensureBoolean(preferences.preservePitch);
    this.skipBackwardInterval = ensureValueInRange(preferences.skipBackwardInterval, skipIntervalRangeConfig.range);
    this.skipForwardInterval = ensureValueInRange(preferences.skipForwardInterval, skipIntervalRangeConfig.range);
    this.pollInterval = ensureNonNegative(preferences.pollInterval);
    this.autoPlay = ensureBoolean(preferences.autoPlay);
    this.enableMediaSession = ensureBoolean(preferences.enableMediaSession);
  }

  merging(other: AudioPreferences): AudioPreferences {
    const merged: IAudioPreferences = { ...this };
    for (const key of Object.keys(other) as (keyof IAudioPreferences)[]) {
      if (other[key] !== undefined) {
        (merged as Record<string, unknown>)[key] = other[key];
      }
    }
    return new AudioPreferences(merged);
  }
}
