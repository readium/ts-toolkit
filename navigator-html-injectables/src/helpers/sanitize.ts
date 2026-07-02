/**
 * Elements a decoration template is allowed to contain.
 * Allowlisting instead of denylisting: anything not listed here is stripped,
 * including elements that do not yet exist in the HTML spec.
 */
const ALLOWED_ELEMENTS = [
    // Structure / presentation
    "div", "span", "p", "br", "hr",
    "b", "i", "em", "strong", "s", "u", "mark", "small", "sub", "sup",
    "abbr", "cite", "code", "data", "dfn", "kbd", "q", "samp", "time", "var",
    "blockquote", "pre",
    // SVG — useful for icon-style decorations (e.g. sidemarks)
    "svg", "g", "path", "circle", "ellipse", "rect", "line",
    "polygon", "polyline", "text", "tspan", "defs", "use",
];

/** Attributes that introduce executable code on any element. */
const DANGEROUS_ATTR = /^on/i;
/** Attributes that carry URLs and must be checked for unsafe schemes. */
const URL_ATTRS = new Set(["href", "src", "action", "formaction", "xlink:href"]);
/** URL schemes that must not appear in URL-bearing attributes. */
const DANGEROUS_SCHEME = /^\s*(javascript|data):/i;

/**
 * Parses `html` and returns its first element child with all executable
 * content removed. Uses the Sanitizer API when available, falls back to a
 * manual DOMParser scrub otherwise.
 *
 * The allowlist approach is intentional: unknown or future elements are
 * stripped by default rather than permitted by oversight.
 *
 * @param wnd  Window whose document is used when adopting nodes.
 * @param html Raw HTML string supplied by the caller.
 * @returns    The sanitized first element child, or `null` for empty input.
 */
export function sanitizeHTML(wnd: Window, html: string): Element | null {
    const host = wnd.document.createElement("div");

    if ("Sanitizer" in wnd && typeof (host as any).setHTML === "function") {
        try {
            const sanitizer = new (wnd as any).Sanitizer({ allowElements: ALLOWED_ELEMENTS });
            (host as any).setHTML(html, { sanitizer });
            return host.firstElementChild as Element | null;
        } catch {
            // Sanitizer API present but call failed — fall through to DOMParser.
        }
    }

    // DOMParser fallback: parse in an isolated document then scrub manually.
    const scratch = wnd.document.implementation.createHTMLDocument("");
    scratch.body.innerHTML = html;
    scrubNode(scratch.body, new Set(ALLOWED_ELEMENTS));
    while (scratch.body.firstChild) {
        host.appendChild(wnd.document.adoptNode(scratch.body.firstChild));
    }
    return host.firstElementChild as Element | null;
}

function scrubNode(root: Element, allowed: Set<string>): void {
    // Walk in reverse so removals don't shift indices.
    const all = Array.from(root.querySelectorAll("*")).reverse();
    for (const el of all) {
        if (!allowed.has(el.localName)) {
            // Replace disallowed element with its children to preserve text.
            el.replaceWith(...Array.from(el.childNodes));
            continue;
        }
        for (const { name, value } of Array.from(el.attributes)) {
            if (
                DANGEROUS_ATTR.test(name) ||
                (URL_ATTRS.has(name) && DANGEROUS_SCHEME.test(value))
            ) {
                el.removeAttribute(name);
            }
        }
    }
}
