import { Link, Locator, LocatorLocations, Publication, Timeline, TimelineItem } from "@readium/shared";
import { MediaNavigator, IContentProtectionConfig, IKeyboardPeripheralsConfig } from "../Navigator.ts";
import { Configurable } from "../preferences/Configurable.ts";
import { WebAudioEngine, PlaybackState } from "./engine/index.ts";
import {
    AudioPreferences,
    AudioDefaults,
    AudioSettings,
    AudioPreferencesEditor,
    IAudioPreferences,
    IAudioDefaults
} from "./preferences/index.ts";
import { AudioPoolManager } from "./AudioPoolManager.ts";
import { ContextMenuEvent, KeyboardEventData, SuspiciousActivityEvent } from "@readium/navigator-html-injectables";
import { AudioNavigatorProtector } from "./protection/AudioNavigatorProtector.ts";
import { NAVIGATOR_SUSPICIOUS_ACTIVITY_EVENT } from "../protection/NavigatorProtector.ts";
import { KeyboardPeripherals, NAVIGATOR_KEYBOARD_PERIPHERAL_EVENT } from "../peripherals/KeyboardPeripherals.ts";

export interface AudioMetadata {
    duration: number;
    textTracks: TextTrackList;
    readyState: number;
    networkState: number;
}

export interface AudioNavigatorListeners {
    trackLoaded: (media: HTMLMediaElement) => void;
    positionChanged: (locator: Locator) => void;
    timelineItemChanged: (item: TimelineItem | undefined) => void;
    error: (error: any, locator: Locator) => void;
    trackEnded: (locator: Locator) => void;
    play: (locator: Locator) => void;
    pause: (locator: Locator) => void;
    metadataLoaded: (metadata: AudioMetadata) => void;
    stalled: (isStalled: boolean) => void;
    seeking: (isSeeking: boolean) => void;
    seekable: (seekable: TimeRanges) => void;
    contentProtection: (type: string, data: SuspiciousActivityEvent) => void;
    peripheral: (data: KeyboardEventData) => void;
    contextMenu: (data: ContextMenuEvent) => void;
    remotePlaybackStateChanged: (state: RemotePlaybackState) => void;
}

const defaultListeners = (listeners: Partial<AudioNavigatorListeners>): AudioNavigatorListeners => ({
    trackLoaded: listeners.trackLoaded ?? (() => {}),
    positionChanged: listeners.positionChanged ?? (() => {}),
    timelineItemChanged: listeners.timelineItemChanged ?? (() => {}),
    error: listeners.error ?? (() => {}),
    trackEnded: listeners.trackEnded ?? (() => {}),
    play: listeners.play ?? (() => {}),
    pause: listeners.pause ?? (() => {}),
    metadataLoaded: listeners.metadataLoaded ?? (() => {}),
    stalled: listeners.stalled ?? (() => {}),
    seeking: listeners.seeking ?? (() => {}),
    seekable: listeners.seekable ?? (() => {}),
    contentProtection: listeners.contentProtection ?? (() => {}),
    peripheral: listeners.peripheral ?? (() => {}),
    contextMenu: listeners.contextMenu ?? (() => {}),
    remotePlaybackStateChanged: listeners.remotePlaybackStateChanged ?? (() => {}),
});

export interface IAudioContentProtectionConfig extends IContentProtectionConfig {
    /** Prevents the media element from being cast to remote devices via the Remote Playback API. */
    disableRemotePlayback?: boolean;
}

export interface AudioNavigatorConfiguration {
    preferences: IAudioPreferences;
    defaults: IAudioDefaults;
    contentProtection?: IAudioContentProtectionConfig;
    keyboardPeripherals?: IKeyboardPeripheralsConfig;
}

export class AudioNavigator extends MediaNavigator implements Configurable<AudioSettings, AudioPreferences> {
    private readonly pub: Publication;
    private positionPollInterval: ReturnType<typeof setInterval> | null = null;
    private navigationId: number = 0;
    private _playIntent: boolean = false;
    private listeners: AudioNavigatorListeners;
    private currentLocation!: Locator;

    private _preferences: AudioPreferences;
    private _defaults: AudioDefaults;
    private _settings: AudioSettings;
    private _preferencesEditor: AudioPreferencesEditor | null = null;
    private _mediaSessionEnabled: boolean = false;
    private pool: AudioPoolManager;
    private readonly _navigatorProtector: AudioNavigatorProtector | null = null;
    private _currentTimelineItem: TimelineItem | undefined;
    private readonly _keyboardPeripheralsManager: KeyboardPeripherals | null = null;
    private readonly _suspiciousActivityListener: ((event: Event) => void) | null = null;
    private readonly _keyboardPeripheralListener: ((event: Event) => void) | null = null;
    private readonly _contentProtection: IAudioContentProtectionConfig;
    /** True while a track transition is in progress; suppresses spurious mid-navigation events. */
    private _isNavigating: boolean = false;
    private _isStalled: boolean = false;
    private _stalledWatchdog: ReturnType<typeof setInterval> | null = null;
    private _stalledCheckTime: number = 0;

    constructor(publication: Publication, listeners: AudioNavigatorListeners, initialPosition?: Locator, configuration: AudioNavigatorConfiguration = {
        preferences: {},
        defaults: {}
    }) {
        super();
        this.pub = publication;
        this.listeners = defaultListeners(listeners);

        this._preferences = new AudioPreferences(configuration.preferences);
        this._defaults = new AudioDefaults(configuration.defaults);
        this._settings = new AudioSettings(this._preferences, this._defaults);

        if (publication.readingOrder.items.length === 0) {
            throw new Error("AudioNavigator: publication has an empty reading order");
        }

        if (initialPosition) {
            this.currentLocation = this.ensureLocatorLocations(initialPosition);
        } else {
            const firstLink = this.pub.readingOrder.items[0];
            this.currentLocation = new Locator({
                href: firstLink.href,
                type: firstLink.type || "audio/mpeg",
                title: firstLink.title,
                locations: new LocatorLocations({
                    position: 1,
                    progression: 0,
                    totalProgression: 0,
                    fragments: ["t=0"]
                })
            });
        }

        const initialHref = this.currentLocation.href.split("#")[0];
        const trackIndex = this.hrefToTrackIndex(initialHref);
        if (trackIndex === -1) {
            throw new Error(`AudioNavigator: initial href "${ initialHref }" not found in reading order`);
        }
        const initialTime = this.currentLocation.locations?.time() || 0;

        const audioEngine = new WebAudioEngine({
            playback: {
                state: {
                    currentTime: initialTime,
                    duration: 0,
                } as PlaybackState,
                playWhenReady: false,
                index: trackIndex
            }
        });

        this.pool = new AudioPoolManager(audioEngine, publication, configuration.contentProtection);

        // Initialize content protection
        const contentProtection = configuration.contentProtection || {};
        this._contentProtection = contentProtection;
        const keyboardPeripherals = this.mergeKeyboardPeripherals(
            contentProtection,
            configuration.keyboardPeripherals || []
        );

        if (contentProtection.disableContextMenu ||
            contentProtection.checkAutomation ||
            contentProtection.checkIFrameEmbedding ||
            contentProtection.monitorDevTools ||
            contentProtection.protectPrinting?.disable ||
            contentProtection.disableDragAndDrop ||
            contentProtection.protectCopy) {
            this._navigatorProtector = new AudioNavigatorProtector(contentProtection);
            this._suspiciousActivityListener = (event: Event) => {
                const { type, ...detail } = (event as CustomEvent).detail;
                if (type === "context_menu") {
                    this.listeners.contextMenu(detail as ContextMenuEvent);
                } else {
                    this.listeners.contentProtection(type, detail as SuspiciousActivityEvent);
                }
            };
            window.addEventListener(NAVIGATOR_SUSPICIOUS_ACTIVITY_EVENT, this._suspiciousActivityListener);
        }

        if (keyboardPeripherals.length > 0) {
            this._keyboardPeripheralsManager = new KeyboardPeripherals({ keyboardPeripherals });
            this._keyboardPeripheralListener = (event: Event) => {
                this.listeners.peripheral((event as CustomEvent).detail);
            };
            window.addEventListener(NAVIGATOR_KEYBOARD_PERIPHERAL_EVENT, this._keyboardPeripheralListener);
        }

        this.setupEventListeners();

        this._isNavigating = true;
        this.pool.setCurrentAudio(trackIndex, "forward");

        // applyPreferences() must come after setCurrentAudio() so that the src
        // is already set on the media element when setPlaybackRate() tries to
        // activate the Web Audio graph for the preservePitch polyfill path.
        this.applyPreferences();

        // Load and seek to initial position, then notify consumer.
        // No cancellation needed here — the constructor runs once.
        this.waitForLoadedAndSeeked(initialTime)
            .then(() => {
                this._isNavigating = false;
                this.listeners.trackLoaded(this.pool.audioEngine.getMediaElement());
                this._notifyTimelineChange(this.currentLocator);
                this.listeners.positionChanged(this.currentLocator);
                this._setupRemotePlayback();
            })
            .catch(() => {
                this._isNavigating = false;
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
        this._settings = new AudioSettings(this._preferences, this._defaults);

        if (this._preferencesEditor !== null) {
            this._preferencesEditor = new AudioPreferencesEditor(this._preferences, this.settings);
        }

        this.pool.audioEngine.setVolume(this._settings.volume);
        this.pool.audioEngine.setPlaybackRate(this._settings.playbackRate, this._settings.preservePitch);

        if (this.positionPollInterval !== null) this.startPositionPolling();

        if (this._settings.enableMediaSession && !this._mediaSessionEnabled) {
            this._mediaSessionEnabled = true;
            this.setupMediaSession();
        } else if (!this._settings.enableMediaSession && this._mediaSessionEnabled) {
            this._mediaSessionEnabled = false;
            this.destroyMediaSession();
        }
    }

    get publication(): Publication {
        return this.pub;
    }

    get timeline(): Timeline {
        return this.pub.timeline;
    }

    private _notifyTimelineChange(locator: Locator): void {
        const item = this.pub.timeline.locate(locator);
        if (item !== this._currentTimelineItem) {
            this._currentTimelineItem = item;
            this.listeners.timelineItemChanged(item);
            if (this._settings.enableMediaSession) {
                this.updateMediaSessionMetadata();
            }
        }
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
                position: trackIndex + 1,
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
                position: this.currentTrackIndex() + 1,
                progression: 1,
                fragments: [`t=${this.duration}`]
            }));
            this.listeners.trackEnded(this.currentLocator);
            if (!this.canGoForward) return;
            await this.nextTrack();
            if (this._settings.autoPlay) this.play();
        });

        this.pool.audioEngine.on("play", () => {
            if (this._isNavigating) return;
            this.startPositionPolling();
            this.listeners.play(this.currentLocator);
        });

        this.pool.audioEngine.on("playing", () => {
            if (this._isNavigating) return;
            this._setStalled(false);
        });

        this.pool.audioEngine.on("pause", () => {
            if (this._isNavigating) return;
            this.stopPositionPolling();
            this.listeners.pause(this.currentLocator);
        });

        this.pool.audioEngine.on("seeked", () => {
            if (this._isNavigating) return;
            this.listeners.seeking(false);
            const currentTime = this.currentTime;
            const duration = this.duration;
            const progression = duration > 0 ? currentTime / duration : 0;
            this.currentLocation = this.currentLocation.copyWithLocations(new LocatorLocations({
                position: this.currentTrackIndex() + 1,
                progression,
                fragments: [`t=${currentTime}`]
            }));
            // Always notify on seeked — don't defer to polling — so that a skip
            // crossing a timeline item boundary fires timelineItemChanged immediately
            // regardless of play state. _notifyTimelineChange deduplicates internally.
            this._notifyTimelineChange(this.currentLocation);
            this.listeners.positionChanged(this.currentLocation);
        });

        this.pool.audioEngine.on("seeking", () => { if (!this._isNavigating) this.listeners.seeking(true); });
        this.pool.audioEngine.on("waiting", () => { if (!this._isNavigating) this.listeners.seeking(true); });
        this.pool.audioEngine.on("stalled", () => { if (!this._isNavigating) this._setStalled(true); });
        this.pool.audioEngine.on("canplaythrough", () => { if (!this._isNavigating) this._setStalled(false); });
        this.pool.audioEngine.on("progress", (seekable: TimeRanges) => { if (!this._isNavigating) this.listeners.seekable(seekable); });

        this.pool.audioEngine.on("loadedmetadata", () => {
            const mediaElement = this.pool.audioEngine.getMediaElement();
            const metadata: AudioMetadata = {
                duration: this.pool.audioEngine.duration(),
                textTracks: mediaElement.textTracks,
                readyState: mediaElement.readyState,
                networkState: mediaElement.networkState
            };
            this.listeners.metadataLoaded(metadata);
        });
    }

    private _setStalled(isStalled: boolean): void {
        if (this._isStalled === isStalled) return;
        this._isStalled = isStalled;
        this.listeners.stalled(isStalled);
        if (isStalled) {
            this._stalledCheckTime = this.currentTime;
            this._startStalledWatchdog();
        } else {
            this._stopStalledWatchdog();
        }
    }

    private _startStalledWatchdog(): void {
        this._stalledWatchdog = setInterval(() => {
            if (!this.isPlaying) {
                this._setStalled(false);
                return;
            }
            const t = this.currentTime;
            if (t !== this._stalledCheckTime) {
                this._setStalled(false);
            }
            this._stalledCheckTime = t;
        }, 500);
    }

    private _stopStalledWatchdog(): void {
        if (this._stalledWatchdog !== null) {
            clearInterval(this._stalledWatchdog);
            this._stalledWatchdog = null;
        }
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
        const cover = this.pub.getCover();
        navigator.mediaSession.metadata = new MediaMetadata({
            title: track?.title || `Track ${trackIndex + 1}`,
            artist: this.pub.metadata.authors
                ? this.pub.metadata.authors.items.map((a) => a.name.getTranslation()).join(", ")
                : undefined,
            album: this.pub.metadata.title.getTranslation(),
            artwork: cover ? [{ src: cover.toURL(this.pub.baseURL) ?? cover.href, type: cover.type }] : undefined,
        });
    }

    private startPositionPolling(): void {
        this.stopPositionPolling();
        this.positionPollInterval = setInterval(() => {
            const currentTime = this.currentTime;
            const duration = this.duration;
            const progression = duration > 0 ? currentTime / duration : 0;
            this.currentLocation = this.currentLocation.copyWithLocations(new LocatorLocations({
                position: this.currentTrackIndex() + 1,
                progression,
                fragments: [`t=${currentTime}`]
            }));
            this._notifyTimelineChange(this.currentLocation);
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
            const previousTrackIndex = this.currentTrackIndex();
            const direction: "forward" | "backward" = trackIndex >= previousTrackIndex ? "forward" : "backward";
            const wasPlaying = this.isPlaying || this._playIntent;
            this._playIntent = wasPlaying;

            this._isNavigating = true;
            this.stopPositionPolling();
            this.pool.setCurrentAudio(trackIndex, direction);
            this.currentLocation = locator.copyWithLocations(locator.locations);

            await this.waitForLoadedAndSeeked(time, id);
            this._isNavigating = false;

            if (id !== this.navigationId) {
                cb(false);
                return;
            }

            if (trackIndex !== previousTrackIndex) {
                this.listeners.trackLoaded(this.pool.audioEngine.getMediaElement());
            }
            this._notifyTimelineChange(this.currentLocator);
            this.listeners.positionChanged(this.currentLocator);

            if (this._settings.enableMediaSession) {
                this.updateMediaSessionMetadata();
            }

            if (wasPlaying) this.play();

            cb(true);
        } catch (error) {
            this._isNavigating = false;
            console.error("Failed to go to locator:", error);
            cb(false);
        } finally {
            this._playIntent = false;
        }
    }

    async goLink(link: Link, _animated: boolean, cb: (ok: boolean) => void): Promise<void> {
        const trackIndex = this.hrefToTrackIndex(link.href);
        if (trackIndex === -1) {
            cb(false);
            return;
        }
        const time = link.locator.locations?.time() ?? 0;
        const locator = this.createLocator(trackIndex, time);
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
        if (!this.canGoForward) return;
        const locator = this.createLocator(this.currentTrackIndex() + 1, 0);
        await this.go(locator, false, () => {});
    }

    private async previousTrack(): Promise<void> {
        if (!this.canGoBackward) return;
        const locator = this.createLocator(this.currentTrackIndex() - 1, 0);
        await this.go(locator, false, () => {});
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

    /**
     * The RemotePlayback object for the primary media element.
     * Because the element is never swapped, this reference is stable for the
     * lifetime of the navigator — host apps can store it and call `.prompt()`,
     * `.watchAvailability()`, etc. directly.
     */
    get remotePlayback(): RemotePlayback | undefined {
        const el = this.pool.audioEngine.getMediaElement();
        return "remote" in el ? el.remote : undefined;
    }

    /** Wires up the optional remotePlaybackStateChanged listener. Called once after initial load. */
    private _setupRemotePlayback(): void {
        if (this._contentProtection.disableRemotePlayback) {
            return;
        }
        const remote = this.remotePlayback;
        if (!remote) return;
        remote.onconnecting = () => this.listeners.remotePlaybackStateChanged("connecting");
        remote.onconnect    = () => this.listeners.remotePlaybackStateChanged("connected");
        remote.ondisconnect = () => this.listeners.remotePlaybackStateChanged("disconnected");
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
        this._stopStalledWatchdog();
        this.destroyMediaSession();
        if (this._suspiciousActivityListener) {
            window.removeEventListener(NAVIGATOR_SUSPICIOUS_ACTIVITY_EVENT, this._suspiciousActivityListener);
        }
        if (this._keyboardPeripheralListener) {
            window.removeEventListener(NAVIGATOR_KEYBOARD_PERIPHERAL_EVENT, this._keyboardPeripheralListener);
        }
        this._navigatorProtector?.destroy();
        this._keyboardPeripheralsManager?.destroy();
        this.pool.destroy();
    }
}
