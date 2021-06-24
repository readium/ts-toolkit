import { Contributors } from './Publication/Contributor';
import { EPUBLayout } from './Publication/epub/Layout';
import { Link, Links } from './Publication/Link';
import { LocalizedString } from './Publication/LocalizedString';
import { Manifest } from './Publication/Manifest';
import { Metadata } from './Publication/Metadata';
import { IPresentationMetadata } from './Publication/presentation/Presentation';
import { Publication } from './Publication/Publication';


export interface JellybooksAPI {
  createManifest(json: string): Manifest;
  createPublication(manifest: Manifest): Publication;
  getData(x: string): string;
}

export default function api(): JellybooksAPI {
  const createManifest = (json: string): Manifest => {
    return Manifest.fromJSON(json);
  };

  const createPublication = (manifest: Manifest): Publication => {
    return new Publication(manifest);
  };

  //for test
  const getData = (x: string): string => {
      //let m:Metadata;
      
      //m.getPresentation()

    return `hi1 - ${x}`;
  };

  const _api = {
    createManifest,
    createPublication,
    getData,
  } as JellybooksAPI;

  return _api;
}

export { Manifest, Publication, Metadata, Link, Links, LocalizedString, IPresentationMetadata, EPUBLayout, Contributors };

// export const sum = (a: number, b: number) => {
//   if ('development' === process.env.NODE_ENV) {
//     console.log('boop');
//   }
//   return a + b;
// };
