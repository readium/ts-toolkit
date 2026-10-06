import { Layout, Locator, Profile, getCssSelector } from "@readium/shared";
import {
    createLocator,
    LocatorOptions,
    ReadiumSpeechNavigator,
    ReadiumSpeechPlaybackEngine,
    ReadiumSpeechPlaybackEvent,
    ReadiumSpeechPlaybackState,
    ReadiumSpeechUtterance,
    ReadiumSpeechVoice,
    resolveUtteranceLocate,
    SpeechPreferences,
    WebSpeechEngine,
} from "@readium/speech";
import { Navigator, VisualNavigatorViewport } from "../Navigator.ts";
import { Decoration, DecorableNavigator } from "../decorations/index.ts";
import { GuidedNavigationSource, PublicationGuidedNavigationSource } from "./GuidedNavigationSource.ts";
import { GuidedNavigationPool, ReadingUnit, ReadingUnits } from "./ReadingUnit.ts";
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

export interface ReadAloudUtterance {
    text: string;
    /** One locator per piece of the utterance, each in its own resource. */
    locators: Locator[];
}

export interface ReadAloudListeners {
    stateChanged?: (state: ReadAloudState) => void;
    utteranceChanged?: (utterance: ReadAloudUtterance) => void;
    wordChanged?: (locator: Locator, word: string) => void;
    error?: (error: unknown) => void;
}

export interface ReadAloudConfiguration {
    /** Defaults to a `WebSpeechEngine`. */
    engine?: ReadiumSpeechPlaybackEngine;
    source?: GuidedNavigationSource;
    preferences?: IReadAloudPreferences;
    defaults?: IReadAloudDefaults;
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

/** A `WebSpeechEngine` whose voices, and default voice, are those of the publication's languages. */
class PublicationWebSpeechEngine extends WebSpeechEngine {
    constructor(private readonly languages?: string[]) {
        super();
    }

    override initialize(): Promise<boolean> {
        return super.initialize({ languages: this.languages?.length ? this.languages : undefined });
    }
}

const UTTERANCE_GROUP = "readaloud-utterance";
const WORD_GROUP = "readaloud-word";
const FOLLOW_INTERVAL = 1000;

/**
 * Reads a publication aloud with a speech engine, alongside the navigator displaying it.
 * The spoken utterance and word are highlighted, and the navigator follows them.
 */
export class ReadAloudNavigator {
    private readonly speech: ReadiumSpeechNavigator;
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
    // Speech stopped while following the next utterance, to tell whether that reaches new columns.
    private turning?: TurningPosition;
    private pendingFollow?: Locator;
    private followedHref?: string;
    private followTimer?: ReturnType<typeof setTimeout>;
    private unit?: ReadingUnit;
    private loading = false;
    private loadToken = 0;
    private lastState: ReadAloudState = "idle";

    constructor(
        private readonly navigator: Navigator & Partial<DecorableNavigator> & { readonly viewport?: VisualNavigatorViewport; readonly layout?: Layout },
        private readonly listeners: ReadAloudListeners = {},
        configuration: ReadAloudConfiguration = {}
    ) {
        this.pool = new GuidedNavigationPool(navigator.publication, configuration.source ?? new PublicationGuidedNavigationSource(navigator.publication));
        this.units = new ReadingUnits(navigator);
        this._preferences = new ReadAloudPreferences(configuration.preferences);
        this._defaults = new ReadAloudDefaults(configuration.defaults);
        this.speech = new ReadiumSpeechNavigator(configuration.engine ?? new PublicationWebSpeechEngine(navigator.publication.metadata.languages), {
            preferences: ReadAloudNavigator.speechPreferences(this._preferences),
            defaults: ReadAloudNavigator.speechPreferences({ ...this._defaults.speech, autoPause: this._defaults.autoPause }),
        });
        this._settings = new ReadAloudSettings(this.speech.settings, this._preferences, this._defaults);
        this.speech.setSpeakInContentLanguage(this._settings.speakInContentLanguage);
        this.listen();
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
        await this.start(from ?? this.navigator.currentLocator);
    }

    pause(): void {
        if (this.turning) this.pauseTurning();
        else if (!this.pausedBefore) this.speech.pause();
    }

    stop(): void {
        this.loadToken++;
        this.pausedBefore = undefined;
        this.turning = undefined;
        this.setLoading(false);
        this.speech.stop();
    }

    /** Moves to the next utterance, continuing into the next reading unit at the end of this one. */
    async next(): Promise<boolean> {
        if (this.turning) this.pauseTurning();
        if (this.pausedBefore) return this.movePaused(this.pausedBefore, 1);
        if (this.speech.next()) return true;
        if (!this.unit || !this.units.linkAfter(this.unit)) return false;
        return this.loadUnit(() => this.units.after(this.unit!), () => 0);
    }

    /** Moves to the previous utterance, continuing into the previous reading unit at the start of this one. */
    async previous(): Promise<boolean> {
        if (this.turning) this.pauseTurning();
        if (this.pausedBefore) return this.movePaused(this.pausedBefore, -1);
        if (this.speech.previous()) return true;
        if (!this.unit || !this.units.linkBefore(this.unit)) return false;
        return this.loadUnit(() => this.units.before(this.unit!), queue => queue.length - 1);
    }

    getVoices(): Promise<ReadiumSpeechVoice[]> {
        return this.speech.getVoices();
    }

    setVoice(voice: ReadiumSpeechVoice | string): void {
        this.speech.setVoice(voice);
    }

    getCurrentVoice(): ReadiumSpeechVoice | null {
        return this.speech.getCurrentVoice();
    }

    get settings(): Readonly<ReadAloudSettings> {
        return Object.freeze({ ...this._settings });
    }

    get preferencesEditor(): ReadAloudPreferencesEditor {
        if (this._preferencesEditor === null) {
            this._preferencesEditor = new ReadAloudPreferencesEditor(this._preferences, this.settings, this.speech.settings, this.layout());
        }
        return this._preferencesEditor;
    }

    async submitPreferences(preferences: ReadAloudPreferences): Promise<void> {
        this._preferences = this._preferences.merging(preferences);
        await this.speech.submitPreferences(ReadAloudNavigator.speechPreferences(this._preferences));
        this._settings = new ReadAloudSettings(this.speech.settings, this._preferences, this._defaults);
        this.speech.setSpeakInContentLanguage(this._settings.speakInContentLanguage);
        if (this._preferencesEditor !== null) {
            this._preferencesEditor = new ReadAloudPreferencesEditor(this._preferences, this.settings, this.speech.settings, this.layout());
        }
        this.decorate();
    }

    async destroy(): Promise<void> {
        this.loadToken++;
        this.pausedBefore = undefined;
        this.turning = undefined;
        this.unsubscribers.forEach(unsubscribe => unsubscribe());
        this.unsubscribers.length = 0;
        this.clearHighlights();
        await this.speech.destroy();
    }

    private listen() {
        const on = (type: ReadiumSpeechPlaybackEvent["type"], handler: (event: ReadiumSpeechPlaybackEvent) => void) => {
            this.unsubscribers.push(this.speech.on(type, event => {
                handler(event);
                this.notifyState();
            }));
        };
        on("start", () => this.notifyUtterance());
        on("skip", () => this.notifyUtterance());
        on("boundary", event => {
            if (event.detail?.name !== "word" || !event.detail.locate) return;
            const locator = this.locatorFor(event.detail.locate as LocatorOptions);
            if (!locator) return;
            this.wordLocator = locator;
            this.decorate();
            this.follow(locator);
            this.listeners.wordChanged?.(locator, event.detail.word ?? "");
        });
        on("end", () => {
            const state = this.speech.getState();
            // Speech goes idle once the last utterance of the queue has been spoken.
            if (state === "idle") {
                const unit = this.unit!;
                const link = this.units.linkAfter(unit);
                if (!link) this.clearHighlights();
                else void this.loadUnit(() => this.units.after(unit), () => 0, this.pausesBeforeUnit(link.href));
                return;
            }
            // Paused by speech's own auto-pause otherwise.
            if (state !== "playing") return;
            const queue = this.speech.getContentQueue();
            const index = queue.indexOf(this.speech.getCurrentContent()!);
            if (index < 0 || index + 1 >= queue.length) return;
            if (this.pausesBetween(queue[index], queue[index + 1])) {
                // Stopping, not pausing, cancels the next utterance without a paused engine to resume.
                this.pausedBefore = { unit: this.unit!, index: index + 1, current: true };
                this.speech.stop();
                this.notifyUtterance(queue[index + 1]);
            } else if (this.layout() === Layout.reflowable && this.pausesAtPages()) {
                this.turnTo(index + 1);
            }
        });
        on("error", event => {
            this.clearHighlights();
            this.listeners.error?.(event.detail ?? event);
        });
        on("stop", () => {
            if (!this.pausedBefore && !this.turning) this.clearHighlights();
        });
        for (const type of ["pause", "resume", "idle", "loading", "ready"] as const) on(type, () => {});
    }

    private async start(from: Locator): Promise<void> {
        await this.loadUnit(() => this.units.around(from.href.split("#")[0]), queue => this.startIndex(queue, from));
    }

    private async resumePaused(paused: PausedPosition): Promise<void> {
        if (paused.unit !== this.unit) {
            await this.loadUnit(() => paused.unit, () => paused.index);
            return;
        }
        this.pausedBefore = undefined;
        this.speakFrom(paused.index);
        this.notifyState();
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
    private async loadUnit(find: () => ReadingUnit | undefined, indexIn: (queue: ReadiumSpeechUtterance[]) => number, paused = false): Promise<boolean> {
        const token = ++this.loadToken;
        this.setLoading(true);
        this.pausedBefore = undefined;
        this.turning = undefined;
        this.speech.stop();
        try {
            const unit = find();
            if (!unit) {
                this.setLoading(false);
                return false;
            }
            const { guided, failures } = await this.pool.stitch(unit);
            if (token !== this.loadToken) return false;
            failures.forEach(failure => this.listeners.error?.(failure.error));

            const ready = new Promise<void>(resolve => {
                const off = this.speech.on("ready", () => { off(); resolve(); });
                this.unsubscribers.push(off);
            });
            await this.speech.loadGndContent(guided);
            if (token !== this.loadToken) return false;
            this.unit = unit;

            const queue = this.speech.getContentQueue();
            if (queue.length === 0) {
                this.setLoading(false);
                // Nothing to read in this unit (e.g. only images): continue with the next one.
                if (this.units.linkAfter(unit)) return this.loadUnit(() => this.units.after(unit), () => 0, paused);
                return false;
            }
            await ready;
            if (token !== this.loadToken) return false;
            this.setLoading(false);

            const index = Math.min(Math.max(indexIn(queue), 0), queue.length - 1);
            if (paused) {
                this.pausedBefore = { unit, index, current: true };
                this.notifyUtterance(queue[index]);
                this.notifyState();
            } else {
                this.speakFrom(index);
            }
            return true;
        } catch (error) {
            if (token === this.loadToken) this.setLoading(false);
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
            const pieces = this.piecesOf(queue[i]).filter(piece => piece.href === href);
            if (pieces.length === 0) continue;
            if (first === -1) first = i;
            if (selector && pieces.some(piece => piece.cssSelector === selector)) return i;
            if (byText === -1 && quote && (queue[i].plain ?? "").includes(quote)) byText = i;
        }
        return byText !== -1 ? byText : Math.max(first, 0);
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
        // A hidden document doesn't turn pages until shown again.
        if (!locator || document.hidden) return;
        const turning = { unit: this.unit!, index };
        this.turning = turning;
        this.speech.stop();
        clearTimeout(this.followTimer);
        this.followTimer = undefined;
        this.pendingFollow = undefined;
        const before = this.navigator.viewport?.progressions.get(locator.href);
        const start = before?.start;
        const end = before?.end;
        const settle = (turned: boolean) => {
            clearTimeout(timeout);
            if (this.turning !== turning) return;
            this.turning = undefined;
            if (turned) {
                this.pausedBefore = { ...turning, current: true };
                this.notifyUtterance(next);
            } else {
                this.speakFrom(index);
            }
            this.notifyState();
        };
        // Expired comms callbacks are dropped, never called.
        const timeout = setTimeout(() => settle(false), FOLLOW_INTERVAL);
        this.followedHref = locator.href;
        this.navigator.go(locator, false, ok => {
            const after = this.navigator.viewport?.progressions.get(locator.href);
            settle(ok && after !== undefined && (after.start !== start || after.end !== end));
        });
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
        const locators = this.piecesOf(utterance)
            .map(piece => this.locatorFor(piece))
            .filter((locator): locator is Locator => locator !== undefined);
        this.utteranceLocators = locators;
        this.wordLocator = undefined;
        this.decorate();
        if (locators.length > 0) {
            this.follow(locators[0]);
        } else {
            // Following a whole page again would reset its scroll position.
            const page = this.pageLocator();
            if (page) {
                locators.push(page);
                if (page.href !== this.followedHref) this.follow(page);
            }
        }
        this.listeners.utteranceChanged?.({ text: utterance.plain ?? "", locators });
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
        clearTimeout(this.followTimer);
        this.followTimer = undefined;
        this.pendingFollow = undefined;
        this.followedHref = undefined;
    }

    // Moves the navigator to the spoken position at most once per interval, keeping the latest one,
    // but at once when it moves to another resource.
    private follow(locator: Locator) {
        // A fixed-layout page doesn't scroll, and going to one of the displayed spread can display another.
        if (this.units.displays(locator.href)) return;
        this.pendingFollow = locator;
        if (this.followTimer === undefined || locator.href !== this.followedHref) {
            clearTimeout(this.followTimer);
            this.flushFollow();
        }
    }

    private flushFollow() {
        const locator = this.pendingFollow;
        this.pendingFollow = undefined;
        if (!locator) {
            this.followTimer = undefined;
            return;
        }
        this.followedHref = locator.href;
        this.navigator.go(locator, false, () => {});
        this.followTimer = setTimeout(() => this.flushFollow(), FOLLOW_INTERVAL);
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

    // Speech knows nothing of pages and spreads, so it never auto-pauses at them itself.
    private static speechPreferences(preferences: IReadAloudPreferences): SpeechPreferences {
        const { autoPause, speakInContentLanguage, utteranceStyle, wordStyle, ...speech } = preferences;
        const ownScope = autoPause === ReadAloudAutoPause.page || autoPause === ReadAloudAutoPause.spread;
        return new SpeechPreferences({ ...speech, autoPause: ownScope ? ReadAloudAutoPause.none : autoPause });
    }

    private setLoading(loading: boolean) {
        this.loading = loading;
        this.notifyState();
    }

    private notifyState() {
        const state = this.state;
        if (state === this.lastState) return;
        this.lastState = state;
        this.listeners.stateChanged?.(state);
    }
}
