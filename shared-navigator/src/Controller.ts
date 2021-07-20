import { Publication } from '@jellybooks/shared-test';
import { UserSettings } from './UserSettings';

export class Controller {
  public settings: UserSettings;
  public publication: Publication;

  constructor(publication: Publication, settings: UserSettings) {
    this.publication = publication;
    this.settings = settings;
  }
}
