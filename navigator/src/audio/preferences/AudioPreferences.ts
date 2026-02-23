import { ConfigurablePreferences } from "../../preferences/Configurable";

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

export class AudioPreferences implements ConfigurablePreferences {
  public readonly volume: number;
  public readonly playbackRate: number;
  public readonly preservePitch: boolean;
  public readonly skipBackwardInterval: number;
  public readonly skipForwardInterval: number;
  public readonly pollInterval: number;
  public readonly autoPlay: boolean;
  public readonly enableMediaSession: boolean;

  constructor(preferences: IAudioPreferences = {}) {
    this.volume = preferences.volume ?? 1.0;
    this.playbackRate = preferences.playbackRate ?? 1.0;
    this.preservePitch = preferences.preservePitch ?? true;
    this.skipBackwardInterval = preferences.skipBackwardInterval ?? 30;
    this.skipForwardInterval = preferences.skipForwardInterval ?? 30;
    this.pollInterval = preferences.pollInterval ?? 1000;
    this.autoPlay = preferences.autoPlay ?? true;
    this.enableMediaSession = preferences.enableMediaSession ?? true;
  }

  merging(other: ConfigurablePreferences): AudioPreferences {
    const audioOther = other as IAudioPreferences;
    return new AudioPreferences({
      volume: audioOther.volume ?? this.volume,
      playbackRate: audioOther.playbackRate ?? this.playbackRate,
      preservePitch: audioOther.preservePitch ?? this.preservePitch,
      skipBackwardInterval: audioOther.skipBackwardInterval ?? this.skipBackwardInterval,
      skipForwardInterval: audioOther.skipForwardInterval ?? this.skipForwardInterval,
      pollInterval: audioOther.pollInterval ?? this.pollInterval,
      autoPlay: audioOther.autoPlay ?? this.autoPlay,
      enableMediaSession: audioOther.enableMediaSession ?? this.enableMediaSession,
    });
  }
}
