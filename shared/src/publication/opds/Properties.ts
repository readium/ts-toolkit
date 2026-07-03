import { Copies, Acquisition, Holds, Price, Availability } from '../../opds/index.ts';
import { positiveNumberfromJSON } from '../../util/JSONParse.ts';
import { Link } from '../Link.ts';
import { Properties } from '../Properties.ts';

// OPDS extensions for link Properties.
// https://specs.opds.io/schema/properties.schema.json

export function getNumberOfItems(properties: Properties): number | undefined {
  return positiveNumberfromJSON(properties.otherProperties['numberOfItems']);
}

export function getPrice(properties: Properties): Price | undefined {
  return Price.deserialize(properties.otherProperties['price']);
}

export function getIndirectAcquisitions(properties: Properties): Array<Acquisition> | undefined {
  const json = properties.otherProperties['indirectAcquisition'];
  if (!(json && Array.isArray(json))) return;
  return json
    .map<Acquisition>(item => Acquisition.deserialize(item) as Acquisition)
    .filter(x => x !== undefined);
}

export function getHolds(properties: Properties): Holds | undefined {
  return Holds.deserialize(properties.otherProperties['holds']);
}

export function getCopies(properties: Properties): Copies | undefined {
  return Copies.deserialize(properties.otherProperties['copies']);
}

export function getAvailability(properties: Properties): Availability | undefined {
  return Availability.deserialize(properties.otherProperties['availability']);
}

export function getAuthenticate(properties: Properties): Link | undefined {
  return Link.deserialize(properties.otherProperties['authenticate']);
}
