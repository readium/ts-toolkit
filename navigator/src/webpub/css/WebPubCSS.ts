import { WebPubSettings } from "../preferences/WebPubSettings";
import { IUserProperties, UserProperties } from "./Properties";

export interface IWebPubCSS {
  userProperties: UserProperties;
}

export class WebPubCSS {
  userProperties: UserProperties;

  constructor(props: IWebPubCSS) {
    this.userProperties = props.userProperties;
  }

  update(settings: WebPubSettings): void {
    const updated: IUserProperties = {
      zoom: settings.zoom
    };

    this.userProperties = new UserProperties(updated);
  }
}
