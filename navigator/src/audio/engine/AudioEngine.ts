/**
 * Initial state of the audio engine playback.
 */
export interface PlaybackState {
    /**
     * The current time of the audio resource.
     */
    currentTime: number;

    /**
     * The duration of the audio resource.
     */
    duration: number;

    /**
     * The volume of the audio resource.
     */
    volume: number;
}

/**
 * Playback interface for an audio engine state
 * @state The initial [PlaybackState].
 * @playWhenReady Indicates if the navigator should play as soon as the state is Ready.
 * @index Index of the reading order item currently being played.
 * @offset Position of the playback in the current item.
 * @buffered Position in the current item until which the content is buffered.
 * 
 */
export interface Playback {
    state: PlaybackState;
    playWhenReady: boolean;
    index: number;
    offset?: number;
    buffered?: number;
}

/**
 * An audio engine that plays audio resources from a publication.
 * @playback - The current [Playback] state.
*/
export interface AudioEngine {
    /**
     * The current playback state.
     */
    playback: Playback;

    /**
     * Loads the audio resource at the given URL.
     * @param url The URL of the audio resource.
     */
    loadAudio(url: string): void;
    
    /**
     * Adds an event listener to the audio engine.
     * @param event The event name to listen.
     * @param callback Callback function to be called when the event is triggered.
     */
    on(event: string, callback: (data: any) => void): void;
    
    /**
     * Removes an event listener from the audio engine.
     * @param event The event name to remove the listener.
     * @param callback Callback function to be removed.
     */
    off(event: string, callback: (data: any) => void): void;
    
    /**
     * Sets the media element for playback, enabling use of preloaded elements from the pool.
     * @param element The HTML audio element to use for playback.
     */
    setMediaElement(element: HTMLAudioElement): void;
    
    /**
     * Plays the current audio resource.
     */
    play(): void;

    /**
     * Pauses the currently playing audio resource.
     */
    pause(): void;
    
    /**
     * Stops the currently playing audio resource.
     */
    stop(): void;
    
    /**
     * Skips [duration] either forward or backward if [duration] is negative.
     */
    skip(duration: number): void;
    
    /**
     * Returns the duration of the audio resource.
     */
    duration(): number;

    /**
     * Sets the playback rate of the audio resource.
     * @param rate The playback rate to set.
     * @param preservePitch Whether to preserve pitch when changing playback rate.
     */
    setPlaybackRate(rate: number, preservePitch: boolean): void;
    
    /**
     * Returns whether the audio resource is currently playing.
     */
    isPlaying(): boolean;
    
    /**
     * Returns whether the audio resource is currently paused.
     */
    isPaused(): boolean;
    
    /**
     * Returns the HTML media element used for playback.
     */
    getMediaElement(): HTMLMediaElement;
    
    /**
     * Returns whether the audio resource is currently stopped.
     */
    isStopped(): boolean;
    
    /**
     * Returns whether the audio resource is currently loading.
     */
    isLoading(): boolean;
    
    /**
     * Returns whether the audio resource is currently loaded.
     */
    isLoaded(): boolean;
    
    /**
     * Returns whether the audio resource is currently ended.
     */
    isEnded(): boolean;
    
    /**
     * Returns whether the audio resource is currently muted.
     */
    isMuted(): boolean;
    
}