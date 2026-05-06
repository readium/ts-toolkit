/* Implements the AudioEngine interface using the Web Audio API. */

import {
  AudioEngine,
  Playback,
} from "./AudioEngine.ts";
import { PreservePitchWorklet } from "./PreservePitchWorklet.ts";

type EventCallback = (data: any) => void;

export class WebAudioEngine implements AudioEngine {
  /* Defines the current playback state. */
  public readonly playback: Playback;
  private audioContext: AudioContext | null = null;
  private mediaElement: HTMLAudioElement;
  private sourceNode: MediaElementAudioSourceNode | null = null;
  private gainNode: GainNode | null = null;
  private listeners: { [event: string]: EventCallback[] } = {};
  private isMutedValue: boolean = false;
  private isPlayingValue: boolean = false;
  private isPausedValue: boolean = false;
  private isLoadingValue: boolean = false;
  private isLoadedValue: boolean = false;
  private isEndedValue: boolean = false;
  private isStoppedValue: boolean = false;
  private worklet: PreservePitchWorklet | null = null;
  private webAudioActive: boolean = false;

  private readonly boundOnCanPlayThrough = this.onCanPlayThrough.bind(this);
  private readonly boundOnTimeUpdate = this.onTimeUpdate.bind(this);
  private readonly boundOnError = this.onError.bind(this);
  private readonly boundOnEnded = this.onEnded.bind(this);
  private readonly boundOnStalled = this.onStalled.bind(this);
  private readonly boundOnEmptied = this.onEmptied.bind(this);
  private readonly boundOnSuspend = this.onSuspend.bind(this);
  private readonly boundOnWaiting = this.onWaiting.bind(this);
  private readonly boundOnLoadedMetadata = this.onLoadedMetadata.bind(this);
  private readonly boundOnSeeking = this.onSeeking.bind(this);
  private readonly boundOnSeeked = this.onSeeked.bind(this);
  private readonly boundOnPlay = this.onPlay.bind(this);
  private readonly boundOnPlaying = this.onPlaying.bind(this);
  private readonly boundOnPause = this.onPause.bind(this);
  private readonly boundOnProgress = this.onProgress.bind(this);

  constructor(values: { playback: Playback }) {
    this.playback = values.playback;

    // crossOrigin is set lazily in activateWebAudio() only when the worklet is needed
    this.mediaElement = document.createElement("audio");

    // Event listeners (to report the client app about some async events)
    this.mediaElement.addEventListener("canplaythrough", this.boundOnCanPlayThrough);
    this.mediaElement.addEventListener("timeupdate", this.boundOnTimeUpdate);
    this.mediaElement.addEventListener("error", this.boundOnError);
    this.mediaElement.addEventListener("ended", this.boundOnEnded);
    this.mediaElement.addEventListener("stalled", this.boundOnStalled);
    this.mediaElement.addEventListener("emptied", this.boundOnEmptied);
    this.mediaElement.addEventListener("suspend", this.boundOnSuspend);
    this.mediaElement.addEventListener("waiting", this.boundOnWaiting);
    this.mediaElement.addEventListener("loadedmetadata", this.boundOnLoadedMetadata);
    this.mediaElement.addEventListener("seeking", this.boundOnSeeking);
    this.mediaElement.addEventListener("seeked", this.boundOnSeeked);
    this.mediaElement.addEventListener("play", this.boundOnPlay);
    this.mediaElement.addEventListener("playing", this.boundOnPlaying);
    this.mediaElement.addEventListener("pause", this.boundOnPause);
    this.mediaElement.addEventListener("progress", this.boundOnProgress);

    //Set the start time
    this.mediaElement.currentTime = this.playback.state.currentTime;
  }

  /**
   * Adds an event listener to the audio engine.
   * @param event - event name to be listened.
   * @param callback - callback function to be called when the event is triggered.
   */
  public on(event: string, callback: EventCallback) {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(callback);
  }

  /**
   * Removes an event listener from the audio engine.
   * @param event - event name to be removed from the listeners.
   * @param callback - callback function to be removed.
   */
  public off(event: string, callback: EventCallback) {
    if (!this.listeners[event]) return;
    this.listeners[event] = this.listeners[event].filter(
      (cb) => cb !== callback
    );
  }

  // Ensure AudioContext is running
  private async ensureAudioContextRunning() {
    if (!this.audioContext) {
      this.audioContext = new AudioContext();
    }
    if (this.audioContext.state === "suspended") {
      await this.audioContext.resume();
    }
  }

  private getOrCreateAudioContext(): AudioContext {
    if (!this.audioContext) {
      this.audioContext = new AudioContext();
    }
    return this.audioContext;
  }

  // Event handler for timeupdate
  private onTimeUpdate() {
    // Continuously track the current time of the media element
    // You can update UI elements or perform other tasks here
    this.emit("timeupdate", this.mediaElement.currentTime);
  }

  // Event handler for canplaythrough
  private onCanPlayThrough() {
    this.isLoadingValue = false;
    this.isLoadedValue = true;
    this.emit("canplaythrough", null);
  }

  // Event handler for error
  private onError() {
    console.error("Error loading media element");
    this.emit("error", this.mediaElement.error);
  }

  // Event handle for ended
  private onEnded() {
    this.isPlayingValue = false;
    this.isPausedValue = false;
    this.isEndedValue = true;
    this.emit("ended", null);
  }

  private onStalled(event: Event) {
    this.emit("stalled", event);
  }

  private onEmptied(event: Event) {
    this.emit("emptied", event);
  }

  private onSuspend(event: Event) {
    this.emit("suspend", event);
  }

  private onWaiting(event: Event) {
    this.emit("waiting", event);
  }

  private onLoadedMetadata(event: Event) {
    this.emit("loadedmetadata", event);
  }

  private onSeeking(event: Event) {
    this.emit("seeking", event);
  }

  private onSeeked(event: Event) {
    this.emit("seeked", event);
  }

  private onPlay() {
    this.emit("play", null);
  }

  private onPlaying() {
    this.emit("playing", null);
  }

  private onPause() {
    this.emit("pause", null);
  }

  private onProgress() {
    this.emit("progress", this.mediaElement.seekable);
  }

  // Used to emit some events like timeupdate or ended
  private emit(event: string, data: any) {
    if (!this.listeners[event]) return;
    this.listeners[event].forEach((callback) => callback(data));
  }

  /**
   * Plays the current audio resource.
   */
  public async play(): Promise<void> {
    if (this.isPlayingValue) {
      return;
    }

    try {
      if (this.audioContext) {
        await this.ensureAudioContextRunning();
      }
      await this.mediaElement.play();
      this.isPlayingValue = true;
      this.isPausedValue = false;
      this.isStoppedValue = false;
    } catch (err: any) {
      // AbortError is expected when load() interrupts a pending play() during navigation
      if (err?.name === "AbortError") return;
      console.error("error trying to play media element", err);
      this.emit("error", err);
    }
  }

  /**
   * Pauses the currently playing audio resource.
   */
  public pause(): void {
    this.mediaElement.pause();
    this.isPlayingValue = false;
    this.isPausedValue = true;
  }

  /**
   * Stops the currently playing audio resource.
   */
  public stop(): void {
    // Stop the audio and reset the current time
    this.mediaElement.pause();
    this.mediaElement.currentTime = 0;
    this.isPlayingValue = false;
    this.isPausedValue = false;
    this.isStoppedValue = true;
  }

  /**
   * Adjusts the [volume] of the audio resource.
   * @volume The volume to set, in the range [0, 1].
   */
  public setVolume(volume: number): void {
    const clamped = Math.max(0, Math.min(1, volume));
    if (this.gainNode) {
      // When the Web Audio graph is active, keep the media element at full
      // volume and control level exclusively through the GainNode to avoid
      // double-attenuation (e.g. 0.5 × 0.5 = 0.25).
      this.mediaElement.volume = 1;
      this.gainNode.gain.value = clamped;
    } else {
      this.mediaElement.volume = clamped;
    }
    this.isMutedValue = clamped === 0;
  }

  /**
   * Skips [seconds] either forward or backward if [seconds] is negative.
   */
  public skip(seconds: number): void {
    const duration = this.mediaElement.duration;
    if (!isFinite(duration)) return;

    const newTime = this.mediaElement.currentTime + seconds;
    if (newTime < 0) this.mediaElement.currentTime = 0;
    else if (newTime > duration) this.mediaElement.currentTime = duration;
    else this.mediaElement.currentTime = newTime;
  }

  /**
   * Returns de current time in the audio resource.
   */
  public currentTime(): number {
    return this.mediaElement.currentTime;
  }

  /**
   * Returns the duration in seconds of the current media element resource.
   */
  public duration(): number {
    // Implementation details.
    return this.mediaElement.duration;
  }

  /**
   * Returns whether the audio resource is currently playing.
   */
  public isPlaying(): boolean {
    return this.isPlayingValue;
  }

  /**
   * Returns whether the audio resource is currently paused.
   */
  public isPaused(): boolean {
    return this.isPausedValue;
  }

  /**
   * Returns whether the audio resource is currently stopped.
   */
  public isStopped(): boolean {
    return this.isStoppedValue;
  }

  /**
   * Returns whether the audio resource is currently loading.
   */
  public isLoading(): boolean {
    return this.isLoadingValue;
  }

  /**
   * Returns whether the audio resource is currently loaded.
   */
  public isLoaded(): boolean {
    return this.isLoadedValue;
  }

  /**
   * Returns whether the audio resource is currently ended.
   */
  public isEnded(): boolean {
    return this.isEndedValue;
  }

  /**
   * Returns whether the audio resource is currently muted.
   */
  public isMuted(): boolean {
    return this.isMutedValue;
  }

  /**
   * Sets the playback rate of the audio resource with pitch preservation.
   */
  public setPlaybackRate(rate: number, preservePitch: boolean): void {
    this.mediaElement.playbackRate = rate;
    if (preservePitch) {
      if ('preservesPitch' in this.mediaElement) {
        (this.mediaElement as any).preservesPitch = true;
      } else {
        // Activate Web Audio graph first, then attach the worklet
        this.activateWebAudio().then(() => {
          if (!this.worklet) {
            PreservePitchWorklet.createWorklet({
              ctx: this.getOrCreateAudioContext(),
              pitchFactor: 1.0
            }).then(worklet => {
              // Rewire: sourceNode → workletNode → gainNode
              if (this.sourceNode) this.sourceNode.disconnect();
              this.worklet = worklet;
              this.sourceNode?.connect(this.worklet.workletNode!);
              this.worklet.workletNode!.connect(this.gainNode!);
              this.worklet.updatePitchFactor(1 / rate);
            }).catch(err => {
              console.warn("Failed to create preserve pitch worklet", err);
            });
          } else {
            this.worklet.updatePitchFactor(1 / rate);
          }
        }).catch(err => {
          console.warn("Web Audio unavailable, playing without pitch correction:", err);
        });
      }
    } else {
      // Disable native pitch preservation (mirrors the check in the true branch)
      if ('preservesPitch' in this.mediaElement) {
        (this.mediaElement as any).preservesPitch = false;
      }

      if (this.worklet) {
        this.worklet.destroy();
        this.worklet = null;
        // Restore: sourceNode → gainNode
        if (this.webAudioActive && this.sourceNode) {
          this.sourceNode.disconnect();
          this.sourceNode.connect(this.gainNode!);
        }
      }
    }
  }

  /**
   * Activates the Web Audio graph for the current media element.
   * Sets crossOrigin = "anonymous" and reloads so MediaElementAudioSourceNode can be used.
   * No-ops if Web Audio is already active.
   */
  private async activateWebAudio(): Promise<void> {
    if (this.webAudioActive) return;

    const src = this.mediaElement.src;
    if (!src) return;

    const currentTime = this.mediaElement.currentTime;
    const wasPlaying = this.isPlayingValue;

    if (wasPlaying) {
      this.mediaElement.pause();
      this.isPlayingValue = false;
    }

    this.mediaElement.crossOrigin = "anonymous";
    this.mediaElement.src = src;
    this.mediaElement.load();

    try {
      await new Promise<void>((resolve, reject) => {
        const onReady = () => {
          this.mediaElement.removeEventListener("canplaythrough", onReady);
          this.mediaElement.removeEventListener("error", onFail);
          resolve();
        };
        const onFail = () => {
          this.mediaElement.removeEventListener("canplaythrough", onReady);
          this.mediaElement.removeEventListener("error", onFail);
          reject(new Error("Audio reload with CORS failed — server may not send Access-Control-Allow-Origin"));
        };
        this.mediaElement.addEventListener("canplaythrough", onReady);
        this.mediaElement.addEventListener("error", onFail);
      });
    } catch (err) {
      // Roll back to non-CORS mode so the element remains playable.
      // crossOrigin = "" still maps to "anonymous"; remove the attribute entirely
      // to disable CORS on the reload.
      this.mediaElement.removeAttribute("crossorigin");
      this.mediaElement.src = src;
      this.mediaElement.load();
      if (wasPlaying) {
        await new Promise<void>(resolve => {
          const onReady = () => {
            this.mediaElement.removeEventListener("canplaythrough", onReady);
            resolve();
          };
          this.mediaElement.addEventListener("canplaythrough", onReady);
        });
        this.mediaElement.currentTime = currentTime;
        await this.mediaElement.play();
        this.isPlayingValue = true;
        this.isPausedValue = false;
      } else {
        this.mediaElement.currentTime = currentTime;
      }
      throw err;
    }

    this.mediaElement.currentTime = currentTime;

    this.sourceNode = new MediaElementAudioSourceNode(this.getOrCreateAudioContext(), { mediaElement: this.mediaElement });

    // Create gainNode lazily when Web Audio is activated.
    // Seed its gain from the current element volume, then reset the element to
    // 1.0 so volume isn't applied twice once setVolume routes through the node.
    const audioContext = this.getOrCreateAudioContext();
    this.gainNode = audioContext.createGain();
    this.gainNode.gain.value = this.mediaElement.volume;
    this.mediaElement.volume = 1;
    this.sourceNode.connect(this.gainNode);
    this.gainNode.connect(audioContext.destination);

    this.webAudioActive = true;

    if (wasPlaying) {
      await this.ensureAudioContextRunning();
      await this.mediaElement.play();
      this.isPlayingValue = true;
      this.isPausedValue = false;
    }
  }

  public get isWebAudioActive(): boolean {
    return this.webAudioActive;
  }

  /**
   * Tears down the Web Audio graph and restores the media element to standalone
   * playback. Safe to call even if Web Audio was never activated.
   */
  private tearDownWebAudio(): void {
    if (this.worklet) {
      this.worklet.destroy();
      this.worklet = null;
    }
    if (this.sourceNode) {
      this.sourceNode.disconnect();
      this.sourceNode = null;
    }
    if (this.gainNode) {
      // Restore the volume that was previously managed by the GainNode.
      this.mediaElement.volume = this.gainNode.gain.value;
      this.gainNode.disconnect();
      this.gainNode = null;
    }
    this.webAudioActive = false;
  }

  /**
   * Changes the src of the primary media element without swapping the element.
   * Preserves the RemotePlayback session and all attached event listeners.
   * When the Web Audio graph is active, the new src is loaded with
   * crossOrigin="anonymous". If the CORS request fails (server does not send
   * the required headers), the graph is torn down and the src is reloaded
   * without CORS so playback continues — just without pitch correction.
   */
  public changeSrc(href: string): void {
    if (this.mediaElement.src === href) {
      return;
    }
    this.mediaElement.pause();
    this.isPlayingValue = false;
    this.isPausedValue = false;
    this.isLoadedValue = false;
    this.isLoadingValue = true;
    this.isEndedValue = false;

    if (this.webAudioActive) {
      this.mediaElement.crossOrigin = "anonymous";
      this.mediaElement.src = href;
      this.mediaElement.load();

      const onReady = () => { cleanup(); };
      const onFail = () => {
        cleanup();
        console.warn("CORS reload failed for new track — disabling Web Audio graph:", href);
        this.tearDownWebAudio();
        this.mediaElement.removeAttribute("crossorigin");
        this.mediaElement.src = href;
        this.mediaElement.load();
      };
      const cleanup = () => {
        this.mediaElement.removeEventListener("canplaythrough", onReady);
        this.mediaElement.removeEventListener("error", onFail);
      };
      this.mediaElement.addEventListener("canplaythrough", onReady);
      this.mediaElement.addEventListener("error", onFail);
    } else {
      this.mediaElement.src = href;
      this.mediaElement.load();
    }
  }

  /**
   * Returns the HTML media element used for playback.
   */
  public getMediaElement(): HTMLMediaElement {
    return this.mediaElement;
  }
}
