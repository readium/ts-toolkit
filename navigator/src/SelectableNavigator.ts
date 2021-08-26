/* Copyright 2021 Readium Foundation. All rights reserved.
 * Use of this source code is governed by a BSD-style license,
 * available in the LICENSE file present in the Github repository of the project.
 */

import { Locator } from '@readium/shared';
import { EditingAction } from './EditingAction';
import {
  INavigator,
  INavigatorDelegate,
  Navigator,
  NavigatorDelegate,
} from './Navigator';
import { IRect } from './ui';

/// Represents a user content selection in a navigator.
///
/// In the case of a text selection, you can get its content using `locator.text.highlight`.
export interface Selection {
  /// Location of the user selection in the `Publication`.
  locator: Locator;

  /// Frame of the bounding rect for the selection, in the coordinate of the navigator view.
  ///
  /// This is only useful in the context of a `VisualNavigator`.
  frame?: IRect;
}

/// A navigator supporting user selection.
export interface ISelectableNavigator extends INavigator {
  /// Currently selected content.
  currentSelection?: Selection;

  /// Clears the current selection.
  clearSelection(): void;
}

export abstract class SelectableNavigator extends Navigator
  implements ISelectableNavigator {
  public abstract get currentSelection(): Selection | undefined;

  public abstract clearSelection(): void;
}

export interface ISelectableNavigatorDelegate extends INavigatorDelegate {
  /// Returns whether the default edit menu (`UIMenuController`) should be displayed for the given `selection`.
  ///
  /// To implement a custom selection pop-up, return false and display your own view using `selection.frame`.
  OnShouldShowMenuForSelection(
    navigator: ISelectableNavigator,
    selection: Selection
  ): boolean;

  /// Returns whether the given `action` should be visible in the edit menu of the given `selection`.
  ///
  /// Implement this delegate method to validate the selection before showing a particular action. For example, making
  /// sure the selected text is not too large for a definition look up.
  OnCanPerformAction(
    navigator: ISelectableNavigator,
    action: EditingAction,
    selection: Selection
  ): boolean;
}

export abstract class SelectableNavigatorDelegate extends NavigatorDelegate
  implements ISelectableNavigatorDelegate {
  public OnShouldShowMenuForSelection(
    navigator: ISelectableNavigator,
    selection: Selection
  ): boolean {
    return true;
  }

  public OnCanPerformAction(
    navigator: ISelectableNavigator,
    action: EditingAction,
    selection: Selection
  ): boolean {
    return true;
  }
}
