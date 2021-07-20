import { Locator, Publication } from "@jellybooks/shared-test";
import { Controller } from "./Controller";

export abstract class Navigator {

  public publication: Publication;
  public controller?: Controller;

  protected constructor(
    publication: Publication,
  ) {
    this.publication = publication;    
  }

  protected abstract handleSaveBookmark(): Promise<void>;
  protected abstract handleDeleteBookmark(locator: Locator): Promise<void>;
  protected abstract handleBookmarkClick(locator: Locator): Promise<void>;

  public abstract moveTo(href: string): Promise<void>;
  public abstract update(href?: string): Promise<void> ;

  protected abstract saveCurrentReadingPosition(): Promise<void>;
  protected abstract syncReadingPosition(locator: Locator): Promise<void>;

  protected abstract navigate(readingPosition: Locator): Promise<void>;
  protected abstract handleNavigationError(message: string): Promise<void>;

  public async setController(controller: Controller): Promise<void> {
    this.controller = controller;
  }
}
