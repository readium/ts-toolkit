import { Link, Locator, LocatorLocations, Publication } from "@readium/shared";
import { MediaNavigator } from "../Navigator";
import { Configurable, ConfigurablePreferences } from "../preferences";
import { WebAudioEngine, PlaybackState } from "./engine";
import { 
    AudioPreferences, 
    AudioDefaults, 
    AudioSettings,
    AudioPreferencesEditor
} from "./preferences";
import { AudioPoolManager } from "./AudioPoolManager";

export interface AudioNavigatorListeners {
    trackLoaded?: (media: HTMLMediaElement) => void;
    positionChanged?: (locator: Locator) => void;
    onError?: (error: any, locator: Locator) => void;
    onEnded?: (locator: Locator) => void;
    onPlay?: (locator: Locator) => void;
    onPause?: (locator: Locator) => void;
    onLoadedMetadata?: (duration: number) => void;
    onBuffering?: (isBuffering: boolean) => void;
}

export interface AudioNavigatorConfiguration {
    preferences: AudioPreferences;
    defaults: AudioDefaults;
    audioContext?: AudioContext;
}

export class AudioNavigator extends MediaNavigator implements Configurable<AudioSettings, ConfigurablePreferences> {
    private readonly pub: Publication;
    private lastPositionChangeTime: number = 0;
    private listeners: AudioNavigatorListeners;
    private currentLocation!: Locator;

    private _preferences: AudioPreferences;
    private _defaults: AudioDefaults;
    private _settings: AudioSettings;
    private _preferencesEditor: AudioPreferencesEditor | null = null;
    private pool: AudioPoolManager;

    constructor(publication: Publication, listeners: AudioNavigatorListeners, initialPosition?: Locator, configuration: AudioNavigatorConfiguration = { 
        preferences: new AudioPreferences(), 
        defaults: new AudioDefaults() 
    }) {
        super();
        this.pub = publication;
        
        this._preferences = new AudioPreferences(configuration.preferences);
        this._defaults = new AudioDefaults(configuration.defaults);
        this._settings = new AudioSettings(this._preferences, this._defaults);
        this.listeners = listeners;

        // Initialize currentLocation from initialPosition or default
        if (initialPosition) {
            this.currentLocation = initialPosition;
        } else {
            // Default to first track at time 0
            const firstLink = this.pub.readingOrder.items[0];
            this.currentLocation = new Locator({
                href: firstLink.href,
                type: firstLink.type || "audio/mpeg",
                title: firstLink.title,
                locations: new LocatorLocations({
                    position: 0,
                    progression: 0,
                    otherLocations: new Map([['time', 0]])
                })
            });
        }

        // Create playback state from currentLocation
        const trackIndex = this.currentLocation.locations?.position || 0;
        const currentTime = this.currentLocation.locations?.otherLocations?.get('time') || 0;
        
        const playback = {
            state: {
                currentTime,
                duration: 0, // Will be set when media loads
                volume: this._settings.volume
            } as PlaybackState,
            playWhenReady: false,
            index: trackIndex
        };

        const audioContext: AudioContext = configuration.audioContext || new AudioContext();

        const audioEngine = new WebAudioEngine({ playback, audioContext });

        this.pool = new AudioPoolManager(audioEngine);

        this.setupEventListeners();
        if (this._settings.enableMediaSession) {
            this.setupMediaSession();
        }
    }

    get settings(): AudioSettings {
        return this._settings;
    }

    get preferencesEditor(): AudioPreferencesEditor {
        if (this._preferencesEditor === null) {
            this._preferencesEditor = new AudioPreferencesEditor(this._preferences, this.settings);
        }
        return this._preferencesEditor;
    }

    async submitPreferences(preferences: AudioPreferences) {
        this._preferences = this._preferences.merging(preferences) as AudioPreferences;
        this.applyPreferences();
    }

    private applyPreferences(): void {
        const oldSettings = this._settings;
        this._settings = new AudioSettings(this._preferences, this._defaults);
        
        if (this._preferencesEditor !== null) {
            this._preferencesEditor = new AudioPreferencesEditor(this._preferences, this.settings);
        }

        // Apply volume preference
        this.pool.audioEngine.playback.state.volume = this._settings.volume;

        // Apply playback rate with preservePitch preference
        this.pool.audioEngine.setPlaybackRate(this._settings.playbackRate, this._settings.preservePitch);
        
        if (this._settings.enableMediaSession && !oldSettings.enableMediaSession) {
            this.setupMediaSession();
        } else if (!this._settings.enableMediaSession && oldSettings.enableMediaSession) {
            this.destroyMediaSession();
        }
    }

    get publication(): Publication {
        return this.pub;
    }

    get currentLocator(): Locator {
        return this.currentLocation;
    }

    get isPlaying(): boolean {
        return this.pool.audioEngine.isPlaying();
    }

    get isPaused(): boolean {
        return this.pool.audioEngine.isPaused();
    }

    get duration(): number {
        return this.pool.audioEngine.duration();
    }

    get currentTime(): number {
        return this.pool.audioEngine.playback.state.currentTime;
    }

    private createLocator(trackIndex: number, timestamp: number): Locator {
        const link = this.pub.readingOrder.items[trackIndex];
        if (!link) {
            throw new Error(`Invalid track index: ${trackIndex}`);
        }

        const duration = this.pool.audioEngine.duration();
        return new Locator({
            href: link.href,
            type: link.type || "audio/mpeg",
            title: link.title,
            locations: new LocatorLocations({
                progression: duration && duration > 0 ? timestamp / duration : 0,
                position: trackIndex,
                otherLocations: new Map([['time', timestamp]])
            })
        });
    }

    private setupEventListeners(): void {
        // Listen to audio engine events and emit abstracted events
        this.pool.audioEngine.on("canplaythrough", () => {
            this.listeners.trackLoaded?.(this.pool.audioEngine.getMediaElement());
        });

        this.pool.audioEngine.on("timeupdate", () => {
            // Update currentLocation with current time and progression
            const currentTime = this.currentTime;
            const duration = this.duration;
            const progression = duration && duration > 0 ? currentTime / duration : 0;
            
            this.currentLocation = this.currentLocation.copyWithLocations(new LocatorLocations({
                position: this.currentLocation.locations?.position,
                progression,
                otherLocations: new Map([['time', currentTime]])
            }));

            // Throttle positionChanged emissions to pollInterval rate
            const now = Date.now();
            if (now - this.lastPositionChangeTime >= this._settings.pollInterval) {
                this.listeners.positionChanged?.(this.currentLocator);
                this.lastPositionChangeTime = now;
            }
        });

        this.pool.audioEngine.on("error", (error: any) => {
            this.listeners.onError?.(error, this.currentLocator);
        });

        this.pool.audioEngine.on("ended", () => {
            // Update location to mark progression as 1 at end
            this.currentLocation = this.currentLocation.copyWithLocations(new LocatorLocations({
                position: this.currentLocation.locations?.position,
                progression: 1,
                otherLocations: new Map([['time', this.duration]])
            }));

            this.listeners.onEnded?.(this.currentLocator);
            if (this._settings.autoPlay) {
                this.goForward(false, () => {});
                this.play();
            }
        });

        this.pool.audioEngine.on("play", () => {
            this.listeners.onPlay?.(this.currentLocator);
        });

        this.pool.audioEngine.on("pause", () => {
            this.listeners.onPause?.(this.currentLocator);
        });

        // Navigator-specific event handling for events it can control
        this.pool.audioEngine.on("stalled", () => this.handleStalled());
        this.pool.audioEngine.on("emptied", () => this.handleEmptied());
        this.pool.audioEngine.on("suspend", () => this.handleSuspend());
        this.pool.audioEngine.on("waiting", () => this.handleWaiting());
        this.pool.audioEngine.on("loadedmetadata", () => this.handleLoadedMetadata());
        this.pool.audioEngine.on("seeked", () => this.handleSeeked());
    }

    private setupMediaSession(): void {
        if ("mediaSession" in navigator) {
            const currentTrackIndex = this.currentLocation.locations?.position || 0;
            const currentTrack = this.pub.readingOrder.items[currentTrackIndex];
            
            navigator.mediaSession.metadata = new MediaMetadata({
                title: currentTrack?.title || `Track ${currentTrackIndex + 1}`,
                artist: this.pub.metadata.authors 
                    ? (this.pub.metadata.authors as any).map((a: any) => a.name).join(", ")
                    : undefined,
                album: this.pub.metadata.title.getTranslation(),
            });

            navigator.mediaSession.setActionHandler("play", () => this.play());
            navigator.mediaSession.setActionHandler("pause", () => this.pause());
            navigator.mediaSession.setActionHandler("previoustrack", () => this.goBackward(false, () => {}));
            navigator.mediaSession.setActionHandler("nexttrack", () => this.goForward(false, () => {}));
            navigator.mediaSession.setActionHandler("seekbackward", (details) => {
                const seekTime = details.seekOffset || 10;
                this.jump(-seekTime);
            });
            navigator.mediaSession.setActionHandler("seekforward", (details) => {
                const seekTime = details.seekOffset || 10;
                this.jump(seekTime);
            });
        }
    }

    // Navigator-specific event handling for events it can control
    private handleStalled(): void {
        this.listeners.onBuffering?.(true);
    }

    private handleEmptied(): void {
        // Reload current track when emptied
        this.reloadCurrentTrack();
    }

    private handleSuspend(): void {
        this.listeners.onBuffering?.(false);
    }

    private handleWaiting(): void {
        this.listeners.onBuffering?.(true);
    }

    private handleLoadedMetadata(): void {
        const duration = this.pool.audioEngine.duration();
        this.listeners.onLoadedMetadata?.(duration);
    }

    private handleSeeked(): void {
        // Trigger positionChanged immediately after seeking completes
        this.listeners.positionChanged?.(this.currentLocator);
    }

    private async waitForAudioReady(): Promise<void> {
        // Wait for the audio to be loaded and ready to play
        return new Promise((resolve) => {
            if (this.pool.audioEngine.isLoaded()) {
                resolve();
                return;
            }

            const onCanPlayThrough = () => {
                this.pool.audioEngine.off("canplaythrough", onCanPlayThrough);
                resolve();
            };

            this.pool.audioEngine.on("canplaythrough", onCanPlayThrough);
        });
    }

    private reloadCurrentTrack(): void {
        try {
            const previousTime = this.currentTime;
            const currentHref = this.currentLocation.href;
            this.pool.audioEngine.loadAudio(currentHref);
            this.seek(previousTime);
            if (this.isPlaying) {
                this.pool.audioEngine.play();
            }
        } catch (error) {
            console.error("Failed to reload current track:", error);
        }
    }

    async go(locator: Locator, _animated: boolean, cb: (ok: boolean) => void): Promise<void> {
        try {
            const trackIndex = locator.locations?.position || 0;
            const time = locator.locations?.otherLocations?.get('time') || 0;

            if (trackIndex < 0 || trackIndex >= this.pub.readingOrder.items.length) {
                cb(false);
                return;
            }

            const href = locator.href.split("#")[0];

            // Determine navigation direction
            const direction: 'forward' | 'backward' = trackIndex >= (this.currentLocation.locations?.position || 0) ? 'forward' : 'backward';

            // Set current audio using the pool
            this.pool.setCurrentAudio(href, this.pub, trackIndex, direction);

            // Update currentLocation
            this.currentLocation = locator.copyWithLocations(locator.locations);

            // Seek to the specific time if needed
            if (time > 0) {
                this.seek(time as number);
            }

            // Wait for audio to be ready before calling callback
            await this.waitForAudioReady();

            // Emit position changed event with current locator for UI updates
            this.listeners.positionChanged?.(this.currentLocator);

            cb(true);
        } catch (error) {
            console.error("Failed to go to locator:", error);
            cb(false);
        }
    }

    async goLink(link: Link, _animated: boolean, cb: (ok: boolean) => void): Promise<void> {
        const trackIndex = this.pub.readingOrder.items.findIndex((item: Link) => item.href === link.href);
        if (trackIndex === -1) {
            cb(false);
            return;
        }

        const locator = this.createLocator(trackIndex, 0);
        await this.go(locator, _animated, cb);
    }

    async goForward(_animated: boolean, cb: (ok: boolean) => void): Promise<void> {
        await this.nextTrack();
        cb(true);
    }

    async goBackward(_animated: boolean, cb: (ok: boolean) => void): Promise<void> {
        await this.previousTrack();
        cb(true);
    }

    // Playback control methods
    play(): void {
        this.pool.audioEngine.play();
    }

    pause(): void {
        this.pool.audioEngine.pause();
    }

    stop(): void {
        this.pool.audioEngine.stop();
    }

    private async nextTrack(): Promise<void> {
        const nextIndex = (this.currentLocation.locations?.position || 0) + 1;
        if (nextIndex < this.pub.readingOrder.items.length) {
            const locator = this.createLocator(nextIndex, 0);
            await this.go(locator, false, () => {});
        }
    }

    private async previousTrack(): Promise<void> {
        const prevIndex = (this.currentLocation.locations?.position || 0) - 1;
        if (prevIndex >= 0) {
            const locator = this.createLocator(prevIndex, 0);
            await this.go(locator, false, () => {});
        }
    }

    seek(time: number): void {
        const currentTime = this.pool.audioEngine.currentTime();
        this.pool.audioEngine.skip(time - currentTime);
    }

    jump(seconds: number): void {
        this.pool.audioEngine.skip(seconds);
    }

    skipForward(): void {
        this.pool.audioEngine.skip(this._settings.skipForwardInterval);
    }

    skipBackward(): void {
        this.pool.audioEngine.skip(-this._settings.skipBackwardInterval);
    }

    get isTrackStart(): boolean {
        const firstTrackIndex = 0;
        const currentPosition = this.currentLocation.locations?.position || 0;
        const currentProgression = this.currentLocation.locations?.progression || 0;
        return currentPosition === firstTrackIndex && currentProgression === 0;
    }

    get isTrackEnd(): boolean {
        const lastTrackIndex = this.pub.readingOrder.items.length - 1;
        const currentPosition = this.currentLocation.locations?.position || 0;
        const currentProgression = this.currentLocation.locations?.progression || 0;
        return currentPosition === lastTrackIndex && currentProgression === 1;
    }

    get canGoBackward(): boolean {
        const firstTrackIndex = 0;
        const currentPosition = this.currentLocation.locations?.position || 0;
        const currentProgression = this.currentLocation.locations?.progression || 0;
        return !(currentPosition === firstTrackIndex && currentProgression === 0);
    }

    get canGoForward(): boolean {
        const lastTrackIndex = this.pub.readingOrder.items.length - 1;
        const currentPosition = this.currentLocation.locations?.position || 0;
        const currentProgression = this.currentLocation.locations?.progression || 0;
        return !(currentPosition === lastTrackIndex && currentProgression === 1);
    }

    private destroyMediaSession(): void {
        if ("mediaSession" in navigator) {
            navigator.mediaSession.metadata = null;
            navigator.mediaSession.setActionHandler("play", null);
            navigator.mediaSession.setActionHandler("pause", null);
            navigator.mediaSession.setActionHandler("previoustrack", null);
            navigator.mediaSession.setActionHandler("nexttrack", null);
            navigator.mediaSession.setActionHandler("seekbackward", null);
            navigator.mediaSession.setActionHandler("seekforward", null);
        }
    }

    destroy(): void {
        // Clean up media session
        this.destroyMediaSession();

        // Clean up pool
        this.pool.destroy();
    }
}
