import type {
    Decoration as InjectableDecoration,
    BuiltinDecorationStyle,
    HTMLDecorationTemplate as WireHTMLDecorationTemplate,
} from "@readium/navigator-html-injectables";
import { DecorationStyleType } from "@readium/navigator-html-injectables";

export type { BuiltinDecorationStyle };

/**
 * Author-level decoration template. `element` is a function called once per decoration to
 * generate the HTML string that the injectable will render. The result is resolved
 * (via {@link resolveDecorationForWire}) before postMessage and sanitized by the injectable.
 */
export interface HTMLDecorationTemplate extends Omit<WireHTMLDecorationTemplate, "element"> {
    element: (decoration: Decoration) => string;
}

/** A reference to a named style registered in `DecoratorConfig.decorationTemplates`. */
export interface NamedDecorationStyle {
    type: string;
}

export type DecorationStyle = BuiltinDecorationStyle | HTMLDecorationTemplate | NamedDecorationStyle;

export interface Decoration extends Omit<InjectableDecoration, "style"> {
    style: DecorationStyle;
}

/** Configuration for decoration rendering. */
export interface DecoratorConfig {
    /**
     * Named custom styles. Each key is a style type ID; the value is the template that
     * generates the HTML for decorations of that type. When a decoration's `style.type`
     * matches a key here, the template is resolved and sent to the injectable as a
     * Template-type decoration.
     */
    decorationTemplates?: Record<string, HTMLDecorationTemplate>;
}

export const BUILTIN_DECORATION_TYPES = new Set<string>(Object.values(DecorationStyleType));

/**
 * Returns whether the given style type ID can be rendered.
 * True for all built-in types and any IDs registered in `decorationTemplates`.
 * TextColor additionally requires the CSS Highlight API.
 */
export function supportsDecorationStyle(
    styleTypeId: string,
    decorationTemplates?: Record<string, HTMLDecorationTemplate>
): boolean {
    if (styleTypeId === DecorationStyleType.TextColor) return typeof window !== "undefined" && "Highlight" in window;
    if (BUILTIN_DECORATION_TYPES.has(styleTypeId)) return true;
    return !!decorationTemplates?.[styleTypeId];
}

/**
 * Resolves an author-level Decoration to a wire-safe plain object for postMessage.
 * For Template styles, calls `element(decoration)` (or passes through an already-resolved
 * string) and embeds the resulting HTML string. For registered custom style IDs (found in
 * `decorationTemplates`), resolves the template and converts the style to a Template wire object.
 */
export function resolveDecorationForWire(
    decoration: Decoration,
    decorationTemplates?: Record<string, HTMLDecorationTemplate>
): unknown {
    const { style } = decoration;
    if (style.type === DecorationStyleType.Template) {
        const tpl = style as HTMLDecorationTemplate;
        return { ...decoration, style: { ...tpl, element: resolveElement(tpl, decoration) } };
    }
    if (style.type && decorationTemplates?.[style.type]) {
        const tpl = decorationTemplates[style.type];
        return {
            ...decoration,
            style: {
                type: DecorationStyleType.Template,
                layout: tpl.layout,
                width: tpl.width,
                stylesheet: tpl.stylesheet,
                element: resolveElement(tpl, decoration),
            },
        };
    }
    return decoration;
}

function resolveElement(tpl: HTMLDecorationTemplate, decoration: Decoration): string {
    // A standalone caller may pass an already-resolved (string) element.
    return typeof tpl.element === "function" ? tpl.element(decoration) : (tpl.element as unknown as string);
}

function stylesEqual(a: DecorationStyle, b: DecorationStyle): boolean {
    if (a.type !== b.type) return false;
    if (a.type === DecorationStyleType.Template) {
        const ta = a as HTMLDecorationTemplate;
        const tb = b as HTMLDecorationTemplate;
        // element is a function — not comparable by value; excluded from equality
        return ta.layout === tb.layout &&
            ta.width === tb.width &&
            ta.stylesheet === tb.stylesheet;
    }
    const ba = a as BuiltinDecorationStyle;
    const bb = b as BuiltinDecorationStyle;
    return ba.tint === bb.tint &&
        ba.layout === bb.layout &&
        ba.width === bb.width &&
        (ba.enforceContrast ?? true) === (bb.enforceContrast ?? true) &&
        (ba.expand ?? 0) === (bb.expand ?? 0);
}

export function decorationsEqual(a: Decoration, b: Decoration): boolean {
    return (
        a.locator.href === b.locator.href &&
        JSON.stringify((a.locator.locations as any)?.serialize?.() ?? a.locator.locations) ===
            JSON.stringify((b.locator.locations as any)?.serialize?.() ?? b.locator.locations) &&
        JSON.stringify(a.locator.text ?? null) === JSON.stringify(b.locator.text ?? null) &&
        stylesEqual(a.style, b.style) &&
        JSON.stringify(a.extras ?? null) === JSON.stringify(b.extras ?? null)
    );
}
