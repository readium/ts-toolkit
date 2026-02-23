/* Implements the AudioEngine interface using the Web Audio API. */

import {
    AudioEngine,
    Playback,
  } from "./AudioEngine";
  
  import { Publication } from "@readium/shared";
  import { Locator } from "@readium/shared";
  import { PreservePitchWorklet } from "./PreservePitchWorklet";
  
  type EventCallback = (data: any) => void;
  
  export class WebAudioEngine implements AudioEngine {
    /* Defines the current playback state. */
    public readonly playback: Playback;
    private audioContext: AudioContext;
    private mediaElement: HTMLAudioElement;
    private sourceNode: MediaElementAudioSourceNode | null = null;
    private gainNode: GainNode;
    private listeners: { [event: string]: EventCallback[] } = {};
    private isMutedValue: boolean = false;
    private isPlayingValue: boolean = false;
    private isPausedValue: boolean = false;
    private isLoadingValue: boolean = false;
    private isLoadedValue: boolean = false;
    private isEndedValue: boolean = false;
    private isStoppedValue: boolean = false;
    private worklet: PreservePitchWorklet | null = null;
  
    constructor(values: { playback: Playback; audioContext: AudioContext }) {
      this.playback = values.playback;
      this.audioContext = values.audioContext;
      this.gainNode = this.audioContext?.createGain();
      this.setVolume(this.playback.state.volume); // Default initial volume
  
      // Create an HTML audio element
      this.mediaElement = document.createElement("audio");
      this.mediaElement.crossOrigin = "use-credentials"; // Optional: Handle cross-origin audio files
  
      // Event listeners (to report the client app about some async events)
      this.mediaElement.addEventListener(
        "canplaythrough",
        this.onCanPlayThrough.bind(this)
      );
      this.mediaElement.addEventListener(
        "timeupdate",
        this.onTimeUpdate.bind(this)
      );
      this.mediaElement.addEventListener("error", this.onError.bind(this));
      this.mediaElement.addEventListener("ended", this.onEnded.bind(this));
      this.mediaElement.addEventListener("stalled", this.onStalled.bind(this));
      this.mediaElement.addEventListener("emptied", this.onEmptied.bind(this));
      this.mediaElement.addEventListener("suspend", this.onSuspend.bind(this));
      this.mediaElement.addEventListener("waiting", this.onWaiting.bind(this));
      this.mediaElement.addEventListener("loadedmetadata", this.onLoadedMetadata.bind(this));
      this.mediaElement.addEventListener("seeking", this.onSeeking.bind(this));
      this.mediaElement.addEventListener("seeked", this.onSeeked.bind(this));
  
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
  
    /**
     * Load the audio resource at the given URL.
     * @param url The URL of the audio resource.
     * */
    public loadAudio(url: string): void {
      this.isLoadingValue = true;
      this.mediaElement.src = url;
      this.mediaElement.load();
  
      // Create a new source node only if it doesn't exist
      if (!this.sourceNode) {
        this.sourceNode = new MediaElementAudioSourceNode(this.audioContext, {
          mediaElement: this.mediaElement,
        });
        this.sourceNode.connect(this.gainNode);
        this.gainNode.connect(this.audioContext.destination);
      }
    }

    /**
     * Sets the media element for playback.
     * @param element The HTML audio element to use.
     */
    public setMediaElement(element: HTMLAudioElement): void {
      // Disconnect old source node if it exists
      if (this.sourceNode) {
        this.sourceNode.disconnect();
        this.sourceNode = null;
      }

      // Remove old event listeners from current mediaElement
      this.mediaElement.removeEventListener("canplaythrough", this.onCanPlayThrough.bind(this));
      this.mediaElement.removeEventListener("timeupdate", this.onTimeUpdate.bind(this));
      this.mediaElement.removeEventListener("error", this.onError.bind(this));
      this.mediaElement.removeEventListener("ended", this.onEnded.bind(this));
      this.mediaElement.removeEventListener("stalled", this.onStalled.bind(this));
      this.mediaElement.removeEventListener("emptied", this.onEmptied.bind(this));
      this.mediaElement.removeEventListener("suspend", this.onSuspend.bind(this));
      this.mediaElement.removeEventListener("waiting", this.onWaiting.bind(this));
      this.mediaElement.removeEventListener("loadedmetadata", this.onLoadedMetadata.bind(this));
      this.mediaElement.removeEventListener("seeking", this.onSeeking.bind(this));
      this.mediaElement.removeEventListener("seeked", this.onSeeked.bind(this));

      // Set new media element
      this.mediaElement = element;

      // Add event listeners to new element
      this.mediaElement.addEventListener("canplaythrough", this.onCanPlayThrough.bind(this));
      this.mediaElement.addEventListener("timeupdate", this.onTimeUpdate.bind(this));
      this.mediaElement.addEventListener("error", this.onError.bind(this));
      this.mediaElement.addEventListener("ended", this.onEnded.bind(this));
      this.mediaElement.addEventListener("stalled", this.onStalled.bind(this));
      this.mediaElement.addEventListener("emptied", this.onEmptied.bind(this));
      this.mediaElement.addEventListener("suspend", this.onSuspend.bind(this));
      this.mediaElement.addEventListener("waiting", this.onWaiting.bind(this));
      this.mediaElement.addEventListener("loadedmetadata", this.onLoadedMetadata.bind(this));
      this.mediaElement.addEventListener("seeking", this.onSeeking.bind(this));
      this.mediaElement.addEventListener("seeked", this.onSeeked.bind(this));

      // Create new source node
      this.sourceNode = new MediaElementAudioSourceNode(this.audioContext, {
        mediaElement: this.mediaElement,
      });
      this.sourceNode.connect(this.gainNode);
      this.gainNode.connect(this.audioContext.destination);

      // Check if the element is already loaded
      if (this.mediaElement.readyState >= 4) {
        this.onCanPlayThrough();
      } else {
        this.isLoadingValue = true;
        this.isLoadedValue = false;
      }
    }
  
    // Ensure AudioContext is running
    private async ensureAudioContextRunning() {
      if (this.audioContext.state === "suspended") {
        await this.audioContext.resume();
      }
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
  
    // Used to emit some events like timeupdate or ended
    private emit(event: string, data: any) {
      if (!this.listeners[event]) return;
      this.listeners[event].forEach((callback) => callback(data));
    }
  
    /**
     * Plays the audio resource at the given locator.
     */
    public async playLocator(
      _publication: Publication,
      locator: Locator
    ): Promise<void> {
      const href = locator.href.split("#")[0];
      this.loadAudio(href);
      const time = locator.locations?.otherLocations?.get('time') || 0;
      if (time > 0) {
        this.mediaElement.currentTime = time;
      }
      await this.play();
    }
  
    /**
     * Plays the current audio resource.
     */
    public async play(): Promise<void> {
      await this.ensureAudioContextRunning();
  
      if (this.isPlayingValue) {
        this.stop();
        console.error("Audio is already playing");
        return;
      }
  
      try {
        await this.mediaElement.play();
        this.isPlayingValue = true;
        this.isPausedValue = false;
      } catch (err) {
        console.error("error trying to play media element", err);
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
    }
  
    /**
     * Adjusts the [volume] of the audio resource.
     * @volume The volume to set, in the range [0, 1].
     */
    public setVolume(volume: number): void {
      if (volume < 0) {
        this.gainNode.gain.value = 0;
        this.isMutedValue = true;
        return;
      }
      if (volume > 1) {
        this.setVolume(volume / 100);
        return;
      }
      this.gainNode.gain.value = volume;
    }
  
    /**
     * Skips [seconds] either forward or backward if [seconds] is negative.
     */
    public skip(seconds: number): void {
      if (!this.mediaElement) {
        console.error("Audio not loaded");
        return;
      }
  
      const newTime = this.mediaElement.currentTime + seconds;
      if (newTime < 0) this.mediaElement.currentTime = 0;
      else if (newTime > this.mediaElement.duration)
        this.mediaElement.currentTime = this.mediaElement.duration;
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
          // Fallback to AudioWorklet for pitch preservation
          if (!this.worklet) {
            // Disconnect old source node
            if (this.sourceNode) {
              this.sourceNode.disconnect();
              this.sourceNode = null;
            }
            // Create worklet for pitch preservation
            PreservePitchWorklet.createWorklet({
              ctx: this.audioContext,
              mediaElement: this.mediaElement,
              pitchFactor: 1.0
            }).then(worklet => {
              this.worklet = worklet;
              this.worklet.workletNode!.connect(this.gainNode);
              this.worklet.updatePitchFactor(1 / rate);
            }).catch(err => {
              console.warn("Failed to create preserve pitch worklet", err);
            });
          } else {
            this.worklet.updatePitchFactor(1 / rate);
          }
        }
      } else {
        if (this.worklet) {
          // Disconnect worklet
          this.worklet.destroy();
          this.worklet = null;
          // Reconnect source node
          this.sourceNode = new MediaElementAudioSourceNode(this.audioContext, { mediaElement: this.mediaElement });
          this.sourceNode.connect(this.gainNode);
        }
        // playbackRate already set
      }
    }

    /**
     * Returns the HTML media element used for playback.
     */
    public getMediaElement(): HTMLMediaElement {
      return this.mediaElement;
    }
  }
  