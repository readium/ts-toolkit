import api, { JellybooksAPI } from "@jellybooks/shared-test";
import { Manifest } from "@jellybooks/shared-test/dist/Publication/Manifest";
import { Publication } from "@jellybooks/shared-test/dist/Publication/Publication";

let textElement: HTMLDivElement = document.getElementById("text") as HTMLDivElement;

const lib: JellybooksAPI = api()

//textElement.innerText = lib.getData('test');

fetch("manifest.json")
    .then(response => response.json())
    .then((json) => {
        let manifest: Manifest = lib.createManifest(json);
        const pubObj: Publication = lib.createPublication(manifest);
        textElement.innerText = JSON.stringify(pubObj, null, 2);
    });
