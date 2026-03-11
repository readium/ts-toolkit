import { Publication } from "@readium/shared";
import { WebAudioEngine } from "./engine/WebAudioEngine";
export class AudioPoolManager {
    private preloadedElements: Map<string, HTMLAudioElement> = new Map();
    private _audioEngine: WebAudioEngine;

    constructor(audioEngine: WebAudioEngine) {
        this._audioEngine = audioEngine;
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
    setCurrentAudio(href: string, publication: Publication, currentIndex: number, direction: 'forward' | 'backward'): void {
        const preloadedElement = this.get(href);
        if (preloadedElement) {
            this.audioEngine.setMediaElement(preloadedElement);
            this.clear(href);
        } else {
            this.audioEngine.loadAudio(href);
        }
        this.preloadAdjacent(publication, currentIndex, direction);
    }
    preload(href: string): void {
        if (this.preloadedElements.has(href)) {
            return; // Already preloaded
        }

        const audioElement = document.createElement("audio");
        audioElement.crossOrigin = "anonymous";
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
    preloadNext(publication: Publication, currentIndex: number): void {
        const nextIndex = currentIndex + 1;
        if (nextIndex < publication.readingOrder.items.length) {
            const nextLink = publication.readingOrder.items[nextIndex];
            if (nextLink.href) {
                this.preload(nextLink.href);
            }
        }
    }

    /**
     * Preloads the previous track in the reading order.
     * @param publication The publication containing the reading order.
     * @param currentIndex The current track index.
     */
    preloadPrevious(publication: Publication, currentIndex: number): void {
        const prevIndex = currentIndex - 1;
        if (prevIndex >= 0) {
            const prevLink = publication.readingOrder.items[prevIndex];
            if (prevLink.href) {
                this.preload(prevLink.href);
            }
        }
    }

    /**
     * Preloads adjacent tracks (previous and next) for smoother navigation.
     * @param publication The publication containing the reading order.
     * @param currentIndex The current track index.
     * @param direction The navigation direction ('forward' or 'backward').
     */
    preloadAdjacent(publication: Publication, currentIndex: number, direction: 'forward' | 'backward' = 'forward'): void {
        if (direction === 'forward') {
            this.preloadNext(publication, currentIndex);
            this.preloadPrevious(publication, currentIndex);
        } else {
            this.preloadPrevious(publication, currentIndex);
            this.preloadNext(publication, currentIndex);
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
