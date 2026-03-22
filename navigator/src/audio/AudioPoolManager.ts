import { Link, Publication } from "@readium/shared";
import { WebAudioEngine } from "./engine/WebAudioEngine";

export class AudioPoolManager {
    private preloadedElements: Map<string, HTMLAudioElement> = new Map();
    private _audioEngine: WebAudioEngine;
    private readonly _publication: Publication;
    private readonly _supportedAudioTypes: Map<string, "probably" | "maybe">;

    constructor(audioEngine: WebAudioEngine, publication: Publication) {
        this._audioEngine = audioEngine;
        this._publication = publication;
        this._supportedAudioTypes = this.detectSupportedAudioTypes();
    }

    private detectSupportedAudioTypes(): Map<string, "probably" | "maybe"> {
        const audio = document.createElement("audio");
        const unique = new Set<string>();
        for (const link of this._publication.readingOrder.items) {
            if (link.type) unique.add(link.type);
            for (const alt of link.alternates?.items ?? []) {
                if (alt.type) unique.add(alt.type);
            }
        }
        const supported = new Map<string, "probably" | "maybe">();
        for (const type of unique) {
            const result = audio.canPlayType(type);
            if (result !== "") supported.set(type, result as "probably" | "maybe");
        }
        return supported;
    }

    private pickPlayableHref(link: Link): string {
        const candidates = [link, ...(link.alternates?.items ?? [])];
        let best: { href: string; confidence: "probably" | "maybe" } | undefined;
        for (const candidate of candidates) {
            if (!candidate.type) continue;
            const confidence = this._supportedAudioTypes.get(candidate.type);
            if (!confidence) continue;
            if (confidence === "probably") return candidate.href;
            if (!best) best = { href: candidate.href, confidence };
        }
        return best?.href ?? link.href;
    }

    get audioEngine(): WebAudioEngine {
        return this._audioEngine;
    }

    /**
     * Sets the current audio by href, using preloaded element if available or loading otherwise,
     * and preloads adjacent tracks.
     * @param href The URL of the audio resource.
     * @param publication The publication containing the reading order.
     * @param currentIndex The current track index.
     * @param direction The navigation direction ('forward' or 'backward').
     */
    setCurrentAudio(currentIndex: number, direction: 'forward' | 'backward'): void {
        const href = this.pickPlayableHref(this._publication.readingOrder.items[currentIndex]);
        // When Web Audio is active, preloaded elements lack crossOrigin="anonymous"
        // and cannot be connected to MediaElementAudioSourceNode, so bypass the pool.
        const preloadedElement = !this.audioEngine.isWebAudioActive ? this.get(href) : undefined;
        if (preloadedElement) {
            this.audioEngine.setMediaElement(preloadedElement);
            this.clear(href);
        } else {
            this.clear(href);
            this.audioEngine.loadAudio(href);
        }
        this.preloadAdjacent(currentIndex, direction);
    }
    preload(href: string): void {
        if (this.preloadedElements.has(href)) {
            return; // Already preloaded
        }

        const audioElement = document.createElement("audio");
        audioElement.preload = "auto";
        audioElement.src = href;
        audioElement.load(); // Start buffering

        this.preloadedElements.set(href, audioElement);
    }

    /**
     * Retrieves a preloaded audio element by URL.
     * @param href The URL of the audio resource.
     * @returns The preloaded HTMLAudioElement, or undefined if not preloaded.
     */
    get(href: string): HTMLAudioElement | undefined {
        return this.preloadedElements.get(href);
    }

    /**
     * Removes a preloaded element from the pool.
     * @param href The URL of the audio resource.
     */
    clear(href: string): void {
        this.preloadedElements.delete(href);
    }

    /**
     * Preloads the next track in the reading order.
     * @param publication The publication containing the reading order.
     * @param currentIndex The current track index.
     */
    preloadNext(currentIndex: number): void {
        const nextIndex = currentIndex + 1;
        if (nextIndex < this._publication.readingOrder.items.length) {
            const nextLink = this._publication.readingOrder.items[nextIndex];
            this.preload(this.pickPlayableHref(nextLink));
        }
    }

    /**
     * Preloads the previous track in the reading order.
     * @param currentIndex The current track index.
     */
    preloadPrevious(currentIndex: number): void {
        const prevIndex = currentIndex - 1;
        if (prevIndex >= 0) {
            const prevLink = this._publication.readingOrder.items[prevIndex];
            this.preload(this.pickPlayableHref(prevLink));
        }
    }

    /**
     * Preloads adjacent tracks (previous and next) for smoother navigation.
     * @param currentIndex The current track index.
     * @param direction The navigation direction ('forward' or 'backward').
     */
    preloadAdjacent(currentIndex: number, direction: 'forward' | 'backward' = 'forward'): void {
        if (direction === 'forward') {
            this.preloadNext(currentIndex);
            this.preloadPrevious(currentIndex);
        } else {
            this.preloadPrevious(currentIndex);
            this.preloadNext(currentIndex);
        }
    }

    /**
     * Destroys the pool by stopping the engine and clearing all preloaded elements.
     */
    destroy(): void {
        this.audioEngine.stop();
        this.preloadedElements.clear();
    }
}
