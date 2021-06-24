 import api, { JellybooksAPI, Manifest, Publication } from "@jellybooks/shared-test";
// import { JellybooksAPI, Publication, Manifest } from "@jellybooks/shared-test";

//import "@jellybooks/shared-test";
//import   "@jellybooks/shared-test/types/Publication/presentation/Metadata+Presentation";
//import * as ddd from "@jellybooks/shared-test/types/Publication/presentation/Metadata+Presentation";
//import { x } from "@jellybooks/shared-test/types/Publication/presentation/Metadata+Presentation";

let textElement: HTMLDivElement = document.getElementById("text") as HTMLDivElement;

const lib: JellybooksAPI = api()

//textElement.innerText = lib.getData('test');


fetch("manifest.json")
    .then(response => response.json())
    .then((json) => {
        //console.log(ddd.x);

        console.log(json);
        let manifest: Manifest = lib.createManifest(json);
        const pubObj: Publication = lib.createPublication(manifest);
        //console.log(manifest.metadata.get);
        let y = manifest.metadata.getPresentation();
        
        console.log(y);
        console.log(pubObj);
        textElement.innerText = JSON.stringify(pubObj, null, 2);
    });
