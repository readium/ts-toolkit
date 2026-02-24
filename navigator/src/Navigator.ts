import { Link, Locator, Publication, ReadingProgression } from "@readium/shared";

type cbb = (ok: boolean) => void;

export interface ProgressionRange {
    start: number;
    end: number;
}

export interface VisualNavigatorViewport {
    readingOrder: string[];  // Array of href strings for visible resources
    progressions: Map<string, ProgressionRange>;  // Map from href to visible scroll progression range
    positions: number[] | null;  // Range of visible positions
}

export abstract class Navigator {
    abstract get publication(): Publication; // Publication rendered by this navigator.
    abstract get currentLocator(): Locator; // Current position (detailed) in the publication. Can be used to save a bookmark to the current position.

    /**
     * Moves to the position in the publication corresponding to the given {Locator}.
     */
    abstract go(locator: Locator, animated: boolean, cb: cbb): void;

    /**
     * Moves to the position in the publication targeted by the given link.
     */
    abstract goLink(link: Link, animated: boolean, cb: cbb): void;

    /**
     * Moves to the next content portion (eg. page) in the reading progression direction.
     */
    abstract goForward(animated: boolean, cb: cbb): void;

    /**
     * Moves to the previous content portion (eg. page) in the reading progression direction.
     */
    abstract goBackward(animated: boolean, cb: cbb): void;

    // TODO listener

    /**
     * Destroy all resources associated with this navigator. Synonymous with "unmount"
     */
    abstract destroy(): void;
}

export abstract class VisualNavigator extends Navigator {
    /**
     * Current reading progression direction.
     */
     abstract get readingProgression(): ReadingProgression;


     /**
      * Moves to the left content portion (eg. page) relative to the reading progression direction.
      */
     goLeft(animated = false, completion: cbb) {
        if(this.readingProgression === ReadingProgression.ltr)
            this.goBackward(animated, completion);
        else if(this.readingProgression === ReadingProgression.rtl)
            this.goForward(animated, completion);
     }

     /**
      * Moves to the right content portion (eg. page) relative to the reading progression direction.
      */
     goRight(animated = false, completion: cbb) {
        if(this.readingProgression === ReadingProgression.ltr)
            this.goForward(animated, completion);
        else if(this.readingProgression === ReadingProgression.rtl)
            this.goBackward(animated, completion);
     }
}

export abstract class MediaNavigator extends Navigator {
    /**
     * Current playback state - is media currently playing?
     */
    abstract get isPlaying(): boolean;

    /**
     * Current playback state - is media currently paused?
     */
    abstract get isPaused(): boolean;

    /**
     * Duration of current media resource in seconds
     */
    abstract get duration(): number;

    /**
     * Current time in seconds within the media resource
     */
    abstract get currentTime(): number;

    /**
     * Play the current media resource
     */
    abstract play(): void;

    /**
     * Pause the currently playing media
     */
    abstract pause(): void;

    /**
     * Stop playback and reset to beginning
     */
    abstract stop(): void;

    /**
     * Seek to specific time in seconds
     */
    abstract seek(time: number): void;

    /**
     * Jump forward or backward by specified seconds
     */
    abstract jump(seconds: number): void;

    /**
     * Skip forward by the configured interval
     */
    abstract skipForward(): void;

    /**
     * Skip backward by the configured interval
     */
    abstract skipBackward(): void;
}