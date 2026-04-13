import { IInjectableRule, IInjectable } from "../injection/Injectable";
import { stripJS, stripCSS } from "../helpers/minify.ts";
import { Link } from "@readium/shared";

import readiumCSSWebPub from "@readium/css/css/dist/webPub/ReadiumCSS-webPub.css?raw";

import cssSelectorGeneratorContent from "../dom/_readium_cssSelectorGenerator.js?raw";
import webpubExecutionContent from "../dom/_readium_webpubExecution.js?raw";
import onloadProxyContent from "../dom/_readium_executionCleanup.js?raw";

/**
 * Creates injectable rules for WebPub content documents
 */
export function createReadiumWebPubRules(readingOrderItems: Link[]): IInjectableRule[] {
    // Create exact match patterns for manifest hrefs
    const htmlHrefs = readingOrderItems
        .filter(item => item.mediaType.isHTML)
        .map(item => item.href);
    
    const resources = htmlHrefs.length > 0 
        ? htmlHrefs 
        : [/\.html$/, /\.xhtml$/, /\/$/]; // fallback patterns
    
    // Core injectables that should be prepended
    const prependInjectables: IInjectable[] = [
        // CSS Selector Generator - always injected
        {
            id: "css-selector-generator",
            as: "script",
            target: "head",
            blob: new Blob([stripJS(cssSelectorGeneratorContent)], { type: "text/javascript" })
        },
        // WebPub Execution - always injected (sets up event blocking to false)
        {
            id: "webpub-execution",
            as: "script",
            target: "head",
            blob: new Blob([stripJS(webpubExecutionContent)], { type: "text/javascript" })
        }
    ];

    // Core injectables that should be appended
    const appendInjectables: IInjectable[] = [
        // Onload Proxy - conditional (has executable scripts)
        {
            id: "onload-proxy",
            as: "script",
            target: "head",
            blob: new Blob([stripJS(onloadProxyContent)], { type: "text/javascript" }),
            condition: (doc: Document) => !!(doc.querySelector("script") || doc.querySelector("body[onload]:not(body[onload=''])"))
        },
        // Readium CSS WebPub - always injected
        {
            id: "readium-css-webpub",
            as: "link",
            target: "head",
            blob: new Blob([stripCSS(readiumCSSWebPub)], { type: "text/css" }),
            rel: "stylesheet"
        }
    ];

    return [
        {
            resources: resources,
            prepend: prependInjectables,
            append: appendInjectables
        }
    ];
}
