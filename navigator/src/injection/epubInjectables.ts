import { IInjectableRule, IInjectable } from "../injection/Injectable";
import { stripJS, stripCSS } from "../helpers/minify";
import { Layout } from "@readium/shared";

import readiumCSSAfter from "@readium/css/css/dist/ReadiumCSS-after.css?raw";
import readiumCSSBefore from "@readium/css/css/dist/ReadiumCSS-before.css?raw";
import readiumCSSDefault from "@readium/css/css/dist/ReadiumCSS-default.css?raw";

import cssSelectorGeneratorContent from "../dom/_readium_cssSelectorGenerator.js?raw";
import executionPreventionContent from "../dom/_readium_executionPrevention.js?raw";
import onloadProxyContent from "../dom/_readium_executionCleanup.js?raw";

/**
 * Creates injectable rules for EPUB content documents
 */
export function createReadiumEpubRules(layout: Layout): IInjectableRule[] {
    const isFixedLayout = layout === Layout.fixed;
    
    const injectables: IInjectable[] = [
        // CSS Selector Generator - always injected
        {
            id: "css-selector-generator",
            as: "script",
            target: "head",
            insert: "prepend",
            blob: new Blob([stripJS(cssSelectorGeneratorContent)], { type: "text/javascript" })
        },
        // Execution Prevention - conditional (has executable scripts)
        {
            id: "execution-prevention",
            as: "script",
            target: "head",
            insert: "prepend",
            blob: new Blob([stripJS(executionPreventionContent)], { type: "text/javascript" }),
            condition: (doc: Document) => !!(doc.querySelector("script") || doc.querySelector("body[onload]:not(body[onload=''])"))
        },
        // Onload Proxy - conditional (has executable scripts)
        {
            id: "onload-proxy",
            as: "script",
            target: "head",
            insert: "append",
            blob: new Blob([stripJS(onloadProxyContent)], { type: "text/javascript" }),
            condition: (doc: Document) => !!(doc.querySelector("script") || doc.querySelector("body[onload]:not(body[onload=''])"))
        }
    ];

    // Only add Readium CSS for reflowable documents
    if (!isFixedLayout) {
        injectables.unshift(
            // Readium CSS Before - only for reflowable
            {
                id: "readium-css-before",
                as: "link",
                target: "head",
                insert: "prepend",
                blob: new Blob([stripCSS(readiumCSSBefore)], { type: "text/css" }),
                attributes: { rel: "stylesheet" }
            },
            // Readium CSS Default - only for reflowable AND no existing styles
            {
                id: "readium-css-default",
                as: "link",
                target: "head",
                insert: "append",
                blob: new Blob([stripCSS(readiumCSSDefault)], { type: "text/css" }),
                attributes: { rel: "stylesheet" },
                condition: (doc: Document) => !(doc.querySelector("link[rel='stylesheet']") || doc.querySelector("style") || doc.querySelector("[style]:not([style=''])"))
            },
            // Readium CSS After - only for reflowable
            {
                id: "readium-css-after",
                as: "link",
                target: "head",
                insert: "append",
                blob: new Blob([stripCSS(readiumCSSAfter)], { type: "text/css" }),
                attributes: { rel: "stylesheet" }
            }
        );
    }

    return [
        {
            resources: [/\.xhtml$/, /\.html$/],
            injectables
        }
    ];
}
