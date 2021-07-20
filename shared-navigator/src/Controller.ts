import { Publication } from '@jellybooks/shared-test';
import { Renderer } from './Renderer';
import { UserSettings } from './UserSettings';

/**
 * Controller class for rendering the UI
 */
export class Controller {
  public settings: UserSettings;
  public publication: Publication;
  public renderer?: Renderer;

  constructor(
    publication: Publication,
    settings: UserSettings,
    renderer: Renderer
  ) {
    this.publication = publication;
    this.settings = settings;
    this.renderer = renderer;
  }
}
