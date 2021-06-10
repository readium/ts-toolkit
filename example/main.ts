import api from "@jellybooks/shared-test";
import { JellybooksAPI, Publication, Manifest } from "@jellybooks/shared-test";

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
