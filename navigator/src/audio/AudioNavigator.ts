import { Link, Locator, LocatorLocations, Publication } from "@readium/shared";
import { MediaNavigator } from "../Navigator";
import { Configurable, ConfigurablePreferences } from "../preferences";
import { WebAudioEngine, PlaybackState } from "./engine";
import {
    AudioPreferences,
    AudioDefaults,
    AudioSettings,
    AudioPreferencesEditor,
    IAudioPreferences,
    IAudioDefaults
} from "./preferences";
import { AudioPoolManager } from "./AudioPoolManager";

export interface AudioNavigatorListeners {
    trackLoaded: (media: HTMLMediaElement) => void;
    positionChanged: (locator: Locator) => void;
    error: (error: any, locator: Locator) => void;
    trackEnded: (locator: Locator) => void;
    play: (locator: Locator) => void;
    pause: (locator: Locator) => void;
    metadataLoaded: (duration: number) => void;
    stalled: (isStalled: boolean) => void;
    seeking: (isSeeking: boolean) => void;
}

export interface AudioNavigatorConfiguration {
    preferences: IAudioPreferences;
    defaults: IAudioDefaults;
}

export class AudioNavigator extends MediaNavigator implements Configurable<AudioSettings, ConfigurablePreferences> {
    private readonly pub: Publication;
    private positionPollInterval: ReturnType<typeof setInterval> | null = null;
    private navigationId: number = 0;
    private listeners: AudioNavigatorListeners;
    private currentLocation!: Locator;

    private _preferences: AudioPreferences;
    private _defaults: AudioDefaults;
    private _settings: AudioSettings;
    private _preferencesEditor: AudioPreferencesEditor | null = null;
    private pool: AudioPoolManager;

    constructor(publication: Publication, listeners: AudioNavigatorListeners, initialPosition?: Locator, configuration: AudioNavigatorConfiguration = {
        preferences: {},
        defaults: {}
    }) {
        super();
        this.pub = publication;

        this._preferences = new AudioPreferences(configuration.preferences);
        this._defaults = new AudioDefaults(configuration.defaults);
        this._settings = new AudioSettings(this._preferences, this._defaults);
        this.listeners = listeners;

        if (initialPosition) {
            this.currentLocation = this.ensureLocatorLocations(initialPosition);
        } else {
            const firstLink = this.pub.readingOrder.items[0];
            this.currentLocation = new Locator({
                href: firstLink.href,
                type: firstLink.type || "audio/mpeg",
                title: firstLink.title,
                locations: new LocatorLocations({
                    position: 0,
                    progression: 0,
                    totalProgression: 0,
                    fragments: ["t=0"]
                })
            });
        }

        const initialHref = this.currentLocation.href.split("#")[0];
        const trackIndex = this.hrefToTrackIndex(initialHref);
        const initialTime = this.currentLocation.locations?.time() || 0;

        const audioEngine = new WebAudioEngine({
            playback: {
                state: {
                    currentTime: initialTime,
                    duration: 0,
                    volume: this._settings.volume
                } as PlaybackState,
                playWhenReady: false,
                index: trackIndex
            }
        });

        this.pool = new AudioPoolManager(audioEngine);
        this.setupEventListeners();

        if (this._settings.enableMediaSession) {
            this.setupMediaSession();
        }

        this.pool.setCurrentAudio(initialHref, this.pub, trackIndex, "forward");

        // Load and seek to initial position, then notify consumer.
        // No cancellation needed here — the constructor runs once.
        this.waitForLoadedAndSeeked(initialTime)
            .then(() => {
                this.listeners.trackLoaded(this.pool.audioEngine.getMediaElement());
                this.listeners.positionChanged(this.currentLocator);
            })
            .catch(() => {
                // Error already forwarded via the error event listener.
            });
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

        this.pool.audioEngine.playback.state.volume = this._settings.volume;
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

    private ensureLocatorLocations(locator: Locator): Locator {
        return new Locator({
            ...locator,
            locations: locator.locations instanceof LocatorLocations
                ? locator.locations
                : locator.locations
                    ? new LocatorLocations(locator.locations)
                    : undefined
        });
    }

    /** Resolves a bare href (no fragment) to its index in the reading order. Returns -1 if not found. */
    private hrefToTrackIndex(href: string): number {
        const bare = href.split("#")[0];
        return this.pub.readingOrder.items.findIndex(item => item.href === bare);
    }

    /** Current track index derived from the current location's href. */
    private currentTrackIndex(): number {
        return this.hrefToTrackIndex(this.currentLocation.href);
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
        return this.pool.audioEngine.currentTime();
    }

    private createLocator(trackIndex: number, timestamp: number): Locator {
        const link = this.pub.readingOrder.items[trackIndex];
        if (!link) throw new Error(`Invalid track index: ${trackIndex}`);

        const duration = this.pool.audioEngine.duration();
        return new Locator({
            href: link.href,
            type: link.type || "audio/mpeg",
            title: link.title,
            locations: new LocatorLocations({
                progression: duration > 0 ? timestamp / duration : 0,
                position: trackIndex,
                fragments: [`t=${timestamp}`]
            })
        });
    }

    /**
     * Waits for the current audio to be ready to play, then seeks to seekTime if > 0.
     * Rejects if an error event fires before the audio is ready.
     * When navId is provided, skips the seek if that navigation has been superseded.
     */
    private waitForLoadedAndSeeked(seekTime: number, navId?: number): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            const proceed = () => {
                if (navId !== undefined && navId !== this.navigationId) {
                    resolve();
                    return;
                }
                if (seekTime <= 0) {
                    resolve();
                    return;
                }
                const onSeeked = () => {
                    this.pool.audioEngine.off("seeked", onSeeked);
                    resolve();
                };
                this.pool.audioEngine.on("seeked", onSeeked);
                this.seek(seekTime);
            };

            if (this.pool.audioEngine.isLoaded()) {
                proceed();
                return;
            }

            const onReady = () => {
                this.pool.audioEngine.off("canplaythrough", onReady);
                this.pool.audioEngine.off("error", onError);
                proceed();
            };
            const onError = (err: any) => {
                this.pool.audioEngine.off("canplaythrough", onReady);
                this.pool.audioEngine.off("error", onError);
                reject(err);
            };

            this.pool.audioEngine.on("canplaythrough", onReady);
            this.pool.audioEngine.on("error", onError);
        });
    }

    private setupEventListeners(): void {
        this.pool.audioEngine.on("error", (error: any) => {
            this.listeners.error(error, this.currentLocator);
        });

        this.pool.audioEngine.on("ended", async () => {
            this.stopPositionPolling();
            this.currentLocation = this.currentLocation.copyWithLocations(new LocatorLocations({
                position: this.currentTrackIndex(),
                progression: 1,
                fragments: [`t=${this.duration}`]
            }));
            this.listeners.trackEnded(this.currentLocator);
            if (this._settings.autoPlay && this.canGoForward) {
                await this.goForward(false, () => {});
                this.play();
            }
        });

        this.pool.audioEngine.on("play", () => {
            this.startPositionPolling();
            this.listeners.play(this.currentLocator);
        });

        this.pool.audioEngine.on("playing", () => {
            this.listeners.stalled(false);
        });

        this.pool.audioEngine.on("pause", () => {
            this.stopPositionPolling();
            this.listeners.pause(this.currentLocator);
        });

        this.pool.audioEngine.on("seeked", () => {
            this.listeners.seeking(false);
            if (!this.isPlaying) {
                const currentTime = this.currentTime;
                const duration = this.duration;
                const progression = duration > 0 ? currentTime / duration : 0;
                this.currentLocation = this.currentLocation.copyWithLocations(new LocatorLocations({
                    position: this.currentTrackIndex(),
                    progression,
                    fragments: [`t=${currentTime}`]
                }));
                this.listeners.positionChanged(this.currentLocation);
            }
        });

        this.pool.audioEngine.on("seeking", () => this.listeners.seeking(true));
        this.pool.audioEngine.on("waiting", () => this.listeners.seeking(true));
        this.pool.audioEngine.on("stalled", () => this.listeners.stalled(true));
        
        this.pool.audioEngine.on("loadedmetadata", () => {
            this.listeners.metadataLoaded(this.pool.audioEngine.duration());
        });
    }

    private setupMediaSession(): void {
        if (!("mediaSession" in navigator)) return;
        navigator.mediaSession.setActionHandler("play", () => this.play());
        navigator.mediaSession.setActionHandler("pause", () => this.pause());
        navigator.mediaSession.setActionHandler("previoustrack", () => this.goBackward(false, () => {}));
        navigator.mediaSession.setActionHandler("nexttrack", () => this.goForward(false, () => {}));
        navigator.mediaSession.setActionHandler("seekbackward", (details) => this.jump(-(details.seekOffset || 10)));
        navigator.mediaSession.setActionHandler("seekforward", (details) => this.jump(details.seekOffset || 10));
        this.updateMediaSessionMetadata();
    }

    private updateMediaSessionMetadata(): void {
        if (!("mediaSession" in navigator)) return;
        const trackIndex = this.currentTrackIndex();
        const track = this.pub.readingOrder.items[trackIndex];
        navigator.mediaSession.metadata = new MediaMetadata({
            title: track?.title || `Track ${trackIndex + 1}`,
            artist: this.pub.metadata.authors
                ? this.pub.metadata.authors.items.map((a) => a.name.getTranslation()).join(", ")
                : undefined,
            album: this.pub.metadata.title.getTranslation(),
        });
    }

    private startPositionPolling(): void {
        this.stopPositionPolling();
        this.positionPollInterval = setInterval(() => {
            const currentTime = this.currentTime;
            const duration = this.duration;
            const progression = duration > 0 ? currentTime / duration : 0;
            this.currentLocation = this.currentLocation.copyWithLocations(new LocatorLocations({
                position: this.currentTrackIndex(),
                progression,
                fragments: [`t=${currentTime}`]
            }));
            this.listeners.positionChanged(this.currentLocation);
        }, this._settings.pollInterval);
    }

    private stopPositionPolling(): void {
        if (this.positionPollInterval !== null) {
            clearInterval(this.positionPollInterval);
            this.positionPollInterval = null;
        }
    }

    async go(locator: Locator, _animated: boolean, cb: (ok: boolean) => void): Promise<void> {
        try {
            locator = this.ensureLocatorLocations(locator);
            const href = locator.href.split("#")[0];
            const trackIndex = this.hrefToTrackIndex(href);
            const time = locator.locations?.time() || 0;

            if (trackIndex === -1) {
                cb(false);
                return;
            }

            const id = ++this.navigationId;
            const direction: "forward" | "backward" = trackIndex >= this.currentTrackIndex() ? "forward" : "backward";
            const wasPlaying = this.isPlaying;

            this.stopPositionPolling();
            this.pool.setCurrentAudio(href, this.pub, trackIndex, direction);
            this.currentLocation = locator.copyWithLocations(locator.locations);

            await this.waitForLoadedAndSeeked(time, id);

            if (id !== this.navigationId) return;

            this.listeners.trackLoaded(this.pool.audioEngine.getMediaElement());
            this.listeners.positionChanged(this.currentLocator);

            if (this._settings.enableMediaSession) {
                this.updateMediaSessionMetadata();
            }

            if (wasPlaying) this.play();

            cb(true);
        } catch (error) {
            console.error("Failed to go to locator:", error);
            cb(false);
        }
    }

    async goLink(link: Link, _animated: boolean, cb: (ok: boolean) => void): Promise<void> {
        const trackIndex = this.hrefToTrackIndex(link.href);
        if (trackIndex === -1) {
            cb(false);
            return;
        }
        const locator = this.createLocator(trackIndex, 0);
        await this.go(locator, _animated, cb);
    }

    async goForward(_animated: boolean, cb: (ok: boolean) => void): Promise<void> {
        if (!this.canGoForward) { cb(false); return; }
        await this.nextTrack();
        cb(true);
    }

    async goBackward(_animated: boolean, cb: (ok: boolean) => void): Promise<void> {
        if (!this.canGoBackward) { cb(false); return; }
        await this.previousTrack();
        cb(true);
    }

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
        const nextIndex = this.currentTrackIndex() + 1;
        if (nextIndex < this.pub.readingOrder.items.length) {
            const locator = this.createLocator(nextIndex, 0);
            await this.go(locator, false, () => {});
        }
    }

    private async previousTrack(): Promise<void> {
        const prevIndex = this.currentTrackIndex() - 1;
        if (prevIndex >= 0) {
            const locator = this.createLocator(prevIndex, 0);
            await this.go(locator, false, () => {});
        }
    }

    seek(time: number): void {
        this.pool.audioEngine.skip(time - this.pool.audioEngine.currentTime());
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
        return this.currentTrackIndex() === 0
            && (this.currentLocation.locations?.time() || 0) === 0;
    }

    get isTrackEnd(): boolean {
        const trackIndex = this.currentTrackIndex();
        if (trackIndex !== this.pub.readingOrder.items.length - 1) return false;
        const progression = this.currentLocation.locations?.progression;
        if (progression !== undefined) return progression >= 1;
        const link = this.pub.readingOrder.items[trackIndex];
        const duration = this.duration || link?.duration || 0;
        return duration > 0 && (this.currentLocation.locations?.time() ?? 0) >= duration;
    }

    get canGoBackward(): boolean {
        return this.currentTrackIndex() > 0;
    }

    get canGoForward(): boolean {
        return this.currentTrackIndex() < this.pub.readingOrder.items.length - 1;
    }

    private destroyMediaSession(): void {
        if (!("mediaSession" in navigator)) return;
        navigator.mediaSession.metadata = null;
        navigator.mediaSession.setActionHandler("play", null);
        navigator.mediaSession.setActionHandler("pause", null);
        navigator.mediaSession.setActionHandler("previoustrack", null);
        navigator.mediaSession.setActionHandler("nexttrack", null);
        navigator.mediaSession.setActionHandler("seekbackward", null);
        navigator.mediaSession.setActionHandler("seekforward", null);
    }

    destroy(): void {
        this.stopPositionPolling();
        this.destroyMediaSession();
        this.pool.destroy();
    }
}
