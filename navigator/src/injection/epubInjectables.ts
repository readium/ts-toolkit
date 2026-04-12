import { IInjectableRule, IInjectable } from "../injection/Injectable.ts";
import { stripJS, stripCSS } from "../helpers/minify.ts";
import { Metadata, Layout, Link } from "@readium/shared";

import readiumCSSAfter from "@readium/css/css/dist/ReadiumCSS-after.css?raw";
import readiumCSSBefore from "@readium/css/css/dist/ReadiumCSS-before.css?raw";
import readiumCSSDefault from "@readium/css/css/dist/ReadiumCSS-default.css?raw";

import cssSelectorGeneratorContent from "../dom/_readium_cssSelectorGenerator.js?raw";
import executionPreventionContent from "../dom/_readium_executionPrevention.js?raw";
import onloadProxyContent from "../dom/_readium_executionCleanup.js?raw";

/**
 * Creates injectable rules for EPUB content documents
 */
export function createReadiumEpubRules(metadata: Metadata, readingOrderItems: Link[]): IInjectableRule[] {
    const isFixedLayout = metadata.effectiveLayout === Layout.fixed;

    const htmlHrefs = readingOrderItems
        .filter(item => item.mediaType.isHTML)
        .map(item => item.href);

    const resources = htmlHrefs.length > 0
        ? htmlHrefs
        : [/\.xhtml$/, /\.html$/]; // fallback patterns

    // Core injectables that should be prepended
    const prependInjectables: IInjectable[] = [
        // CSS Selector Generator - always injected
        {
            id: "css-selector-generator",
            as: "script",
            target: "head",
            blob: new Blob([stripJS(cssSelectorGeneratorContent)], { type: "text/javascript" })
        },
        // Execution Prevention - conditional (has executable scripts)
        {
            id: "execution-prevention",
            as: "script",
            target: "head",
            blob: new Blob([stripJS(executionPreventionContent)], { type: "text/javascript" }),
            condition: (doc: Document) => !!(doc.querySelector("script") || doc.querySelector("body[onload]:not(body[onload=''])"))
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
        }
    ];

    // Only add Readium CSS for reflowable documents
    if (!isFixedLayout) {
        // Readium CSS Before - prepended for reflowable
        prependInjectables.unshift({
            id: "readium-css-before",
            as: "link",
            target: "head",
            blob: new Blob([stripCSS(readiumCSSBefore)], { type: "text/css" }),
            rel: "stylesheet"
        });

        // Readium CSS Default and After - appended for reflowable
        appendInjectables.unshift(
            // Readium CSS Default - only for reflowable AND no existing styles
            {
                id: "readium-css-default",
                as: "link",
                target: "head",
                blob: new Blob([stripCSS(readiumCSSDefault)], { type: "text/css" }),
                rel: "stylesheet",
                condition: (doc: Document) => !(doc.querySelector("link[rel='stylesheet']") || doc.querySelector("style") || doc.querySelector("[style]:not([style=''])"))
            },
            // Readium CSS After - only for reflowable
            {
                id: "readium-css-after",
                as: "link",
                target: "head",
                blob: new Blob([stripCSS(readiumCSSAfter)], { type: "text/css" }),
                rel: "stylesheet"
            }
        );
    }

    return [
        {
            resources: resources,
            prepend: prependInjectables,
            append: appendInjectables
        }
    ];
}
