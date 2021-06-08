import api, { JellybooksAPI } from '../src';
import fs from 'fs';
import { Manifest } from '../src/Publication/Manifest';
import { Publication } from '../src/Publication/Publication';

describe('library', () => {
  it('works', () => {
    const lib: JellybooksAPI = api()

    fs.readFile('./test/manifest.json', 'utf8', (err, data) => {
      if (err) throw err;

      let manifest: Manifest = lib.createManifest(data);

      const pubObj: Publication = lib.createPublication(manifest);

      expect(pubObj).toBeDefined()
    });

  });
});
