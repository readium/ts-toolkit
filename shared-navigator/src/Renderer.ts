/**
 * Renders the content for a specific layout
 */
export abstract class Renderer {
  /**
   * Renders the content
   */
  public abstract render(): Promise<void>;

  /**
   * Returns the first location of the current renderer
   */
  public abstract getLocation(): string;
}
