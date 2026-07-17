import { Link } from '../publication/Link.ts';

export class NumberRange {
  // TODO move to utils
  public readonly start: number;
  public readonly endInclusive: number;

  constructor(start: number, endInclusive: number) {
    this.start = start;
    this.endInclusive = endInclusive;
  }
}

export interface ResourceReadOptions {
  /** Aborts the underlying request, e.g. when a prefetched resource is no longer needed */
  signal?: AbortSignal;
}

export abstract class Resource {
  abstract link(): Promise<Link>;
  abstract length(): Promise<number | undefined>; // TODO make try?
  abstract read(range?: NumberRange, options?: ResourceReadOptions): Promise<Uint8Array | undefined>;
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
  readAsXML(): Promise<Document | undefined> {
    return this.link().then(l => this.readAsString().then(str => {
      if (str === undefined) return str;
      return new DOMParser().parseFromString(str, l.mediaType.isHTML ? (l.mediaType.string as 'application/xhtml+xml' | 'text/html') : 'text/xml');
    }));
  }
  abstract close(): void;
}
