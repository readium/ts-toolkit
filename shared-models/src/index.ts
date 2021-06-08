import { Manifest } from './Publication/Manifest';
import { Publication } from './Publication/Publication';

export interface JellybooksAPI {
  createManifest(json: string): Manifest;
  createPublication(manifest: Manifest): Publication;
  getData(x: string): string;
}

export default function api(): JellybooksAPI {
  const createManifest = (json: string): Manifest => {
    return new Manifest(json);
  };

  const createPublication = (manifest: Manifest): Publication => {
    return new Publication(manifest);
  };

  //for test
  const getData = (x: string): string => {
    return `hi   ${x}`;
  };

  const _api = {
    createManifest,
    createPublication,
    getData,
  } as JellybooksAPI;

  return _api;
}

// export const sum = (a: number, b: number) => {
//   if ('development' === process.env.NODE_ENV) {
//     console.log('boop');
//   }
//   return a + b;
// };
