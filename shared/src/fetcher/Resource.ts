import { Link } from '../publication/Link';

export class NumberRange {
  // TODO move to utils
  public readonly start: number;
  public readonly endInclusive: number;

  constructor(start: number, endInclusive: number) {
    this.start = start;
    this.endInclusive = endInclusive;
  }
}

export abstract class Resource {
  abstract link(): Promise<Link>;
  abstract length(): Promise<number | undefined>; // TODO make try?
  abstract read(range?: NumberRange): Promise<Uint8Array | undefined>;
  readAsString(): Promise<string | undefined> {
    return this.read().then(bytes => {
      if (bytes === undefined) return bytes;
      return new TextDecoder().decode(bytes);
    });
  }
  readAsJSON(): Promise<unknown | undefined> {
    return this.readAsString().then(str => {
      if (str === undefined) return str;
      return JSON.parse(str);
    });
  }
  readAsXML(): Promise<XMLDocument | undefined> {
    return this.readAsString().then(str => {
      if (str === undefined) return str;
      return new DOMParser().parseFromString(str, 'text/xml');
    });
  }
  abstract close(): void;
}
