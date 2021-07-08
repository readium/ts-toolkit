import { Copies, Acquisition, Holds, Price, Availability } from '../../opds';
import { positiveNumberfromJSON } from '../../util/JSONParse';
import { Link } from '../Link';
import { Properties } from '../Properties';

// OPDS extensions for link [Properties].
// https://drafts.opds.io/schema/properties.schema.json

declare module '../Properties' {
  export interface Properties {
    /**
     * Provides a hint about the expected number of items returned.
     */
    getNumberOfItems(): number | undefined;

    /**
     * The price of a publication is tied to its acquisition link.
     */
    getPrice(): Price | undefined;

    /**
     * Indirect acquisition provides a hint for the expected media type that will be acquired after
     * additional steps.
     */
    getIndirectAcquisitions(): Array<Acquisition> | undefined;

    /**
     * Library-specific features when a specific book is unavailable but provides a hold list.
     */
    getHolds(): Holds | undefined;

    /**
     * Library-specific feature that contains information about the copies that a library has acquired.
     */
    getCopies(): Copies | undefined;

    /**
     * Indicated the availability of a given resource.
     */
    getAvailability(): Availability | undefined;

    /**
     * Indicates that the linked resource supports authentication with the associated Authentication
     * Document.
     *
     * See https://drafts.opds.io/authentication-for-opds-1.0.html
     */
    getAuthenticate(): Link | undefined;
  }
}

Properties.prototype.getNumberOfItems = function(): number | undefined {
  return positiveNumberfromJSON(this.otherProperties['numberOfItems']);
};

Properties.prototype.getPrice = function(): Price | undefined {
  return Price.deserialize(this.otherProperties['price']);
};

Properties.prototype.getIndirectAcquisitions = function():
  | Array<Acquisition>
  | undefined {
  const json = this.otherProperties['indirectAcquisition'];
  if (!(json && json instanceof Array)) return;
  return json
    .map<Acquisition>(item => Acquisition.deserialize(item) as Acquisition)
    .filter(x => x !== undefined);
};

Properties.prototype.getHolds = function(): Holds | undefined {
  return Holds.deserialize(this.otherProperties['holds']);
};

Properties.prototype.getCopies = function(): Copies | undefined {
  return Copies.deserialize(this.otherProperties['copies']);
};

Properties.prototype.getAvailability = function(): Availability | undefined {
  return Availability.deserialize(this.otherProperties['availability']);
};

Properties.prototype.getAuthenticate = function(): Link | undefined {
  return Link.deserialize(this.otherProperties['authenticate']);
};
