import { Layout, Locator, Profile, Publication, getCssSelector } from "@readium/shared";
import {
    createLocator,
    ISpeechDefaults,
    ISpeechPreferences,
    LocatorOptions,
    ReadiumSpeechNavigator,
    ReadiumSpeechPlaybackEngine,
    ReadiumSpeechPlaybackEvent,
    ReadiumSpeechPlaybackState,
    ReadiumSpeechUtterance,
    ReadiumSpeechVoice,
    resolveUtteranceLocate,
    SpeechPreferences,
    SpeechPreferencesEditor,
    SpeechSettings,
} from "@readium/speech";
import { Navigator } from "../Navigator.ts";
import { Decoration, DecorableNavigator, DecorationStyle, DecorationStyleType } from "../decorations/index.ts";
import { GuidedNavigationSource, PublicationGuidedNavigationSource } from "./GuidedNavigationSource.ts";
import { ReadingUnit, ReadingUnitScope, readingUnits, stitch } from "./ReadingUnit.ts";

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
    /** Defaults to "publication" for fixed layouts, "resource" otherwise. */
    scope?: ReadingUnitScope;
    source?: GuidedNavigationSource;
    preferences?: ISpeechPreferences;
    defaults?: ISpeechDefaults;
    /** Style of the utterance being spoken, `null` to not highlight it. */
    utteranceStyle?: DecorationStyle | null;
    /** Style of the word being spoken, `null` to not highlight it. */
    wordStyle?: DecorationStyle | null;
}

// Sentences are only joined across objects, and so across pages, in sentence segmentation.
const READ_ALOUD_DEFAULTS: ISpeechDefaults = { segmentation: "sentence", skip: ["pagebreak"] };

const UTTERANCE_GROUP = "readaloud-utterance";
const WORD_GROUP = "readaloud-word";
const FOLLOW_INTERVAL = 1000;

/**
 * Reads a publication aloud with a speech engine, alongside the navigator displaying it.
 * The spoken utterance and word are highlighted, and the navigator follows them.
 */
export class ReadAloudNavigator {
    private readonly speech: ReadiumSpeechNavigator;
    private readonly source: GuidedNavigationSource;
    private readonly units: ReadingUnit[];
    private readonly unsubscribers: (() => void)[] = [];
    private readonly utteranceStyle: DecorationStyle | null;
    private readonly wordStyle: DecorationStyle | null;
    private pendingFollow?: Locator;
    private followedHref?: string;
    private followTimer?: ReturnType<typeof setTimeout>;
    private unitIndex = -1;
    private loading = false;
    private loadToken = 0;
    private lastState: ReadAloudState = "idle";

    constructor(
        private readonly navigator: Navigator & Partial<DecorableNavigator>,
        engine: ReadiumSpeechPlaybackEngine,
        private readonly listeners: ReadAloudListeners = {},
        configuration: ReadAloudConfiguration = {}
    ) {
        const publication = navigator.publication;
        this.source = configuration.source ?? new PublicationGuidedNavigationSource(publication);
        this.units = readingUnits(publication, configuration.scope ?? ReadAloudNavigator.determineScope(publication));
        this.utteranceStyle = configuration.utteranceStyle === undefined ? { type: DecorationStyleType.Highlight } : configuration.utteranceStyle;
        this.wordStyle = configuration.wordStyle === undefined ? { type: DecorationStyleType.Underline } : configuration.wordStyle;
        this.speech = new ReadiumSpeechNavigator(engine, {
            preferences: configuration.preferences,
            defaults: { ...READ_ALOUD_DEFAULTS, ...configuration.defaults },
        });
        this.listen();
    }

    get state(): ReadAloudState {
        return this.loading ? "loading" : this.speech.getState();
    }

    /**
     * Starts reading from `from`, or resumes when paused.
     * Without `from`, an idle reader starts from the navigator's current position.
     */
    async play(from?: Locator): Promise<void> {
        const state = this.state;
        if (!from && (state === "paused" || state === "ready")) {
            this.speech.play();
            return;
        }
        if (!from && state === "playing") return;
        await this.start(from ?? this.navigator.currentLocator);
    }

    pause(): void {
        this.speech.pause();
    }

    stop(): void {
        this.loadToken++;
        this.setLoading(false);
        this.speech.stop();
    }

    /** Moves to the next utterance, continuing into the next reading unit at the end of this one. */
    async next(): Promise<boolean> {
        if (this.speech.next()) return true;
        if (this.unitIndex + 1 >= this.units.length) return false;
        return this.loadUnitAndPlay(this.unitIndex + 1, () => 0);
    }

    /** Moves to the previous utterance, continuing into the previous reading unit at the start of this one. */
    async previous(): Promise<boolean> {
        if (this.speech.previous()) return true;
        if (this.unitIndex <= 0) return false;
        return this.loadUnitAndPlay(this.unitIndex - 1, queue => queue.length - 1);
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

    get settings(): SpeechSettings {
        return this.speech.settings;
    }

    get preferencesEditor(): SpeechPreferencesEditor {
        return this.speech.preferencesEditor;
    }

    submitPreferences(preferences: SpeechPreferences): Promise<void> {
        return this.speech.submitPreferences(preferences);
    }

    async destroy(): Promise<void> {
        this.loadToken++;
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
            this.decorate(WORD_GROUP, [locator], this.wordStyle);
            this.follow(locator);
            this.listeners.wordChanged?.(locator, event.detail.word ?? "");
        });
        on("end", () => {
            // Speech goes idle once the last utterance of the queue has been spoken.
            if (this.speech.getState() !== "idle") return;
            if (this.unitIndex + 1 < this.units.length) void this.loadUnitAndPlay(this.unitIndex + 1, () => 0);
            else this.clearHighlights();
        });
        on("error", event => {
            this.clearHighlights();
            this.listeners.error?.(event.detail ?? event);
        });
        on("stop", () => this.clearHighlights());
        for (const type of ["pause", "resume", "idle", "loading", "ready"] as const) on(type, () => {});
    }

    private async start(from: Locator): Promise<void> {
        const href = from.href.split("#")[0];
        const unitIndex = this.units.findIndex(unit => unit.links.some(link => link.href === href));
        if (unitIndex === -1) return;
        await this.loadUnitAndPlay(unitIndex, queue => this.startIndex(queue, from));
    }

    private async loadUnitAndPlay(unitIndex: number, indexIn: (queue: ReadiumSpeechUtterance[]) => number): Promise<boolean> {
        const token = ++this.loadToken;
        this.speech.stop();
        this.setLoading(true);
        try {
            const { guided, failures } = await stitch(this.units[unitIndex], this.source);
            if (token !== this.loadToken) return false;
            failures.forEach(failure => this.listeners.error?.(failure.error));

            const ready = new Promise<void>(resolve => {
                const off = this.speech.on("ready", () => { off(); resolve(); });
                this.unsubscribers.push(off);
            });
            await this.speech.loadGndContent(guided);
            if (token !== this.loadToken) return false;
            this.unitIndex = unitIndex;

            const queue = this.speech.getContentQueue();
            if (queue.length === 0) {
                this.setLoading(false);
                // Nothing to read in this unit (e.g. only images): continue with the next one.
                if (unitIndex + 1 < this.units.length) return this.loadUnitAndPlay(unitIndex + 1, () => 0);
                return false;
            }
            await ready;
            if (token !== this.loadToken) return false;
            this.setLoading(false);

            const index = Math.min(Math.max(indexIn(queue), 0), queue.length - 1);
            if (index === 0) this.speech.play();
            else this.speech.jumpTo(index, true);
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

    private notifyUtterance() {
        const utterance = this.speech.getCurrentContent();
        if (!utterance) return;
        const locators = this.piecesOf(utterance)
            .map(piece => this.locatorFor(piece))
            .filter((locator): locator is Locator => locator !== undefined);
        this.decorate(UTTERANCE_GROUP, locators, this.utteranceStyle);
        this.decorate(WORD_GROUP, [], this.wordStyle);
        if (locators.length > 0) this.follow(locators[0]);
        this.listeners.utteranceChanged?.({ text: utterance.plain ?? "", locators });
    }

    private decorate(group: string, locators: Locator[], style: DecorationStyle | null) {
        if (!style) return;
        const decorations: Decoration[] = locators.map((locator, i) => ({ id: `${group}-${i}`, locator, style }));
        this.navigator.applyDecorations?.(decorations, group);
    }

    private clearHighlights() {
        this.decorate(UTTERANCE_GROUP, [], this.utteranceStyle);
        this.decorate(WORD_GROUP, [], this.wordStyle);
        clearTimeout(this.followTimer);
        this.followTimer = undefined;
        this.pendingFollow = undefined;
        this.followedHref = undefined;
    }

    // Moves the navigator to the spoken position at most once per interval, keeping the latest one,
    // but at once when it moves to another resource.
    private follow(locator: Locator) {
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

    // Fixed layouts are read as one sequence, since their sentences continue across pages.
    private static determineScope(publication: Publication): ReadingUnitScope {
        const fixed = publication.metadata.effectiveLayout === Layout.fixed
            || !!publication.metadata.conformsTo?.includes(Profile.DIVINA);
        return fixed ? "publication" : "resource";
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
