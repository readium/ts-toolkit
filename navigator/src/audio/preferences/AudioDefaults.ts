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
    this.volume = defaults.volume ?? 1.0;
    this.playbackRate = defaults.playbackRate ?? 1.0;
    this.preservePitch = defaults.preservePitch ?? true;
    this.skipBackwardInterval = defaults.skipBackwardInterval ?? 30;
    this.skipForwardInterval = defaults.skipForwardInterval ?? 30;
    this.pollInterval = defaults.pollInterval ?? 1000;
    this.autoPlay = defaults.autoPlay ?? true;
    this.enableMediaSession = defaults.enableMediaSession ?? true;
  }
}
