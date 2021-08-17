/* Copyright 2021 Readium Foundation. All rights reserved.
 * Use of this source code is governed by a BSD-style license,
 * available in the LICENSE file present in the Github repository of the project.
 */

import { ReadingProgression } from '@readium/shared';
import { INavigator, Navigator } from './Navigator';
import { INavigatorDelegate, NavigatorDelegate } from './Navigator';
import { IController, IPoint } from './ui';

/// A navigator rendering the publication visually on-screen.
export interface IVisualNavigator extends INavigator {
  /// Viewport view.
  view: IController;

  /// Current reading progression direction.
  readingProgression: ReadingProgression;

  /// Moves to the left content portion (eg. page) relative to the reading progression direction.
  goLeft(): Promise<boolean>;

  /// Moves to the right content portion (eg. page) relative to the reading progression direction.
  goRight(): Promise<boolean>;
}

export abstract class VisualNavigator extends Navigator
  implements IVisualNavigator {
  public abstract get view(): IController;

  public abstract get readingProgression(): ReadingProgression;

  public goLeft(): Promise<boolean> {
    switch (this.readingProgression) {
      case ReadingProgression.ltr:
      case ReadingProgression.ttb:
      case ReadingProgression.auto:
        return this.goBackward();
      default:
        return this.goForward();
    }
  }

  public goRight(): Promise<boolean> {
    switch (this.readingProgression) {
      case ReadingProgression.ltr:
      case ReadingProgression.ttb:
      case ReadingProgression.auto:
        return this.goForward();
      default:
        return this.goBackward();
    }
  }
}

export interface IVisualNavigatorDelegate extends INavigatorDelegate {
  /// Called when the user tapped the publication, and it didn't trigger any internal action.
  /// The point is relative to the navigator's view.
  OnDidTapAt(navigator: IVisualNavigator, lpoint: IPoint): void;
}

export abstract class VisualNavigatorDelegate extends NavigatorDelegate
  implements IVisualNavigatorDelegate {
  public OnDidTapAt(navigator: IVisualNavigator, lpoint: IPoint): void {
    // Optional
  }
}
