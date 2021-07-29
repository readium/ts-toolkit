import { Link, Locator, Publication } from '@jellybooks/shared-test';
import { Controller } from './Controller';

/**
 * Navigator for navigation of e-book
 * Manages the controller to render content
 */
export abstract class Navigator {
  public publication: Publication;

  public controller?: Controller;

  /**
   * Called when the current position in the publication changed. You should save the locator here to restore the last read page.
   */
  public onLocationDidChange?: (locator: Locator) => Promise<void>;

  /**
   * Called when an error must be reported to the user.
   */
  public onPresentError?: (error: Error) => Promise<void>;

  /**
   * Called when the user tapped an external URL. The default implementation opens the URL with the default browser.
   */
  public onPresentExternalURL?: (url: URL) => Promise<void>;

  /**
   * Called when the user taps on a link referring to a note.
   *
   * Return `true` to navigate to the note, or `false` if you intend to present the
   * note yourself, using its `content`. `link.type` contains information about the
   * format of `content` and `referrer`, such as `text/html`.
   */
  public onShouldNavigateToNoteAt?: (
    link: Link,
    content: String,
    referrer?: String
  ) => Promise<boolean>;

  /**
   *
   * Creates a Navigator
   */
  protected constructor(publication: Publication) {
    this.publication = publication;
  }

  /**
   * Current position in the publication.
   * Can be used to save a bookmark to the current position.
   */
  public currentLocation?: Locator;

  /**
   * Moves to the position in the publication correponding to the given `Locator`.
   * Returns true if the navigator is able to move to the locator
   */
  public abstract goToLocator(
    locator: Locator,
    animated: boolean
  ): Promise<boolean>;

  /**
   * Moves to the position in the publication correponding to the given `link`.
   * Returns true if the navigator is able to move to the link
   */
  public abstract goToLink(link: Link, animated: boolean): Promise<boolean>;

  /**
   * Moves to the next content portion (eg. page) in the reading progression direction.
   * Returns true the navigator is able to move to the next content portion
   */
  public abstract goForward(animated: boolean): Promise<boolean>;

  /**
   * Moves to the previous content portion (eg. page) in the reading progression direction.
   * Returns true the navigator is able to move to the previous content portion
   */
  public abstract goBackward(animated: boolean): Promise<boolean>;

  public async setController(controller: Controller): Promise<void> {
    this.controller = controller;
  }
}
