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

export interface Resource {
  link(): Promise<Link>;
  length(): Promise<number | undefined>; // TODO make try?
  read(range?: NumberRange): Promise<Uint8Array | undefined>;
  readAsString(): Promise<string | undefined>;
  readAsJSON(): Promise<unknown | undefined>;
  readAsXML(): Promise<XMLDocument | undefined>;
  close();
}
