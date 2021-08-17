/* Copyright 2021 Readium Foundation. All rights reserved.
 * Use of this source code is governed by a BSD-style license,
 * available in the LICENSE file present in the Github repository of the project.
 */

import { Link, Locator } from '@readium/shared';

/**
 * Navigator for navigation of e-book
 * Manages the controller to render content
 */
export interface INavigator {
  /**
   * Current position in the publication.
   * Can be used to save a bookmark to the current position.
   */
  currentLocation?: Locator;

  /**
   * Moves to the position in the publication correponding to the given `Locator`.
   * Returns true if the navigator is able to move to the locator
   */
  goToLocator(locator: Locator): Promise<boolean>;

  /**
   * Moves to the position in the publication correponding to the given `link`.
   * Returns true if the navigator is able to move to the link
   */
  goToLink(link: Link): Promise<boolean>;

  /**
   * Moves to the next content portion (eg. page) in the reading progression direction.
   * Returns true the navigator is able to move to the next content portion
   */
  goForward(): Promise<boolean>;

  /**
   * Moves to the previous content portion (eg. page) in the reading progression direction.
   * Returns true the navigator is able to move to the previous content portion
   */
  goBackward(): Promise<boolean>;
}

export abstract class Navigator implements INavigator {
  public abstract get currentLocation(): Locator | undefined;

  /**
   * Adds default values for the parameters.
   */
  public goToLocator(locator: Locator): Promise<boolean> {
    return this.goToLocator(locator);
  }

  /**
   * Adds default values for the parameters.
   */
  public goToLink(link: Link): Promise<boolean> {
    return this.goToLink(link);
  }

  /**
   * Adds default values for the parameters.
   */
  public goForward(): Promise<boolean> {
    return this.goForward();
  }

  /**
   * Adds default values for the parameters.
   */
  public goBackward(): Promise<boolean> {
    return this.goBackward();
  }
}

export interface INavigatorDelegate {
  /// Called when the current position in the publication changed. You should save the locator here to restore the last read page.
  OnLocationDidChage(navigator: INavigator, locator: Locator): void;

  /// Called when an error must be reported to the user.
  OnPresentError(navigator: INavigator, error: NavigatorError): void;

  /// Called when the user tapped an external URL. The default implementation opens the URL with the default browser.
  OnPresentExternalURL(navigator: INavigator, url: URL): void;

  /// Called when the user taps on a link referring to a note.
  ///
  /// Return `true` to navigate to the note, or `false` if you intend to present the
  /// note yourself, using its `content`. `link.type` contains information about the
  /// format of `content` and `referrer`, such as `text/html`.
  OnShouldNavigateToNoteAt(
    navigator: INavigator,
    link: Link,
    content: string,
    referrer?: string
  ): boolean;
}

export abstract class NavigatorDelegate implements INavigatorDelegate {
  public abstract OnLocationDidChage(
    navigator: INavigator,
    locator: Locator
  ): void;

  public abstract OnPresentError(
    navigator: INavigator,
    error: NavigatorError
  ): void;

  public OnPresentExternalURL(navigator: INavigator, url: URL): void {
    window.open(url.toString());
  }

  public OnShouldNavigateToNoteAt(
    navigator: INavigator,
    link: Link,
    content: string,
    referrer?: string
  ): boolean {
    return true;
  }
}

export class NavigatorError extends Error {}

/// The user tried to copy the text selection but the DRM License doesn't allow it.
export class NavigatorCopyForbiddenError extends Error {
  constructor() {
    super('Copy forbidden');
  }
}
