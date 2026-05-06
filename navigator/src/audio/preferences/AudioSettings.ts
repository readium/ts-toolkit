import { AudioPreferences } from "./AudioPreferences.ts";
import { AudioDefaults } from "./AudioDefaults.ts";
import { ConfigurableSettings } from "../../preferences/Configurable.ts";

export interface IAudioSettings extends ConfigurableSettings {
  volume: number;
  playbackRate: number;
  preservePitch: boolean;
  skipBackwardInterval: number;
  skipForwardInterval: number;
  pollInterval: number;
  autoPlay: boolean;
  enableMediaSession: boolean;
}

export class AudioSettings implements IAudioSettings, ConfigurableSettings {
  public readonly volume: number;
  public readonly playbackRate: number;
  public readonly preservePitch: boolean;
  public readonly skipBackwardInterval: number;
  public readonly skipForwardInterval: number;
  public readonly pollInterval: number;
  public readonly autoPlay: boolean;
  public readonly enableMediaSession: boolean;

  constructor(preferences: AudioPreferences, defaults: AudioDefaults) {
    this.volume = preferences.volume ?? defaults.volume;
    this.playbackRate = preferences.playbackRate ?? defaults.playbackRate;
    this.preservePitch = preferences.preservePitch ?? defaults.preservePitch;
    this.skipBackwardInterval = preferences.skipBackwardInterval ?? defaults.skipBackwardInterval;
    this.skipForwardInterval = preferences.skipForwardInterval ?? defaults.skipForwardInterval;
    this.pollInterval = preferences.pollInterval ?? defaults.pollInterval;
    this.autoPlay = preferences.autoPlay ?? defaults.autoPlay;
    this.enableMediaSession = preferences.enableMediaSession ?? defaults.enableMediaSession;
  }
}
