import { Layout, Locator, Profile, getCssSelector } from "@readium/shared";
import { FrameClickEvent, TextLayout, TextLineStarts } from "@readium/navigator-html-injectables";
import {
    createLocator,
    extractLangRegionFromBCP47,
    filterByLanguages,
    LocatorOptions,
    ReadiumSpeechNavigator,
    ReadiumSpeechPlaybackEngine,
    ReadiumSpeechPlaybackEvent,
    ReadiumSpeechPlaybackState,
    ReadiumSpeechUtterance,
    ReadiumSpeechVoice,
    resolveUtteranceLocate,
    sortVoicesByRegions,
    SpeechPreferences,
    WebSpeechEngine,
    WebSpeechVoiceManager,
} from "@readium/speech";
import { Navigator, VisualNavigatorViewport } from "../Navigator.ts";
import { Decoration, DecorableNavigator } from "../decorations/index.ts";
import type { EpubSettings } from "../epub/preferences/index.ts";
import type { WebPubSettings } from "../webpub/preferences/index.ts";
import type { DivinaSettings } from "../divina/preferences/index.ts";
import { GuidedNavigationProvider, PublicationGuidedNavigationProvider } from "./GuidedNavigationProvider.ts";
import { GO_TIMEOUT, GuidedNavigationPool, ReadingUnit, ReadingUnits } from "./ReadingUnit.ts";
import { SpeechProgress } from "./SpeechProgress.ts";
import {
    IReadAloudDefaults,
    IReadAloudPreferences,
    ReadAloudAutoPause,
    ReadAloudDecorationStyle,
    ReadAloudDefaults,
    ReadAloudPreferences,
    ReadAloudPreferencesEditor,
    ReadAloudSettings,
} from "./preferences/index.ts";

export type ReadAloudState = ReadiumSpeechPlaybackState;

export interface ReadAloudVoicesOptions {
    /** BCP 47 tags, matched by base language. */
    languages?: string[];
}

export interface ReadAloudUtterance {
    text: string;
    /** One locator per piece of the utterance, each in its own resource. */
    locators: Locator[];
}

export interface ReadAloudListeners {
    stateChanged?: (state: ReadAloudState) => void;
    utteranceChanged?: (utterance: ReadAloudUtterance) => void;
    /** The reader moved away from the spoken text, or came back to it. */
    detachedChanged?: (detached: boolean) => void;
    wordChanged?: (locator: Locator, word: string) => void;
    error?: (error: unknown) => void;
}

export interface ReadAloudConfiguration {
    /** Defaults to a `WebSpeechEngine`. */
    engine?: ReadiumSpeechPlaybackEngine;
    provider?: GuidedNavigationProvider;
    preferences?: IReadAloudPreferences;
    defaults?: IReadAloudDefaults;
    /** Whether the screen is kept awake while playing, where the browser grants a screen wake lock. Defaults to true. */
    keepAwake?: boolean;
}

interface TurningPosition {
    unit: ReadingUnit;
    index: number;
}

interface PausedPosition {
    unit: ReadingUnit;
    index: number;
    /** Whether the utterance at `index` is the current one yet, rather than the one before it. */
    current: boolean;
}

interface SpokenPoint {
    /** Index of the piece among the watched ones. */
    piece: number;
    /** Offset in the piece's text, counting each run of whitespace as one character. */
    offset: number;
}

/**
 * A `WebSpeechEngine` whose voices, and default voice, are those of the publication's languages.
 * Its default voice sends word boundaries when one can.
 */
class PublicationWebSpeechEngine extends WebSpeechEngine {
    private ready = false;

    constructor(private languages: string[]) {
        super();
    }

    override async initialize(): Promise<boolean> {
        if (!await super.initialize({ languages: this.scope() })) return false;
        await this.setDefaultVoice();
        this.ready = true;
        return true;
    }

    /** Adds the voices of `languages`, and picks the default voice among them once initialized. */
    async setLanguages(languages: string[]): Promise<void> {
        this.languages = languages;
        if (this.ready) await this.setDefaultVoice();
    }

    private scope(): string[] | undefined {
        return this.languages.length ? this.languages : undefined;
    }

    private async setDefaultVoice(): Promise<void> {
        const languages = this.scope();
        // Loads the voices of languages not loaded yet
        const manager = await WebSpeechVoiceManager.initialize({ languages });
        const available = await this.getAvailableVoices();
        // Boundaries are preferred within the first language with voices, not over the language
        const language = languages?.find(language => filterByLanguages(available, language).length);
        const scoped = language ?? languages;
        const voices = scoped ? filterByLanguages(available, scoped) : available;
        const boundaryVoices = voices.filter(voice => voice.controls?.boundary !== false);
        const voice = await manager.getDefaultVoice(scoped ?? [...(navigator.languages ?? ["en"])], boundaryVoices.length ? boundaryVoices : voices);
        if (voice) await this.setVoice(voice);
    }
}

const UTTERANCE_GROUP = "readaloud-utterance";
const WORD_GROUP = "readaloud-word";
// Subpixel scrolling and rounding of the reported line starts.
const LAYOUT_TOLERANCE = 1;

/**
 * Reads a publication aloud with a speech engine, alongside the navigator displaying it.
 * The spoken utterance and word are highlighted, and the navigator follows them.
 */
export class ReadAloudNavigator {
    private readonly speech: ReadiumSpeechNavigator;
    private readonly engine: ReadiumSpeechPlaybackEngine;
    private readonly publicationEngine?: PublicationWebSpeechEngine;
    private readonly pool: GuidedNavigationPool;
    private readonly units: ReadingUnits;
    private readonly unsubscribers: (() => void)[] = [];
    private readonly _defaults: ReadAloudDefaults;
    private _preferences: ReadAloudPreferences;
    private _settings: ReadAloudSettings;
    private _preferencesEditor: ReadAloudPreferencesEditor | null = null;
    private utteranceLocators: Locator[] = [];
    private wordLocator?: Locator;
    // Where playback resumes after pausing at a page or spread, which speech knows nothing about.
    private pausedBefore?: PausedPosition;
    // Auto-paused before this fixed-layout page, not displayed then: playback resumes once the reader turns to it.
    private awaitedHref?: string;
    private displayed: string[];
    // Speech stopped while following the next utterance, to tell whether that reaches new columns.
    private turning?: TurningPosition;
    private followedHref?: string;
    // A move is under way, so layout reports until its acknowledgement show it, not the reader's.
    private following?: ReturnType<typeof setTimeout>;
    // The reader moved away from the spoken text, which isn't followed until back in view.
    private _detached = false;
    private navigationLocked = false;
    private readonly keepAwake: boolean;
    private wakeLockWanted = false;
    private wakeLock?: Promise<WakeLockSentinel | undefined>;
    // The resource the spoken text was last shown in, to tell when the reader moves to another.
    private shownHref?: string;
    // The utterance pieces whose layout the navigator reports, and the latest report.
    private watchedPieces = new Map<LocatorOptions, number>();
    private unwatchLayout?: () => void;
    private lines: (TextLineStarts | null)[] = [];
    private viewport?: TextLayout["viewport"];
    // Voices without word boundaries turn the page when the spoken text is timed to reach the next one.
    private readonly progress = new SpeechProgress();
    private breakTimer?: ReturnType<typeof setTimeout>;
    private unit?: ReadingUnit;
    private loading = false;
    // Whether the unit being loaded waits paused once ready, rather than speaking.
    private loadPaused = false;
    private loadToken = 0;
    // Settles the pending wait for speech's "ready", which never comes once stopped or destroyed.
    private settleReady?: () => void;
    // Settles the pending wait for the layout a session starts in view from, false once given up.
    private settleLayout?: (laidOut: boolean) => void;
    private watchedQueue: ReadiumSpeechUtterance[] = [];
    // The voice the current utterance is spoken with, as the engine reports it.
    private spokenVoice: ReadiumSpeechVoice | null = null;
    private lastState: ReadAloudState = "idle";
    // Paused with pause(), not auto-paused, so moving to another utterance keeps it paused.
    private pausedByUser = false;

    constructor(
        private readonly navigator: Navigator & Partial<DecorableNavigator> & {
            readonly viewport?: VisualNavigatorViewport;
            readonly layout?: Layout;
            readonly settings?: Readonly<EpubSettings> | Readonly<WebPubSettings> | Readonly<DivinaSettings>;
            watchTextLayout?(locators: Locator[], cb: (layout: TextLayout) => void): () => void;
            watchViewport?(cb: (viewport: VisualNavigatorViewport) => void): () => void;
            findPointedPiece?(event: FrameClickEvent, pieces: Locator[]): Promise<Locator | undefined>;
            lockNavigation?(locked: boolean): void;
        },
        private readonly listeners: ReadAloudListeners = {},
        configuration: ReadAloudConfiguration = {}
    ) {
        this.keepAwake = configuration.keepAwake ?? true;
        this.pool = new GuidedNavigationPool(navigator.publication, configuration.provider ?? new PublicationGuidedNavigationProvider(navigator.publication));
        this.units = new ReadingUnits(navigator);
        this._preferences = new ReadAloudPreferences(configuration.preferences);
        this._defaults = new ReadAloudDefaults(configuration.defaults);
        const metadataLanguage = navigator.publication.metadata.languages?.[0];
        if (!configuration.engine) {
            const languageOverride = this._preferences.languageOverride ?? this._defaults.languageOverride;
            this.publicationEngine = new PublicationWebSpeechEngine(this.publicationLanguages(languageOverride));
        }
        this.engine = configuration.engine ?? this.publicationEngine!;
        this.speech = new ReadiumSpeechNavigator(this.engine, {
            preferences: ReadAloudNavigator.speechPreferences(this._preferences, metadataLanguage),
            defaults: ReadAloudNavigator.speechPreferences({
                ...this._defaults.speech,
                autoPause: this._defaults.autoPause,
                languageOverride: this._defaults.languageOverride
            }, metadataLanguage),
        });
        this._settings = new ReadAloudSettings(this.speech.settings, this._preferences, this._defaults);
        this.displayed = navigator.viewport?.readingOrder ?? [];
        this.listen();
    }

    /** Whether the reader can move away while reading aloud. Otherwise the app keeps its own navigation from moving while playing. */
    get detachable(): boolean {
        return this._settings.detachable;
    }

    /** Whether the reader moved away from the spoken text, which isn't followed until `reattach()` or the reader is back on it. */
    get detached(): boolean {
        return this._detached;
    }

    get state(): ReadAloudState {
        if (this.loading) return "loading";
        if (this.turning) return "playing";
        return this.pausedBefore ? "paused" : this.speech.getState();
    }

    /**
     * Starts reading from `from`, or resumes when paused.
     * Without `from`, an idle reader starts from the navigator's current position.
     */
    async play(from?: Locator): Promise<void> {
        this.awaitedHref = undefined;
        if (!from && this.loading) {
            this.loadPaused = false;
            this.notifyState();
            return;
        }
        if (!from && this.turning) return;
        if (!from && this.pausedBefore) {
            await this.resumePaused(this.pausedBefore);
            return;
        }
        const state = this.state;
        if (!from && (state === "paused" || state === "ready")) {
            this.speech.play();
            return;
        }
        if (!from && state === "playing") return;
        this.attach();
        await this.start(from ?? this.navigator.currentLocator, !from && this._settings.startInViewport);
    }

    /**
     * Starts reading from the utterance under a click or tap in a displayed resource, loading that resource when needed.
     * Resolves false when the `readFromPointer` preference is off, or the press isn't on content read aloud, or is on an interactive element, so the caller handles it.
     */
    async readFromPointer(event: FrameClickEvent): Promise<boolean> {
        if (!this._settings.readFromPointer || event.interactiveElement || !event.onContent || !this.navigator.findPointedPiece) return false;
        this.awaitedHref = undefined;
        const unit = this.unit;
        const index = unit ? await this.pointedIndex(event, this.speech.getContentQueue()) : -1;
        if (unit && index >= 0) {
            this.attach();
            return this.loadUnit(() => unit, () => index);
        }
        const href = this.navigator.currentLocator.href.split("#")[0];
        // Content of the loaded unit that no utterance covers isn't read aloud.
        if (unit?.links.some(link => link.href.split("#")[0] === href)) return false;
        this.attach();
        return this.loadUnit(() => this.units.around(href), async queue => {
            const index = await this.pointedIndex(event, queue);
            return index >= 0 ? index : this.startIndex(queue, this.navigator.currentLocator);
        });
    }

    pause(): void {
        this.awaitedHref = undefined;
        this.pausedByUser = true;
        if (this.loading) {
            this.loadPaused = true;
            this.notifyState();
        } else if (this.turning) this.pauseTurning();
        else if (!this.pausedBefore) this.speech.pause();
    }

    stop(): void {
        this.loadToken++;
        this.settleReady?.();
        this.settleLayout?.(false);
        this.attach();
        this.pausedBefore = undefined;
        this.awaitedHref = undefined;
        this.turning = undefined;
        this.speech.stop();
        this.setLoading(false);
        this.clearHighlights();
    }

    /**
     * Moves to the next utterance, continuing into the next reading unit at the end of this one.
     * After an auto-pause, playback resumes, from the highlighted utterance when it hasn't been spoken yet.
     */
    async next(): Promise<boolean> {
        const resumes = this.resumesOnMove();
        this.attach();
        this.awaitedHref = undefined;
        if (this.turning) this.pauseTurning();
        if (this.pausedBefore) {
            if (!resumes || !this.pausedBefore.current) return this.movePaused(this.pausedBefore, 1);
            await this.resumePaused(this.pausedBefore);
            return true;
        }
        if (this.speech.next()) {
            if (resumes) this.speech.play();
            return true;
        }
        if (!this.unit || !this.units.linkAfter(this.unit)) return false;
        return this.loadUnit(() => this.units.after(this.unit!), () => 0, !resumes && this.staysPaused());
    }

    /**
     * Moves to the previous utterance, continuing into the previous reading unit at the start of this one.
     * After an auto-pause, playback resumes from there.
     */
    async previous(): Promise<boolean> {
        const resumes = this.resumesOnMove();
        this.attach();
        this.awaitedHref = undefined;
        if (this.turning) this.pauseTurning();
        if (this.pausedBefore) {
            const moved = await this.movePaused(this.pausedBefore, -1);
            // Pausing while the previous unit loads keeps it paused.
            if (moved && resumes && !this.pausedByUser && this.pausedBefore) await this.resumePaused(this.pausedBefore);
            return moved;
        }
        if (this.speech.previous()) {
            if (resumes) this.speech.play();
            return true;
        }
        if (!this.unit || !this.units.linkBefore(this.unit)) return false;
        return this.loadUnit(() => this.units.before(this.unit!), queue => queue.length - 1, !resumes && this.staysPaused());
    }

    /**
     * Goes back to the spoken text and follows it again, leaving playback as it is.
     * Returns false when nothing is being read.
     */
    reattach(): boolean {
        const state = this.state;
        const queue = this.speech.getContentQueue();
        const utterance = this.pausedBefore?.current ? queue[this.pausedBefore.index] : this.speech.getCurrentContent();
        if (state === "idle" || state === "loading" || !utterance) return false;
        this.attach();
        // Turning to the awaited page from here isn't the reader's, so it doesn't resume.
        this.awaitedHref = undefined;
        this.followedHref = undefined;
        const locators = this.locatorsOf(utterance);
        const href = this.navigator.currentLocator.href.split("#")[0];
        // The layout last reported is the spoken resource's, not the one the reader moved to.
        if (locators[0] && this.layout() !== Layout.fixed && locators[0].href !== href) this.follow(locators[0]);
        else this.followUtterance(utterance, locators);
        return true;
    }

    /**
     * The available voices, only those of `languages` when given,
     * ranked the way the default voice is picked: preferred region first, then quality.
     */
    async getVoices(options: ReadAloudVoicesOptions = {}): Promise<ReadiumSpeechVoice[]> {
        const voices = await this.speech.getVoices();
        const languages = options.languages?.length ? options.languages : undefined;
        const filtered = languages ? filterByLanguages(voices, languages) : voices;
        const publicationLanguages = this.publicationLanguages(this._settings.languageOverride);
        const preferred = languages
            ?? (publicationLanguages.length ? publicationLanguages : [...(navigator.languages ?? ["en"])]);
        return sortVoicesByRegions(preferred, filtered);
    }

    /**
     * The base languages voices can be had in, e.g. for `languageOverride`, without loading their voices.
     * With an engine given in the configuration, those of its voices.
     */
    async getLanguages(): Promise<string[]> {
        // Initializes the engine first, so the voice manager is scoped to the publication's languages
        const voices = await this.speech.getVoices();
        if (!this.publicationEngine) return [...new Set(voices.map(voice => extractLangRegionFromBCP47(voice.language)[0]))];
        const manager = await WebSpeechVoiceManager.initialize();
        return manager.getBrowserLanguages().map(language => language.code);
    }

    /** The publication's languages, `languageOverride` in place of the primary one when set. */
    getPublicationLanguages(): string[] {
        return this.publicationLanguages(this._settings.languageOverride);
    }

    get settings(): Readonly<ReadAloudSettings> {
        return Object.freeze(new ReadAloudSettings(this.speech.settings, this._preferences, this._defaults));
    }

    get preferencesEditor(): ReadAloudPreferencesEditor {
        if (this._preferencesEditor === null) {
            this._preferencesEditor = new ReadAloudPreferencesEditor(this._preferences, this.settings, () => this.speech.preferencesEditor, this.layout());
        }
        return this._preferencesEditor;
    }

    async submitPreferences(preferences: ReadAloudPreferences): Promise<void> {
        this._preferences = this._preferences.merging(preferences);
        const old = this.speech.getContentQueue();
        const previousLanguageOverride = this._settings.languageOverride;
        const languageOverride = this._preferences.languageOverride ?? this._defaults.languageOverride;
        // Paused, the rebuilt queue and the new default voice restart the utterance once, on playing again.
        const pausedForLanguage = !!this.publicationEngine && languageOverride !== previousLanguageOverride && this.speech.getState() === "playing";
        if (pausedForLanguage) this.speech.pause();
        await this.speech.submitPreferences(ReadAloudNavigator.speechPreferences(this._preferences, this.navigator.publication.metadata.languages?.[0]));
        this._settings = new ReadAloudSettings(this.speech.settings, this._preferences, this._defaults);
        if (this._settings.languageOverride !== previousLanguageOverride) {
            await this.publicationEngine?.setLanguages(this.publicationLanguages(this._settings.languageOverride));
        }
        if (pausedForLanguage && this.speech.getState() === "paused") this.speech.play();
        if (!this._settings.detachable && this._detached) this.attach();
        // Speech keeps its place in a rebuilt queue only while playing or paused itself, not while stopped here.
        const held = this.pausedBefore ?? this.turning;
        if (held) {
            held.index = this.indexAfterRebuild(old, held.index);
            if (this.pausedBefore?.current) this.notifyUtterance(this.speech.getContentQueue()[held.index]);
        }
        // Segmentation may have split the queue into other pieces.
        if (this.unit) this.watchLayout(this.speech.getContentQueue());
        if (this._preferencesEditor !== null) {
            this._preferencesEditor = new ReadAloudPreferencesEditor(this._preferences, this.settings, () => this.speech.preferencesEditor, this.layout());
        }
        this.notifyState();
        this.decorate();
    }

    async destroy(): Promise<void> {
        this.loadToken++;
        this.settleReady?.();
        this.settleLayout?.(false);
        this.pausedBefore = undefined;
        this.turning = undefined;
        this.unsubscribers.forEach(unsubscribe => unsubscribe());
        this.unsubscribers.length = 0;
        this.clearBreak();
        clearTimeout(this.following);
        this.following = undefined;
        this.unwatchLayout?.();
        this.unwatchLayout = undefined;
        this.clearHighlights();
        this.lockNavigation(false);
        this.holdWakeLock(false);
        await this.speech.destroy();
    }

    private listen() {
        const on = (type: ReadiumSpeechPlaybackEvent["type"], handler: (event: ReadiumSpeechPlaybackEvent) => void) => {
            this.unsubscribers.push(this.speech.on(type, event => {
                handler(event);
                this.notifyState();
            }));
        };
        on("start", event => {
            // Engines that don't report the voice speaking are taken to use theirs.
            this.spokenVoice = event.detail?.voice ?? this.engine.getCurrentVoice();
            const utterance = this.speech.getCurrentContent();
            if (utterance) this.progress.start(utterance);
            this.notifyUtterance();
            this.armBreak();
        });
        on("skip", () => {
            this.clearBreak();
            this.progress.reset();
            this.notifyUtterance();
        });
        on("boundary", event => {
            // Voices listed without boundaries may still send them, but unreliably (e.g. out of order after a pause).
            if (!this.sendsBoundaries()) return;
            // Some voices report zero-length boundaries, which would highlight the whole element.
            if (event.detail?.name !== "word" || !event.detail.locate || !event.detail.word?.trim()) return;
            const locate = event.detail.locate as LocatorOptions;
            const locator = this.locatorFor(locate);
            if (!locator) return;
            this.wordLocator = locator;
            this.decorate();
            const word = this.wordPoint(locate);
            if (word && this.isHidden(word)) {
                const center = this.centerPoint();
                const target = center ? this.pointLocator(center) : locator;
                if (target) this.follow(target);
            }
            this.listeners.wordChanged?.(locator, event.detail.word ?? "");
        });
        on("pause", () => {
            this.clearBreak();
            this.progress.pause();
        });
        on("resume", () => {
            this.progress.resume();
            this.armBreak();
        });
        on("end", () => {
            this.clearBreak();
            this.progress.end(this.speech.getCurrentContent(), this.voiceName(), this.speech.settings.rate);
            const state = this.speech.getState();
            // Speech goes idle once the last utterance of the queue has been spoken.
            if (state === "idle") {
                const unit = this.unit!;
                const link = this.units.linkAfter(unit);
                if (!link) {
                    this.clearHighlights();
                    this.attach();
                } else if (this.awaitsTurn(link.href)) void this.awaitTurn(unit);
                else void this.loadUnit(() => this.unitAfter(unit), () => 0, this.pausesBeforeUnit(link.href));
                return;
            }
            const queue = this.speech.getContentQueue();
            const index = queue.indexOf(this.speech.getCurrentContent()!);
            if (index < 0 || index + 1 >= queue.length) return;
            const nextHref = this.hrefsOf(queue[index + 1])[0];
            // Paused by speech's own auto-pause otherwise.
            if (state !== "playing") {
                if (state === "paused" && nextHref && this.awaitsTurn(nextHref)) this.awaitedHref = nextHref;
                return;
            }
            if (this.pausesBetween(queue[index], queue[index + 1])) {
                if (this.awaitsTurn(nextHref)) this.awaitedHref = nextHref;
                // Stopping, not pausing, cancels the next utterance without a paused engine to resume.
                this.pausedBefore = { unit: this.unit!, index: index + 1, current: true };
                this.speech.stop();
                this.notifyUtterance(queue[index + 1]);
            } else if (this.layout() === Layout.reflowable && this.pausesAtPages()) {
                this.turnTo(index + 1);
            }
        });
        on("error", event => {
            this.clearBreak();
            this.progress.reset();
            this.clearHighlights();
            this.listeners.error?.(event.detail ?? event);
        });
        on("stop", () => {
            this.clearBreak();
            this.progress.reset();
            // A unit being loaded replaces the highlights once ready, so they're kept meanwhile.
            if (!this.pausedBefore && !this.turning && !this.loading) this.clearHighlights();
        });
        for (const type of ["idle", "loading", "ready"] as const) on(type, () => {});
        const unwatchViewport = this.navigator.watchViewport?.(viewport => this.viewportChanged(viewport.readingOrder));
        if (unwatchViewport) this.unsubscribers.push(unwatchViewport);
        if (this.keepAwake) {
            // Browsers release screen wake locks while the document is hidden.
            const reacquire = () => {
                if (document.visibilityState === "visible" && this.wakeLockWanted) this.requestWakeLock();
            };
            document.addEventListener("visibilitychange", reacquire);
            this.unsubscribers.push(() => document.removeEventListener("visibilitychange", reacquire));
        }
    }

    private async start(from: Locator, inViewport = false): Promise<void> {
        await this.loadUnit(
            () => this.units.around(from.href.split("#")[0]),
            queue => inViewport ? this.viewportIndex(queue, from) : this.startIndex(queue, from)
        );
    }

    private async resumePaused(paused: PausedPosition): Promise<void> {
        if (paused.unit !== this.unit) {
            await this.loadUnit(() => paused.unit, () => paused.index);
            return;
        }
        // A queue rebuilt by submitted preferences may still be loading, and speech can't play its first utterance until ready.
        if (this.speech.getState() === "loading" && !await this.speechReady()) return;
        const resumed = this.pausedBefore ?? paused;
        this.pausedBefore = undefined;
        this.speakFrom(resumed.index);
        this.notifyState();
    }

    // Waits as a load would, so pausing, playing or stopping meanwhile applies. Resolves whether to speak then.
    private async speechReady(): Promise<boolean> {
        const token = ++this.loadToken;
        this.loadPaused = false;
        this.setLoading(true);
        await this.untilReady();
        if (token !== this.loadToken) return false;
        this.setLoading(false);
        return !this.loadPaused;
    }

    // Speech's next "ready", or stopping or destroying, which also settles a previous wait.
    private untilReady(): Promise<void> {
        this.settleReady?.();
        return new Promise<void>(resolve => {
            const settle = () => {
                off();
                if (this.settleReady === settle) this.settleReady = undefined;
                resolve();
            };
            const off = this.speech.on("ready", settle);
            this.settleReady = settle;
        });
    }

    // Moves the position playback resumes at by `offset` utterances, staying paused.
    private async movePaused(paused: PausedPosition, offset: number): Promise<boolean> {
        const target = (paused.current ? paused.index : paused.index - 1) + offset;
        if (paused.unit === this.unit) {
            const queue = this.speech.getContentQueue();
            if (target >= 0 && target < queue.length) {
                this.pausedBefore = { unit: paused.unit, index: target, current: true };
                this.notifyUtterance(queue[target]);
                return true;
            }
            if (target >= queue.length) {
                if (!this.units.linkAfter(paused.unit)) return false;
                return this.loadUnit(() => this.units.after(paused.unit), () => target - queue.length, true);
            }
        }
        if (target >= 0) return this.loadUnit(() => paused.unit, () => target, true);
        if (!this.units.linkBefore(paused.unit)) return false;
        return this.loadUnit(() => this.units.before(paused.unit), queue => queue.length + target, true);
    }

    // `find` gives the unit once speech is stopped, as finding it may move the navigator.
    private async loadUnit(find: () => ReadingUnit | undefined, indexIn: (queue: ReadiumSpeechUtterance[]) => number | Promise<number>, paused = false): Promise<boolean> {
        const token = ++this.loadToken;
        this.settleLayout?.(false);
        this.loadPaused = paused;
        this.setLoading(true);
        this.pausedBefore = undefined;
        this.turning = undefined;
        this.speech.stop();
        try {
            const unit = find();
            if (!unit) {
                this.setLoading(false);
                this.clearHighlights();
                return false;
            }
            const { guided, failures } = await this.pool.stitch(unit);
            if (token !== this.loadToken) return false;
            failures.forEach(failure => this.listeners.error?.(failure.error));

            const ready = this.untilReady();
            await this.speech.loadGndContent(guided, { language: this.navigator.publication.metadata.languages?.[0] });
            if (token !== this.loadToken) return false;
            this.unit = unit;

            const queue = this.speech.getContentQueue();
            if (queue.length === 0) {
                this.setLoading(false);
                // Nothing to read in this unit (e.g. only images): continue with the next one.
                const link = this.units.linkAfter(unit);
                if (link) {
                    if (this.awaitedHref || this.awaitsTurn(link.href)) return this.awaitTurn(unit);
                    return this.loadUnit(() => this.unitAfter(unit), () => 0, this.loadPaused);
                }
                this.clearHighlights();
                this.attach();
                return false;
            }
            await ready;
            if (token !== this.loadToken) return false;

            const start = await indexIn(queue);
            if (token !== this.loadToken) return false;
            this.setLoading(false);
            const loaded = this.speech.getContentQueue();
            if (!ReadAloudNavigator.sameQueue(loaded, this.watchedQueue)) this.watchLayout(loaded);
            const index = Math.max(Math.min(this.indexAfterRebuild(queue, Math.max(start, 0)), loaded.length - 1), 0);
            if (this.loadPaused) {
                this.pausedBefore = { unit, index, current: true };
                this.notifyUtterance(loaded[index]);
                this.notifyState();
            } else {
                this.speakFrom(index);
            }
            return true;
        } catch (error) {
            if (token === this.loadToken) {
                this.setLoading(false);
                this.clearHighlights();
            }
            this.listeners.error?.(error);
            return false;
        }
    }

    // The first utterance in `from`'s resource, refined by its CSS selector, then by its text, when they match one.
    private startIndex(queue: ReadiumSpeechUtterance[], from: Locator): number {
        const href = from.href.split("#")[0];
        const selector = from.locations ? getCssSelector(from.locations) : undefined;
        const quote = from.text?.highlight?.trim().slice(0, 40);
        let first = -1;
        let byText = -1;
        for (let i = 0; i < queue.length; i++) {
            const pieces = this.piecesOf(queue[i]).filter(piece => piece.href?.split("#")[0] === href);
            if (pieces.length === 0) continue;
            if (first === -1) first = i;
            if (selector && pieces.some(piece => piece.cssSelector === selector)) return i;
            if (byText === -1 && quote && (queue[i].plain ?? "").includes(quote)) byText = i;
        }
        return byText !== -1 ? byText : Math.max(first, 0);
    }

    // The first utterance starting in view, or else the one going on at its top, once `queue` is laid out.
    private async viewportIndex(queue: ReadiumSpeechUtterance[], from: Locator): Promise<number> {
        if (!this.navigator.watchTextLayout || this.layout() === Layout.fixed) return this.startIndex(queue, from);
        const laidOut = this.untilLaidOut();
        this.watchLayout(queue);
        // Nothing watched reports no layout.
        if (!this.unwatchLayout) this.settleLayout?.(false);
        const viewport = await laidOut && this.visibleViewport();
        if (!viewport) return this.startIndex(queue, from);
        let above = -1;
        for (let i = 0; i < queue.length; i++) {
            const start = this.utteranceStart(queue[i]);
            if (!start) continue;
            const hidden = this.isHidden(start);
            if (hidden === false) return i;
            if (hidden && this.lineStart(start)! < viewport.pos) above = i;
        }
        return above >= 0 ? above : this.startIndex(queue, from);
    }

    // The next layout report with pieces, or false when none comes in time or the wait is given up.
    private untilLaidOut(): Promise<boolean> {
        this.settleLayout?.(false);
        return new Promise<boolean>(resolve => {
            const settle = (laidOut: boolean) => {
                clearTimeout(timeout);
                if (this.settleLayout === settle) this.settleLayout = undefined;
                resolve(laidOut);
            };
            const timeout = setTimeout(() => settle(false), GO_TIMEOUT);
            this.settleLayout = settle;
        });
    }

    // The index of `old[index]` in speech's queue, which submitted preferences may have rebuilt since `old`.
    private indexAfterRebuild(old: ReadiumSpeechUtterance[], index: number): number {
        const queue = this.speech.getContentQueue();
        if (ReadAloudNavigator.sameQueue(queue, old)) return index;
        const piece = old[index] && this.piecesOf(old[index])[0];
        const locator = piece && this.locatorFor(piece);
        return locator ? this.startIndex(queue, locator) : 0;
    }

    // The index in `queue` of the utterance under the press, or -1.
    private async pointedIndex(event: FrameClickEvent, queue: ReadiumSpeechUtterance[]): Promise<number> {
        const pieces = queue.flatMap((utterance, index) => this.piecesOf(utterance).map(piece => ({ index, locator: this.locatorFor(piece) })))
            .filter((piece): piece is { index: number; locator: Locator } => piece.locator !== undefined);
        const found = await this.navigator.findPointedPiece?.(event, pieces.map(piece => piece.locator));
        return pieces.find(piece => piece.locator === found)?.index ?? -1;
    }

    private piecesOf(utterance: ReadiumSpeechUtterance): LocatorOptions[] {
        return resolveUtteranceLocate(utterance, this.speech.settings.segmentation);
    }

    // Speech can't speak the utterance it's already at, so the first one is played instead.
    private speakFrom(index: number) {
        if (index === 0) this.speech.play();
        else this.speech.jumpTo(index, true);
    }

    private pausesAtPages(): boolean {
        const autoPause = this._settings.autoPause;
        switch (this.layout()) {
            case Layout.fixed: return autoPause === ReadAloudAutoPause.page || autoPause === ReadAloudAutoPause.spread;
            case Layout.reflowable: return autoPause === ReadAloudAutoPause.page;
            default: return false;
        }
    }

    // Columns aren't told apart by hrefs, so the next utterance is followed and the viewport compared.
    private turnTo(index: number) {
        const next = this.speech.getContentQueue()[index];
        const locator = this.piecesOf(next).map(piece => this.locatorFor(piece)).find(locator => locator !== undefined);
        // A hidden document doesn't turn pages until shown again, nor does a reader looking elsewhere.
        if (!locator || document.hidden || this.isDetached()) return;
        const turning = { unit: this.unit!, index };
        this.turning = turning;
        this.speech.stop();
        const before = this.navigator.viewport?.progressions.get(locator.href);
        const start = before?.start;
        const end = before?.end;
        const settle = (turned: boolean) => {
            clearTimeout(timeout);
            if (this.turning !== turning) return;
            this.turning = undefined;
            if (turned) {
                this.pausedBefore = { ...turning, current: true };
                this.notifyUtterance(this.speech.getContentQueue()[turning.index]);
            } else {
                this.pausedBefore = { ...turning, current: true };
                void this.resumePaused(this.pausedBefore);
            }
            this.notifyState();
        };
        // Expired comms callbacks are dropped, never called.
        const timeout = setTimeout(() => settle(false), GO_TIMEOUT);
        this.followedHref = locator.href;
        this.navigator.go(locator, false, ok => {
            const after = this.navigator.viewport?.progressions.get(locator.href);
            settle(ok && after !== undefined && (after.start !== start || after.end !== end));
        });
    }

    // Auto-pausing never turns a fixed-layout page, so the reader turns to `href` when it isn't displayed.
    private awaitsTurn(href: string): boolean {
        return this._settings.autoPause !== ReadAloudAutoPause.none && this.layout() === Layout.fixed &&
            this.navigator.layout !== Layout.scrolled && !(this.navigator.viewport?.readingOrder ?? []).includes(href);
    }

    // Loads the page after `unit` paused, without turning to it.
    private awaitTurn(unit: ReadingUnit): Promise<boolean> {
        this.awaitedHref = this.units.linkAfter(unit)!.href;
        return this.loadUnit(() => this.units.pageAfter(unit), () => 0, true);
    }

    // Moving on from the pages just before the awaited one resumes playback, however the reader gets there,
    // unlike resizing to show it or coming back to it after moving away.
    private viewportChanged(displayed: string[]) {
        const previous = this.displayed;
        this.displayed = displayed;
        const wasDetached = this._detached;
        const awaited = this.awaitedHref;
        const readingOrder = this.navigator.publication.readingOrder;
        const indices = displayed.map(href => readingOrder.findIndexWithHref(href));
        const first = Math.min(...indices);
        const last = Math.max(...previous.map(href => readingOrder.findIndexWithHref(href)));
        // Pages with nothing to read are skipped up to the awaited one, so turning through them isn't moving away.
        if (awaited && first === last + 1 && Math.max(...indices) < readingOrder.findIndexWithHref(awaited)) return;
        this.userMoved(previous, displayed);
        if (!awaited || !displayed.includes(awaited)) return;
        if (first === last + 1 && !wasDetached) void this.play();
        else this.awaitedHref = undefined;
    }

    // Tells from a viewport change, not made here, whether the reader moved away from the spoken text or back to it.
    private userMoved(previous: string[], displayed: string[]) {
        if (!this.detachable || this.loading || this.turning || this.following !== undefined || this.units.moving) return;
        if (this.layout() !== Layout.fixed) {
            this.isDetached();
            return;
        }
        const readingOrder = this.navigator.publication.readingOrder;
        const spoken = this.utteranceLocators.map(locator => readingOrder.findWithHref(locator.href.split("#")[0])?.href);
        if (spoken.length === 0) return;
        if (spoken.some(href => href && displayed.includes(href))) this.setDetached(false);
        // Unless scrolled, pages still displayed after the change were resized, not turned away from.
        else if (this.navigator.layout === Layout.scrolled || !previous.some(href => displayed.includes(href))) this.setDetached(true);
    }

    // A reader looking elsewhere isn't moved to find the next spread, so its next page is read on its own.
    private unitAfter(unit: ReadingUnit): ReadingUnit | undefined {
        return this._detached && this.layout() === Layout.fixed ? this.units.pageAfter(unit) : this.units.after(unit);
    }

    private resumesOnMove(): boolean {
        return this.state === "paused" && !this.pausedByUser;
    }

    // Moving into another unit keeps playback paused, as moving within one does.
    private staysPaused(): boolean {
        return this.loading ? this.loadPaused : this.speech.getState() === "paused";
    }

    private pauseTurning() {
        this.pausedBefore = { ...this.turning!, current: false };
        this.turning = undefined;
        this.notifyState();
    }

    // The next unit starts on another resource, which may still be in the displayed spread.
    private pausesBeforeUnit(href: string): boolean {
        if (!this.pausesAtPages()) return false;
        const displayed = this.navigator.viewport?.readingOrder ?? [];
        if (this._settings.autoPause !== ReadAloudAutoPause.spread || displayed.length === 0) return true;
        return !displayed.includes(href);
    }

    // Whether `next` starts on another page than `ended` ends on, or outside the displayed spread.
    private pausesBetween(ended: ReadiumSpeechUtterance, next: ReadiumSpeechUtterance | undefined): boolean {
        if (!next || !this.pausesAtPages()) return false;
        const start = this.hrefsOf(next)[0];
        if (!start) return false;
        const displayed = this.navigator.viewport?.readingOrder ?? [];
        if (this._settings.autoPause === ReadAloudAutoPause.spread && displayed.length > 0) {
            return !displayed.includes(start);
        }
        return start !== this.hrefsOf(ended).at(-1);
    }

    private hrefsOf(utterance: ReadiumSpeechUtterance): string[] {
        return this.piecesOf(utterance)
            .map(piece => piece.href && this.navigator.publication.readingOrder.findWithHref(piece.href.split("#")[0])?.href)
            .filter((href): href is string => !!href);
    }

    private notifyUtterance(utterance = this.speech.getCurrentContent()) {
        if (!utterance) return;
        const locators = this.locatorsOf(utterance);
        this.utteranceLocators = locators;
        this.wordLocator = undefined;
        this.decorate();
        // Reading on reaches the page the reader turned to.
        const reached = locators.length > 0 ? locators : [this.pageLocator()];
        if (this.layout() === Layout.fixed && reached.some(locator => locator && this.displayed.includes(locator.href))) this.setDetached(false);
        const page = this.followUtterance(utterance, locators);
        if (page) locators.push(page);
        this.listeners.utteranceChanged?.({ text: utterance.plain ?? "", locators });
    }

    private locatorsOf(utterance: ReadiumSpeechUtterance): Locator[] {
        return this.piecesOf(utterance)
            .map(piece => this.locatorFor(piece))
            .filter((locator): locator is Locator => locator !== undefined);
    }

    // Follows `utterance` out of view or off center, returning the page it's on when `locators` is empty.
    private followUtterance(utterance: ReadiumSpeechUtterance, locators: Locator[]): Locator | undefined {
        const center = this.centerPoint(utterance);
        if (center) {
            const locator = this.isOffCenter(center) ? this.pointLocator(center) : undefined;
            if (locator) this.follow(locator);
        } else if (locators.length > 0) {
            const start = this.utteranceStart(utterance);
            if (!start || this.isHidden(start) !== false) this.follow(locators[0]);
        } else {
            // Following a whole page again would reset its scroll position.
            const page = this.pageLocator();
            if (page && page.href !== this.followedHref) this.follow(page);
            return page;
        }
        return undefined;
    }

    // Image pages (Divina) are read one at a time, and their utterances carry no location of their own.
    private pageLocator(): Locator | undefined {
        const links = this.unit?.links;
        return links?.length === 1 && links[0].mediaType.isBitmap ? links[0].locator : undefined;
    }

    private decorate() {
        this.applyDecorations(UTTERANCE_GROUP, this.utteranceLocators, this._settings.utteranceStyle);
        this.applyDecorations(WORD_GROUP, this.wordLocator ? [this.wordLocator] : [], this._settings.wordStyle);
    }

    private applyDecorations(group: string, locators: Locator[], style: ReadAloudDecorationStyle) {
        const decorations: Decoration[] = style
            ? locators.map((locator, i) => ({ id: `${group}-${i}`, locator, style }))
            : [];
        this.navigator.applyDecorations?.(decorations, group);
    }

    private clearHighlights() {
        this.utteranceLocators = [];
        this.wordLocator = undefined;
        this.decorate();
        this.followedHref = undefined;
    }

    private follow(locator: Locator) {
        // A fixed-layout page doesn't scroll, and going to one of the displayed spread can display another.
        if (this.units.displays(locator.href) || this.following !== undefined || this.awaitedHref || this.isDetached()) return;
        this.followedHref = locator.href;
        const done = () => {
            if (this.following !== timeout) return;
            clearTimeout(timeout);
            this.following = undefined;
        };
        // Expired comms callbacks are dropped, never called.
        const timeout = setTimeout(done, GO_TIMEOUT);
        this.following = timeout;
        this.navigator.go(locator, false, ok => {
            if (ok && this.following === timeout) this.shownHref = locator.href.split("#")[0];
            done();
        });
    }

    private setDetached(detached: boolean) {
        if (this._detached === detached) return;
        this._detached = detached;
        this.listeners.detachedChanged?.(detached);
    }

    private attach() {
        this.setDetached(false);
        this.shownHref = undefined;
    }

    // Layout reports stop once the reader moves to another resource, so that is told from the navigator.
    private isDetached(): boolean {
        const href = this.navigator.currentLocator.href.split("#")[0];
        if (this.detachable && this.shownHref && this.shownHref !== href && this.layout() !== Layout.fixed) this.setDetached(true);
        return this._detached;
    }

    // Watches where the pieces of `queue` are laid out, when the navigator reports it.
    private watchLayout(queue: ReadiumSpeechUtterance[]) {
        this.unwatchLayout?.();
        this.unwatchLayout = undefined;
        this.watchedPieces.clear();
        this.watchedQueue = queue;
        this.lines = [];
        this.viewport = undefined;
        if (!this.navigator.watchTextLayout || this.layout() === Layout.fixed) return;
        const locators: Locator[] = [];
        for (const piece of queue.flatMap(utterance => this.piecesOf(utterance))) {
            const locator = this.locatorFor(piece);
            if (!locator || this.watchedPieces.has(piece)) continue;
            this.watchedPieces.set(piece, locators.length);
            locators.push(locator);
        }
        if (locators.length === 0) return;
        this.unwatchLayout = this.navigator.watchTextLayout(locators, layout => this.laidOut(layout));
    }

    private laidOut(layout: TextLayout) {
        this.shownHref = this.navigator.currentLocator.href.split("#")[0];
        this.viewport = layout.viewport;
        if (layout.pieces) this.lines = layout.pieces;
        // Nothing is spoken yet while a session waits for the layout it starts from.
        if (this.settleLayout) {
            if (layout.pieces) this.settleLayout(true);
            return;
        }
        const spoken = this.spokenPoint();
        const hidden = spoken && this.isHidden(spoken);
        if (hidden === false) this.setDetached(false);
        const center = this.centerPoint();
        const target = center ? (this.isOffCenter(center) ? center : undefined) : (hidden ? spoken : undefined);
        if (target && layout.pieces) {
            // Laid out again, so the spoken text may have moved from where it's followed.
            const locator = this.pointLocator(target);
            if (locator) this.follow(locator);
        } else if (hidden && this.detachable && this.following === undefined && !this.turning) {
            // Only scrolling reports the viewport alone, and this one isn't a move made here.
            this.setDetached(true);
        }
        if (this.breakTimer !== undefined || this.progress.speaking) this.armBreak();
    }

    // Whether `point` is out of view, or undefined when its layout isn't known.
    private isHidden(point: SpokenPoint): boolean | undefined {
        const start = this.lineStart(point);
        const viewport = this.visibleViewport();
        if (start === undefined || !viewport) return undefined;
        const { pos, size } = viewport;
        return start < pos - LAYOUT_TOLERANCE || start >= pos + size - LAYOUT_TOLERANCE;
    }

    // The middle line of the utterance when kept centered, unless its layout is unknown or centering it leaves a line out of view.
    private centerPoint(utterance = this.speech.getCurrentContent()): SpokenPoint | undefined {
        const viewport = this.visibleViewport();
        if (!utterance || !viewport || this.middle() === undefined) return undefined;
        const lines = this.piecesOf(utterance).flatMap(piece => {
            const index = this.watchedPieces.get(piece);
            const layout = index === undefined ? null : this.lines[index];
            return layout ? layout.starts.map((start, i) => ({ start, point: { piece: index!, offset: layout.offsets[i] } })) : [];
        });
        if (lines.length === 0) return undefined;
        const top = lines[0].start;
        const bottom = lines[lines.length - 1].start;
        const middle = (top + bottom) / 2;
        const line = lines.reduce((a, b) => Math.abs(b.start - middle) < Math.abs(a.start - middle) ? b : a);
        // Going to the line scrolls its start to the middle of the frame.
        const pos = viewport.pos + line.start - this.viewport!.pos - this.viewport!.size / 2;
        if (top < pos - LAYOUT_TOLERANCE || bottom >= pos + viewport.size - LAYOUT_TOLERANCE) return undefined;
        return line.point;
    }

    // Whether the line at `point` is out of view, or off the middle while the frame can still scroll toward it.
    private isOffCenter(point: SpokenPoint): boolean | undefined {
        const hidden = this.isHidden(point);
        const middle = this.middle();
        if (hidden !== false || middle === undefined) return hidden;
        const start = this.lineStart(point)!;
        // Text off the middle is only centered while the frame can still scroll toward it.
        return (start >= middle && !this.scrolledToEnd()) || (start < middle - 2 * LAYOUT_TOLERANCE && this.viewport!.pos > LAYOUT_TOLERANCE);
    }

    private scrolledToEnd(): boolean {
        const href = this.navigator.currentLocator.href.split("#")[0];
        return (this.navigator.viewport?.progressions.get(href)?.end ?? 0) >= 1;
    }

    // The line going to text centers when scrolled, where the utterance is kept when centered.
    private middle(): number | undefined {
        if (!this.viewport || !this._settings.keepCentered || this.layout() !== Layout.scrolled) return undefined;
        return this.viewport.pos + this.viewport.size / 2 + LAYOUT_TOLERANCE;
    }

    // Scroll padding keeps room for the UI overlaying the top and bottom of the content.
    private visibleViewport(): TextLayout["viewport"] | undefined {
        if (!this.viewport || this.layout() !== Layout.scrolled) return this.viewport;
        const settings = this.navigator.settings;
        if (!settings || !("scrollPaddingTop" in settings)) return this.viewport;
        const top = settings.scrollPaddingTop ?? 0;
        const bottom = settings.scrollPaddingBottom ?? 0;
        return { pos: this.viewport.pos + top, size: Math.max(0, this.viewport.size - top - bottom) };
    }

    private lineStart(point: SpokenPoint): number | undefined {
        const lines = this.lines[point.piece];
        if (!lines || lines.offsets.length === 0) return undefined;
        let i = 0;
        while (i + 1 < lines.offsets.length && lines.offsets[i + 1] <= point.offset) i++;
        return lines.starts[i];
    }

    // The spoken word, or the timed position for voices without word boundaries, or the start of the utterance.
    private spokenPoint(): SpokenPoint | undefined {
        const utterance = this.speech.getCurrentContent();
        if (!utterance) return undefined;
        if (this.wordLocator?.text && this.sendsBoundaries()) {
            const word = this.wordPoint({ cssSelector: getCssSelector(this.wordLocator.locations), text: this.wordLocator.text });
            if (word) return word;
        }
        if (!this.sendsBoundaries() && this.progress.speaking) {
            const timed = this.pointAt(utterance, this.progress.elapsed() * this.speed());
            if (timed) return timed;
        }
        return this.utteranceStart(utterance);
    }

    private utteranceStart(utterance: ReadiumSpeechUtterance): SpokenPoint | undefined {
        const index = this.watchedPieces.get(this.piecesOf(utterance)[0]);
        return index === undefined ? undefined : { piece: index, offset: 0 };
    }

    // A word comes as its piece's locate with the text split around it.
    private wordPoint(locate: LocatorOptions): SpokenPoint | undefined {
        const utterance = this.speech.getCurrentContent();
        const text = locate.text;
        if (!utterance || !text) return undefined;
        const whole = (text.before ?? "") + (text.highlight ?? "") + (text.after ?? "");
        const piece = this.piecesOf(utterance).find(piece => piece.cssSelector === locate.cssSelector && piece.text?.highlight === whole);
        const index = piece && this.watchedPieces.get(piece);
        return index === undefined ? undefined : { piece: index, offset: ReadAloudNavigator.collapsed(text.before ?? "").length };
    }

    // The point `chars` characters into `utterance`.
    private pointAt(utterance: ReadiumSpeechUtterance, chars: number): SpokenPoint | undefined {
        let rest = chars;
        for (const piece of this.piecesOf(utterance)) {
            const index = this.watchedPieces.get(piece);
            const length = ReadAloudNavigator.collapsed(piece.text?.highlight ?? "").length;
            if (index !== undefined && rest < length) return { piece: index, offset: Math.max(0, Math.floor(rest)) };
            rest -= length;
        }
        return undefined;
    }

    // A locator for the character at `point`, which going to shows the line or column it starts.
    private pointLocator(point: SpokenPoint): Locator | undefined {
        const piece = [...this.watchedPieces].find(([, index]) => index === point.piece)?.[0];
        const highlight = piece?.text?.highlight;
        if (!piece || !highlight) return undefined;
        const at = ReadAloudNavigator.rawOffset(highlight, point.offset);
        return this.locatorFor({
            ...piece,
            domRange: undefined,
            text: { before: highlight.slice(0, at), highlight: highlight.slice(at, at + 1), after: highlight.slice(at + 1) },
        });
    }

    // Times the turn to the next line or column to follow, for voices without word boundaries.
    private armBreak() {
        this.clearBreak();
        const utterance = this.speech.getCurrentContent();
        const viewport = this.visibleViewport();
        if (!utterance || this._detached || this.sendsBoundaries() || !this.progress.speaking || !viewport || this.centerPoint(utterance)) return;
        const end = viewport.pos + viewport.size - LAYOUT_TOLERANCE;
        let before = 0;
        for (const piece of this.piecesOf(utterance)) {
            const index = this.watchedPieces.get(piece);
            const lines = index === undefined ? null : this.lines[index];
            const ahead = lines?.starts.findIndex(start => start >= end) ?? -1;
            if (index !== undefined && lines && ahead >= 0) {
                const point = { piece: index, offset: lines.offsets[ahead] };
                const delay = (before + point.offset) / this.speed() - this.progress.elapsed();
                this.breakTimer = setTimeout(() => {
                    this.breakTimer = undefined;
                    const locator = this.pointLocator(point);
                    if (locator) this.follow(locator);
                }, Math.max(0, delay * 1000));
                return;
            }
            before += ReadAloudNavigator.collapsed(piece.text?.highlight ?? "").length;
        }
    }

    private clearBreak() {
        clearTimeout(this.breakTimer);
        this.breakTimer = undefined;
    }

    private sendsBoundaries(): boolean {
        return this.spokenVoice?.controls?.boundary !== false;
    }

    private voiceName(): string {
        return this.spokenVoice?.name ?? "";
    }

    private speed(): number {
        return this.progress.speed(this.voiceName(), this.speech.settings.rate);
    }

    private static sameQueue(a: ReadiumSpeechUtterance[], b: ReadiumSpeechUtterance[]): boolean {
        return a.length === b.length && a.every((utterance, i) => utterance === b[i]);
    }

    // The frame counts offsets with each run of whitespace as one character.
    private static collapsed(text: string): string {
        return text.replace(/\s+/g, " ");
    }

    // The offset in `text` of the character `collapsed` characters in, once whitespace runs are collapsed.
    private static rawOffset(text: string, collapsed: number): number {
        let count = 0;
        for (let i = 0; i < text.length; i++) {
            if (/\s/.test(text[i]) && i > 0 && /\s/.test(text[i - 1])) continue;
            if (count === collapsed) return i;
            count++;
        }
        return text.length;
    }

    private locatorFor(locate: LocatorOptions): Locator | undefined {
        if (!locate.href) return undefined;
        const link = this.navigator.publication.readingOrder.findWithHref(locate.href.split("#")[0]);
        if (!link) return undefined;
        const { text, locations } = createLocator(locate, { location: { href: link.href } } as Window);
        return new Locator({ href: link.href, type: link.type ?? "text/html", text, locations });
    }

    // Navigators without a layout of their own (WebPub) scroll.
    private layout(): Layout {
        const metadata = this.navigator.publication.metadata;
        if (metadata.conformsTo?.includes(Profile.DIVINA) || metadata.effectiveLayout === Layout.fixed) return Layout.fixed;
        return this.navigator.layout === Layout.reflowable ? Layout.reflowable : Layout.scrolled;
    }

    // The override comes first, in place of the metadata's primary language it corrects.
    private publicationLanguages(languageOverride: string | null): string[] {
        const languages = this.navigator.publication.metadata.languages ?? [];
        return languageOverride ? [languageOverride, ...languages.slice(1)] : languages;
    }

    // Speech knows nothing of pages and spreads, so it never auto-pauses at them itself.
    private static speechPreferences(preferences: IReadAloudPreferences, metadataLanguage?: string): SpeechPreferences {
        const { autoPause, languageOverride, startInViewport, keepCentered, detachable, readFromPointer, utteranceStyle, wordStyle, ...speech } = preferences;
        const ownScope = autoPause === ReadAloudAutoPause.page || autoPause === ReadAloudAutoPause.spread;
        return new SpeechPreferences({
            ...speech,
            autoPause: ownScope ? ReadAloudAutoPause.none : autoPause,
            languageOverrides: languageOverride && metadataLanguage ? { [metadataLanguage]: languageOverride } : null
        });
    }

    private setLoading(loading: boolean) {
        this.loading = loading;
        this.notifyState();
    }

    private lockNavigation(locked: boolean) {
        if (locked === this.navigationLocked) return;
        this.navigationLocked = locked;
        this.navigator.lockNavigation?.(locked);
    }

    // Unsupported or denied (e.g. insecure context, battery saver) leaves the screen as it is.
    private holdWakeLock(held: boolean) {
        if (!this.keepAwake || held === this.wakeLockWanted) return;
        this.wakeLockWanted = held;
        if (held) this.requestWakeLock();
        else this.releaseWakeLock();
    }

    private requestWakeLock() {
        this.releaseWakeLock();
        const request: Promise<WakeLockSentinel | undefined> | undefined = navigator.wakeLock?.request("screen").then(sentinel => {
            // Browsers may also release it while visible (e.g. battery saver).
            sentinel.addEventListener("release", () => {
                if (this.wakeLock === request && document.visibilityState === "visible") this.requestWakeLock();
            });
            return sentinel;
        }).catch(() => undefined);
        this.wakeLock = request;
    }

    // Chained on the request, as a pending one can't be cancelled.
    private releaseWakeLock() {
        void this.wakeLock?.then(sentinel => sentinel?.release()).catch(() => {});
        this.wakeLock = undefined;
    }

    private notifyState() {
        const state = this.state;
        if (state === "playing" || state === "idle") this.pausedByUser = false;
        // Not speech's own "loading", from which it settles paused without an event.
        // Navigation stays locked through paused loads, as they move the reader once ready.
        this.lockNavigation(!this.detachable && (this.loading || state === "playing"));
        this.holdWakeLock(this.loading ? !this.loadPaused : state === "playing");
        if (state === this.lastState) return;
        this.lastState = state;
        this.listeners.stateChanged?.(state);
    }
}
