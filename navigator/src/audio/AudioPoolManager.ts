import { Link, Publication } from "@readium/shared";
import { WebAudioEngine } from "./engine/WebAudioEngine.ts";
import type { IAudioContentProtectionConfig } from "./AudioNavigator.ts";

const UPPER_BOUNDARY = 1;
const LOWER_BOUNDARY = 1;

export class AudioPoolManager {
    private readonly pool: Map<string, HTMLAudioElement> = new Map();
    private _audioEngine: WebAudioEngine;
    private readonly _publication: Publication;
    private readonly _supportedAudioTypes: Map<string, "probably" | "maybe">;

    constructor(audioEngine: WebAudioEngine, publication: Publication, contentProtection: IAudioContentProtectionConfig = {}) {
        this._audioEngine = audioEngine;
        this._publication = publication;
        this._supportedAudioTypes = this.detectSupportedAudioTypes();

        if (contentProtection.disableRemotePlayback) {
            this._audioEngine.getMediaElement().disableRemotePlayback = true;
        }
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
        const base = this._publication.baseURL;
        const candidates = [link, ...(link.alternates?.items ?? [])];
        let best: { href: string; confidence: "probably" | "maybe" } | undefined;
        for (const candidate of candidates) {
            if (!candidate.type) continue;
            const confidence = this._supportedAudioTypes.get(candidate.type);
            if (!confidence) continue;
            const href = candidate.toURL(base) ?? candidate.href;
            if (confidence === "probably") return href;
            if (!best) best = { href, confidence };
        }
        return best?.href ?? (link.toURL(base) ?? link.href);
    }

    get audioEngine(): WebAudioEngine {
        return this._audioEngine;
    }

    /**
     * Ensures an audio element exists in the pool for the given href.
     * If one already exists, it is left untouched (preserving its buffered data).
     */
    private ensure(href: string): HTMLAudioElement {
        let element = this.pool.get(href);
        if (!element) {
            element = document.createElement("audio");
            element.preload = "auto";
            // Match the primary element's CORS mode so cached responses
            // are reusable when changeSrc() loads this href on it.
            if (this._audioEngine.isWebAudioActive) {
                element.crossOrigin = "anonymous";
            }
            element.src = href;
            element.load();
            this.pool.set(href, element);
        }
        return element;
    }

    /**
     * Updates the pool around the given index: ensures elements exist within
     * the LOWER_BOUNDARY and disposes those beyond the UPPER_BOUNDARY.
     * The current track is excluded — the primary engine element represents it.
     */
    private update(currentIndex: number): void {
        const items = this._publication.readingOrder.items;
        const keep = new Set<string>();

        for (let j = 0; j < items.length; j++) {
            if (j === currentIndex) continue; // primary element handles the current track
            const href = this.pickPlayableHref(items[j]);
            if (j >= currentIndex - LOWER_BOUNDARY && j <= currentIndex + LOWER_BOUNDARY) {
                this.ensure(href);
                keep.add(href);
            } else if (j >= currentIndex - UPPER_BOUNDARY && j <= currentIndex + UPPER_BOUNDARY) {
                // Between lower and upper: keep if already loaded, don't create
                if (this.pool.has(href)) {
                    keep.add(href);
                }
            }
        }

        // Dispose elements beyond the upper boundary
        for (const [href, element] of this.pool) {
            if (!keep.has(href)) {
                element.removeAttribute("src");
                element.load(); // release network resources
                this.pool.delete(href);
            }
        }
    }

    /**
     * Sets the current audio for playback at the given track index by changing
     * the src on the persistent primary element. This preserves the RemotePlayback
     * session and any Web Audio graph connections across track changes.
     */
    setCurrentAudio(currentIndex: number, _direction: 'forward' | 'backward'): void {
        const href = this.pickPlayableHref(this._publication.readingOrder.items[currentIndex]);
        this.audioEngine.changeSrc(href);

        // Discard any pool entry for this href — the primary element owns it now
        if (this.pool.has(href)) {
            const existing = this.pool.get(href)!;
            existing.removeAttribute("src");
            existing.load();
            this.pool.delete(href);
        }

        // Manage the pool around the new position
        this.update(currentIndex);
    }

    destroy(): void {
        this.audioEngine.stop();
        for (const [, element] of this.pool) {
            element.removeAttribute("src");
            element.load();
        }
        this.pool.clear();
    }
}
