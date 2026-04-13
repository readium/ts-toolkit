import { 
  ensureBoolean,
  ensureValueInRange,
  ensureNonNegative
} from "../../preferences/guards.ts";
import { 
  volumeRangeConfig,
  playbackRateRangeConfig,
  skipIntervalRangeConfig
} from "../../preferences/Types.ts";

export interface IAudioDefaults {
  volume?: number | null;
  playbackRate?: number | null;
  preservePitch?: boolean | null;
  skipBackwardInterval?: number | null;
  skipForwardInterval?: number | null;
  pollInterval?: number | null;
  autoPlay?: boolean | null;
  enableMediaSession?: boolean | null;
}

export class AudioDefaults {
  public readonly volume: number;
  public readonly playbackRate: number;
  public readonly preservePitch: boolean;
  public readonly skipBackwardInterval: number;
  public readonly skipForwardInterval: number;
  public readonly pollInterval: number;
  public readonly autoPlay: boolean;
  public readonly enableMediaSession: boolean;

  constructor(defaults: IAudioDefaults = {}) {
    this.volume = ensureValueInRange(defaults.volume, volumeRangeConfig.range) ?? 1;
    this.playbackRate = ensureValueInRange(defaults.playbackRate, playbackRateRangeConfig.range) ?? 1;
    this.preservePitch = ensureBoolean(defaults.preservePitch) ?? true;
    this.skipBackwardInterval = ensureValueInRange(defaults.skipBackwardInterval, skipIntervalRangeConfig.range) ?? 10;
    this.skipForwardInterval = ensureValueInRange(defaults.skipForwardInterval, skipIntervalRangeConfig.range) ?? 10;
    this.pollInterval = ensureNonNegative(defaults.pollInterval) ?? 1000;
    this.autoPlay = ensureBoolean(defaults.autoPlay) ?? true;
    this.enableMediaSession = ensureBoolean(defaults.enableMediaSession) ?? true;
  }
}
