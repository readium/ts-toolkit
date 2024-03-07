import { Link } from '../publication/Link';
import { Fetcher } from './Fetcher';
import { NumberRange, Resource } from './Resource';

export type FetchImplementation = (
  input: RequestInfo | URL,
  init?: RequestInit | undefined
) => Promise<Response>;

// Fetches remote resources through HTTP.
export class HttpFetcher implements Fetcher {
  private readonly baseUrl?: string;
  private readonly client: FetchImplementation;

  constructor(client?: FetchImplementation, baseUrl?: string) {
    this.client = client || window.fetch.bind(window);
    this.baseUrl = baseUrl;
  }

  links(): Link[] {
    return [];
  }

  get(link: Link): Resource {
    const url = link.toURL(this.baseUrl);
    if (url === undefined) {
      // TODO FailureResource
      throw Error(`Invalid HREF: ${link.href}`);
    }
    return new HttpResource(this.client, link, url);
  }

  close() {
    // Nada
  }
}

export class HttpResource implements Resource {
  private readonly _link: Link; // "link" conflicts with inteface function
  private readonly url: string;
  private readonly client: FetchImplementation;
  private _headResponse?: Response;

  constructor(client: FetchImplementation, link: Link, url: string) {
    this.client = client || window.fetch.bind(window);
    this._link = link;
    this.url = url;
  }

  /** Cached HEAD response to get the expected content length and other metadata. */
  private async headResponse(): Promise<Response> {
    if (this._headResponse) return this._headResponse;
    const resp = await this.client(this.url, {
      method: 'HEAD',
    });
    if (!resp.ok)
      throw new Error(
        `http HEAD request for ${this.url} failed with HTTP status code ${resp.status}`
      ); // TODO
    this._headResponse = resp;
    return resp;
  }

  close() {
    // Nada
  }

  async link() {
    /*const resp = await this.headResponse();
        const newLink = Link.deserialize(this._link.serialize()); // This is a hack to deep copy the link
        newLink.type = resp.headers.get("")*/
    return this._link; // TODO mediatype alteration. Need http response mediatype sniffer stuff
  }

  async read(range?: NumberRange): Promise<Uint8Array | undefined> {
    if (range) throw new Error('http read range not implemented!'); // TODO
    const resp = await this.client(this.url);
    if (!resp.ok)
      throw new Error(
        `http GET request for ${this.url} failed with HTTP status code ${resp.status}`
      ); // TODO
    return new Uint8Array(await resp.arrayBuffer());
  }

  async length(): Promise<number> {
    const resp = await this.headResponse();
    const contentLength = resp.headers.get('content-length');
    if (contentLength === null || contentLength === '')
      throw new Error('length for resource unavailable'); // TODO
    return parseInt(contentLength);
  }

  async readAsJSON(): Promise<unknown> {
    const resp = await this.client(this.url);
    if (!resp.ok)
      throw new Error(
        `http GET request for ${this.url} failed with HTTP status code ${resp.status}`
      ); // TODO
    return await resp.json();
  }

  async readAsString(): Promise<string> {
    const resp = await this.client(this.url);
    if (!resp.ok)
      throw new Error(
        `http GET request for ${this.url} failed with HTTP status code ${resp.status}`
      ); // TODO
    return await resp.text();
  }

  async readAsXML(): Promise<XMLDocument> {
    const resp = await this.client(this.url);
    if (!resp.ok)
      throw new Error(
        `http GET request for ${this.url} failed with HTTP status code ${resp.status}`
      ); // TODO
    return new DOMParser().parseFromString(
      await resp.text(),
      'application/xml'
    );
  }
}
