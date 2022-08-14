import { Link } from "@readium/shared/src/publication/Link";
import { Locator } from "@readium/shared/src/publication/Locator";
import { Publication } from "@readium/shared/src/publication/Publication";
import { ReadingProgression } from "@readium/shared/src/publication/ReadingProgression";

type cbv = () => void;
type cbb = (ok: boolean) => void;

export abstract class Navigator {
    abstract get publication(): Publication; // Publication rendered by this navigator.
    abstract get currentLocator(): Locator; // Current position (detailed) in the publication. Can be used to save a bookmark to the current position.

    /**
     * Moves to the position in the publication corresponding to the given {Locator}.
     */
    abstract go(locator: Locator, animated: boolean, cb: cbv): void;

    /**
     * Moves to the position in the publication targeted by the given link.
     */
    abstract goLink(link: Link, animated: boolean, cb: cbv): void;

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
    abstract destroy();
}

export abstract class VisualNavigator extends Navigator {
    /**
     * Current reading progression direction.
     */
     abstract get readingProgression(): ReadingProgression;


     /**
      * Moves to the left content portion (eg. page) relative to the reading progression direction.
      */
     goLeft(animated = false, completion: cbv) {
        if(this.readingProgression === ReadingProgression.ltr || this.readingProgression === ReadingProgression.ttb || this.readingProgression === ReadingProgression.auto)
            this.goBackward(animated, completion);
        else if(this.readingProgression === ReadingProgression.rtl || this.readingProgression === ReadingProgression.btt)
            this.goForward(animated, completion);
     }

     /**
      * Moves to the right content portion (eg. page) relative to the reading progression direction.
      */
     goRight(animated = false, completion: cbv) {
        if(this.readingProgression === ReadingProgression.ltr || this.readingProgression === ReadingProgression.ttb || this.readingProgression === ReadingProgression.auto)
            this.goForward(animated, completion);
        else if(this.readingProgression === ReadingProgression.rtl || this.readingProgression === ReadingProgression.btt)
            this.goBackward(animated, completion);
     }
}


// TODO MediaNavigator