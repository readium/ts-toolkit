import type {
    Decoration as InjectableDecoration,
    BuiltinDecorationStyle,
    HTMLDecorationTemplate as WireHTMLDecorationTemplate,
} from "@readium/navigator-html-injectables";
import { DecorationStyleType } from "@readium/navigator-html-injectables";

export type { BuiltinDecorationStyle };
export { DecorationLayout, DecorationStyleType, DecorationWidth } from "@readium/navigator-html-injectables";

/**
 * Navigator-level decoration template. `element` is a function called once per decoration to
 * generate the HTML string that the injectable will render. The result is resolved on the
 * navigator side (before postMessage) and sanitized by the injectable.
 */
export interface HTMLDecorationTemplate extends Omit<WireHTMLDecorationTemplate, 'element'> {
    element: (decoration: Decoration) => string;
}

export type DecorationStyle = BuiltinDecorationStyle | HTMLDecorationTemplate;

export interface Decoration extends Omit<InjectableDecoration, 'style'> {
    style: DecorationStyle;
}

/**
 * Resolves a navigator-level Decoration to a wire-safe plain object for postMessage.
 * For Template styles, calls `element(decoration)` and embeds the resulting HTML string.
 * For registered custom style IDs (found in `decorationTemplates`), resolves the template
 * and converts the style to a Template wire object.
 */
export function resolveDecorationForWire(
    decoration: Decoration,
    decorationTemplates?: Record<string, HTMLDecorationTemplate>
): unknown {
    const { style } = decoration;
    if (style.type === DecorationStyleType.Template) {
        const tpl = style as HTMLDecorationTemplate;
        return { ...decoration, style: { ...tpl, element: tpl.element(decoration) } };
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
                isActive: style.isActive,
                element: tpl.element(decoration),
            },
        };
    }
    return decoration;
}

export interface DecorationActivationEvent {
    decoration: Decoration;
    group: string;
    /** Bounding rect of the activated decoration in navigator container coordinates (CSS pixels). */
    rect?: { top: number; left: number; width: number; height: number };
    /** Tap/click point in navigator container coordinates (CSS pixels). */
    point?: { x: number; y: number };
}

export interface DecorationObserver {
    /**
     * Called when a user activates a decoration (click or tap).
     * Return true to indicate the event was handled — this suppresses normal tap/click navigation.
     */
    onDecorationActivated(event: DecorationActivationEvent): boolean;
}

function stylesEqual(a: DecorationStyle, b: DecorationStyle): boolean {
    if (a.type !== b.type) return false;
    if ((a.isActive ?? false) !== (b.isActive ?? false)) return false;
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
        (ba.enforceContrast ?? true) === (bb.enforceContrast ?? true);
}

function serializeLocations(loc: any): any {
    return typeof loc?.serialize === 'function' ? loc.serialize() : loc;
}

export function decorationsEqual(a: Decoration, b: Decoration): boolean {
    return (
        a.locator.href === b.locator.href &&
        JSON.stringify(serializeLocations(a.locator.locations)) === JSON.stringify(serializeLocations(b.locator.locations)) &&
        stylesEqual(a.style, b.style) &&
        JSON.stringify(a.extras ?? null) === JSON.stringify(b.extras ?? null)
    );
}

/** Configuration for decoration rendering. */
export interface DecoratorConfig {
    /**
     * Named custom styles. Each key is a style type ID; the value is the template that
     * generates the HTML for decorations of that type. When a decoration's `style.type`
     * matches a key here, the navigator resolves the template and sends it to the
     * injectable as a Template-type decoration.
     */
    decorationTemplates?: Record<string, HTMLDecorationTemplate>;
}

const BUILTIN_DECORATION_TYPES = new Set<string>([
    DecorationStyleType.Highlight,
    DecorationStyleType.Underline,
    DecorationStyleType.Outline,
    DecorationStyleType.TextColor,
    DecorationStyleType.Mask,
    DecorationStyleType.Template,
]);

export interface DecorableNavigator {
    /**
     * Replaces all decorations for the given group with the provided list.
     * The navigator diffs the new list against the current state and issues
     * add / update / remove / clear commands as needed.
     */
    applyDecorations(decorations: Decoration[], group: string): void;

    /**
     * Returns whether the given style type ID can be rendered by this navigator.
     * Returns true for all built-in types and any IDs registered in DecoratorConfig.
     */
    supportsDecorationStyle(styleTypeId: string): boolean;

    /** Registers an observer for activation events on the given group. */
    registerDecorationObserver(group: string, observer: DecorationObserver): void;

    /** Unregisters a previously registered observer from all groups. */
    unregisterDecorationObserver(observer: DecorationObserver): void;
}

export { BUILTIN_DECORATION_TYPES };
