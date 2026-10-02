import { Comms } from "../comms/index.ts";
import { ReadiumWindow } from "../helpers/dom.ts";
import { isInjected } from "../helpers/injected.ts";
import { Module } from "./Module.ts";
import { ModuleName } from "./ModuleLibrary.ts";

export interface SerializedDocument {
    markup: string;
    mediaType: string;
}

// Serializes the live document element and body, without the head and the injected nodes.
function serializeDocument(doc: Document): SerializedDocument {
    const root = doc.documentElement.cloneNode(false) as Element;
    if (doc.body) {
        const body = doc.body.cloneNode(false);
        doc.body.childNodes.forEach(child => {
            if (!isInjected(child)) body.appendChild(child.cloneNode(true));
        });
        root.appendChild(body);
    }
    const mediaType = doc.contentType;
    const markup = mediaType === "text/html"
        ? root.outerHTML
        : new XMLSerializer().serializeToString(root);
    return { markup, mediaType };
}

export class DocumentSerializer extends Module {
    static readonly moduleName: ModuleName = "document_serializer";

    mount(wnd: ReadiumWindow, comms: Comms): boolean {
        comms.register("serialize_document", DocumentSerializer.moduleName, (_, ack) => {
            comms.send("serialize_document", serializeDocument(wnd.document));
            ack(true);
        });

        comms.log("DocumentSerializer Mounted");
        return true;
    }

    unmount(_wnd: ReadiumWindow, comms: Comms): boolean {
        comms.unregisterAll(DocumentSerializer.moduleName);
        comms.log("DocumentSerializer Unmounted");
        return true;
    }
}
