import { Link } from '../publication/Link';
import { Resource } from './Resource';

/** Provides access to a [Resource] from a [Link]. */
export interface Fetcher {
  /**
   * Known resources available in the medium, such as file paths on the file system
   * or entries in a ZIP archive. This list is not exhaustive, and additional
   * unknown resources might be reachable.
   *
   * If the medium has an inherent resource order, it should be followed.
   * Otherwise, HREFs are sorted alphabetically.
   */
  links(): Link[];

  /**
   * Returns the [Resource] at the given [link]'s HREF.
   *
   * A [Resource] is always returned, since for some cases we can't know if it exists before
   * actually fetching it, such as HTTP. Therefore, errors are handled at the Resource level.
   */
  get(link: Link): Resource;

  close(): void;
}

export class EmptyFetcher implements Fetcher {
  close() {}

  links(): Link[] {
    return [];
  }

  get(_link: Link): Resource {
    throw Error('This is an empty fetcher'); // TODO FailureResource
  }
}
