import { Link, Publication } from "@readium/shared";
import { WebAudioEngine } from "./engine/WebAudioEngine";

const UPPER_BOUNDARY = 1;
const LOWER_BOUNDARY = 1;

export class AudioPoolManager {
    private readonly pool: Map<string, HTMLAudioElement> = new Map();
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
     * Ensures an audio element exists in the pool for the given href.
     * If one already exists, it is left untouched (preserving its buffered data).
     */
    private ensure(href: string): HTMLAudioElement {
        let element = this.pool.get(href);
        if (!element) {
            element = document.createElement("audio");
            element.preload = "auto";
            // When Web Audio is active CORS already succeeded, so preload
            // with crossOrigin to avoid a destructive reload at swap time.
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
     */
    private update(currentIndex: number): void {
        const items = this._publication.readingOrder.items;
        const keep = new Set<string>();

        for (let j = 0; j < items.length; j++) {
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
     * Sets the current audio for playback at the given track index.
     * The element is always sourced from the pool — never loaded ad-hoc on the engine.
     */
    setCurrentAudio(currentIndex: number, _direction: 'forward' | 'backward'): void {
        const href = this.pickPlayableHref(this._publication.readingOrder.items[currentIndex]);
        const element = this.ensure(href);

        this.audioEngine.setMediaElement(element);

        // Remove from pool so the engine fully owns it and we don't dispose it
        this.pool.delete(href);

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
