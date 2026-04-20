import { IInjectableRule, IInjectable } from "../injection/Injectable.ts";
import { stripJS, stripCSS } from "../helpers/minify.ts";
import { Metadata, Layout, Link } from "@readium/shared";
import { getScriptMode } from "../helpers/scriptMode.ts";

import cssSelectorGeneratorContent from "../dom/_readium_cssSelectorGenerator.js?raw";
import executionPreventionContent from "../dom/_readium_executionPrevention.js?raw";
import onloadProxyContent from "../dom/_readium_executionCleanup.js?raw";

/**
 * Creates injectable rules for EPUB content documents.
 * Async so that script-specific Readium CSS stylesheets can be imported
 * dynamically — only the variant that is actually needed is bundled.
 */
export async function createReadiumEpubRules(metadata: Metadata, readingOrderItems: Link[]): Promise<IInjectableRule[]> {
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
        const scriptMode = getScriptMode(metadata);

        // Dynamically import only the CSS variant we need
        let cssBeforeRaw: string;
        let cssDefaultRaw: string;
        let cssAfterRaw: string;

        switch (scriptMode) {
            case 'rtl': {
                const [before, def, after] = await Promise.all([
                    import("@readium/css/css/dist/rtl/ReadiumCSS-before.css?raw"),
                    import("@readium/css/css/dist/rtl/ReadiumCSS-default.css?raw"),
                    import("@readium/css/css/dist/rtl/ReadiumCSS-after.css?raw"),
                ]);
                cssBeforeRaw = before.default;
                cssDefaultRaw = def.default;
                cssAfterRaw = after.default;
                break;
            }
            case 'cjk-horizontal': {
                const [before, def, after] = await Promise.all([
                    import("@readium/css/css/dist/cjk-horizontal/ReadiumCSS-before.css?raw"),
                    import("@readium/css/css/dist/cjk-horizontal/ReadiumCSS-default.css?raw"),
                    import("@readium/css/css/dist/cjk-horizontal/ReadiumCSS-after.css?raw"),
                ]);
                cssBeforeRaw = before.default;
                cssDefaultRaw = def.default;
                cssAfterRaw = after.default;
                break;
            }
            case 'cjk-vertical':
            // Traditional Mongolian (vertical-lr) uses the same Readium CSS
            // layout as CJK vertical-rl — it is an outlier handled by the
            // same stylesheet set per the Readium CSS spec.
            case 'mongolian-vertical': {
                const [before, def, after] = await Promise.all([
                    import("@readium/css/css/dist/cjk-vertical/ReadiumCSS-before.css?raw"),
                    import("@readium/css/css/dist/cjk-vertical/ReadiumCSS-default.css?raw"),
                    import("@readium/css/css/dist/cjk-vertical/ReadiumCSS-after.css?raw"),
                ]);
                cssBeforeRaw = before.default;
                cssDefaultRaw = def.default;
                cssAfterRaw = after.default;
                break;
            }
            default: {
                const [before, def, after] = await Promise.all([
                    import("@readium/css/css/dist/ReadiumCSS-before.css?raw"),
                    import("@readium/css/css/dist/ReadiumCSS-default.css?raw"),
                    import("@readium/css/css/dist/ReadiumCSS-after.css?raw"),
                ]);
                cssBeforeRaw = before.default;
                cssDefaultRaw = def.default;
                cssAfterRaw = after.default;
                break;
            }
        }

        // Readium CSS Before - prepended for reflowable
        prependInjectables.unshift({
            id: "readium-css-before",
            as: "link",
            target: "head",
            blob: new Blob([stripCSS(cssBeforeRaw)], { type: "text/css" }),
            rel: "stylesheet"
        });

        // Readium CSS Default and After - appended for reflowable
        appendInjectables.unshift(
            // Readium CSS Default - only for reflowable AND no existing styles
            {
                id: "readium-css-default",
                as: "link",
                target: "head",
                blob: new Blob([stripCSS(cssDefaultRaw)], { type: "text/css" }),
                rel: "stylesheet",
                condition: (doc: Document) => !(doc.querySelector("link[rel='stylesheet']") || doc.querySelector("style") || doc.querySelector("[style]:not([style=''])"))
            },
            // Readium CSS After - only for reflowable
            {
                id: "readium-css-after",
                as: "link",
                target: "head",
                blob: new Blob([stripCSS(cssAfterRaw)], { type: "text/css" }),
                rel: "stylesheet"
            }
        );

        // EBPAJ fonts polyfill — CJK only, when EBPAJ metadata is present
        if (scriptMode === 'cjk-horizontal' || scriptMode === 'cjk-vertical') {
            const isEBPAJ = metadata.description === "ebpaj-guide-1.0" ||
                            metadata.otherMetadata?.["ebpaj:guide-version"] !== undefined;
            if (isEBPAJ) {
                const { default: ebpajRaw } = await import("@readium/css/css/dist/ReadiumCSS-ebpaj_fonts_patch.css?raw");
                appendInjectables.push({
                    id: "readium-css-ebpaj",
                    as: "link",
                    target: "head",
                    blob: new Blob([stripCSS(ebpajRaw)], { type: "text/css" }),
                    rel: "stylesheet"
                });
            }
        }
    }

    return [
        {
            resources: resources,
            prepend: prependInjectables,
            append: appendInjectables
        }
    ];
}
