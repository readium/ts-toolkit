export interface BookFont {
  alias: string;
}

export interface BookTheme {
  alias: string;
}

export interface BookView {
  alias: string;
}

export class UserSettings {
  public readonly bookFonts: { [key: string]: BookFont };
  public readonly fontSizes: string[];
  public readonly bookThemes: { [key: string]: BookTheme };
  public readonly bookViews: { [key: string]: BookView };

  protected constructor(
    bookFonts: { [key: string]: BookFont },
    fontSizes: string[],
    bookThemes: { [key: string]: BookTheme },
    bookViews: { [key: string]: BookView }
  ) {
    this.bookFonts = bookFonts;
    this.fontSizes = fontSizes;
    this.bookThemes = bookThemes;
    this.bookViews = bookViews;
  }
}
