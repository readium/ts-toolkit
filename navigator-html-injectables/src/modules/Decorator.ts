import { Locator } from "@readium/shared";
import { IComms } from "../comms/comms.ts";
import { Module } from "./Module.ts";
import { rangeFromLocator } from "../helpers/locator.ts";
import { ModuleName } from "./ModuleLibrary.ts";
import { Rect, getClientRectsNoOverlap, getTextClientRects, rectContainsPoint } from "../helpers/rect.ts";
import { getProperty } from "../helpers/css.ts";
import { isDarkColor, getContrastingTextColor, adjustColorForContrast, colorToRgba } from "@readium/helpers";
import { makeWritingContext } from "../helpers/document.ts";
import { sML } from "@readium/helpers";
import { sanitizeHTML } from "../helpers/sanitize.ts";

function defaultTint(type: DecorationStyleType): string {
    switch (type) {
        case DecorationStyleType.Mask:
            return "rgba(255, 255, 255, 0.5)";
        case DecorationStyleType.Highlight:
        case DecorationStyleType.HighlightUnderline:
            return "#FFFF00";
        default:
            return "#FF0000";
    }
}

export const DecorationStyleType = {
    Highlight:          "highlight",          // Background color overlay.
    HighlightUnderline: "highlightUnderline", // Background color overlay + underline (the converged active state from RFC 008).
    Underline:          "underline",          // Underline drawn beneath the text.
    Strikethrough:      "strikethrough",      // Line drawn through the vertical centre of the text.
    Outline:            "outline",            // Border drawn around the text boxes.
    TextColor:          "textColor",          // Changes the text color directly.
    Mask:               "mask",               // Dims everything outside the selection rects. Use width: Page for block-level behaviour.
    Template:           "template",           // Custom HTML template (HTMLDecorationTemplate).
} as const;
export type DecorationStyleType = typeof DecorationStyleType[keyof typeof DecorationStyleType];

export enum DecorationWidth {
    Wrap = "wrap", // Smallest width fitting the CSS border box.
    Viewport = "viewport", // Fills the whole viewport.
    Bounds = "bounds", // Fills the bounding region of all CSS border boxes.
    Page = "page", // Fills the anchor page, useful for dual-page layouts.
}

export enum DecorationLayout {
    Boxes = "boxes", // One HTML element for each CSS border box (e.g. line of text).
    Bounds = "bounds", // A single HTML element covering the smallest region containing all CSS border boxes.
}

/** Built-in decoration styles. layout/width are optional overrides; defaults are Boxes/Wrap. */
export interface BuiltinDecorationStyle {
    type?: Exclude<DecorationStyleType, "template">;
    tint?: string;
    layout?: DecorationLayout;
    width?: DecorationWidth;
    enforceContrast?: boolean; // When true (default), tint is adjusted for contrast against the background.
    expand?: number; // Inflates each client rect outward by this many CSS pixels on all sides.
}

/**
 * Custom decoration style backed by caller-supplied HTML.
 * Matches the HTMLDecorationTemplate class from the Readium spec.
 * The element string is sanitized before injection.
 * --readium-tint is injected as a CSS custom property on each created element.
 */
export interface HTMLDecorationTemplate {
    type: "template";
    layout: DecorationLayout;
    width: DecorationWidth;
    element: string;
    stylesheet?: string;
}

export type DecorationStyle = BuiltinDecorationStyle | HTMLDecorationTemplate;

export interface Decoration {
    id: string; // Unique ID of the decoration. It must be unique in the group the decoration is applied to.
    locator: Locator; // Location in the publication where the decoration will be rendered.
    style: DecorationStyle; // Declares the look and feel of the decoration.
    extras?: Record<string, unknown>; // App-specific context data passed through to DecorationActivationEvent.
}

interface DecorationEventBase {
    decorationId: string;
    group: string;
    rect?: { top: number; left: number; width: number; height: number };
    point?: { x: number; y: number };
}

export interface DecorationActivatedEvent extends DecorationEventBase {
    rect: { top: number; left: number; width: number; height: number }; // Always present on activation.
    point: { x: number; y: number }; // Always present on activation.
}

export interface DecorationPointerEnterData extends DecorationEventBase {
    rect: { top: number; left: number; width: number; height: number }; // Always present on enter.
    point: { x: number; y: number }; // Always present on enter.
}

export type DecorationPointerLeaveData = DecorationEventBase;

export type DecoratorRequest =
    | { group: string; action: "add" | "update"; decoration: Decoration }
    | { group: string; action: "remove"; decoration: Pick<Decoration, "id"> }
    | { group: string; action: "clear" };

interface DecorationItem {
    id: string;
    decoration: Decoration;
    range: Range;
    hitRects: Rect[]; // Merged client rects for hit testing; refreshed after each layout.
    clickableElements: HTMLElement[] | undefined;
    container: HTMLElement | undefined;
    highlightSubKey?: string; // CSS.highlights key shared by all items with the same type+tint.
    highlightCSS?: string;    // The ::highlight() rule for this item's tint group.
}

const canNativeHighlight = () => ("Highlight" in window);
const cannotNativeHighlight = ["IMG", "IMAGE", "AUDIO", "VIDEO", "SVG"];

class DecorationGroup {
    public readonly items: DecorationItem[] = [];
    private lastItemId = 0;
    private container: HTMLDivElement | undefined = undefined;
    private _activatable = false;
    private _hoverable = false;
    private hoveredItem: DecorationItem | undefined = undefined;
    public readonly experimentalHighlights: boolean = false;
    private readonly notTextFlag: Map<string, boolean> | undefined;
    private readonly _tintSubKeys = new Map<string, string>(); // (type::adjustedTint) → subKey
    private _subKeyCounter = 0;
    private readonly activationHandler: (e: PointerEvent) => void;
    private readonly hoverHandler: (e: PointerEvent) => void;
    private maskSvg: SVGSVGElement | undefined = undefined;
    private shadowHost: HTMLDivElement | undefined = undefined;
    private shadowRoot: ShadowRoot | undefined = undefined;

    /**
     * Creates a DecorationGroup object
     * @param id Unique HTML ID-adhering name of the group
     * @param name Human-readable name of the group
     */
    constructor(
        private readonly wnd: Window,
        private readonly comms: IComms,
        private readonly id: string,
        private readonly name: string
    ) {
        if (canNativeHighlight()) {
            this.experimentalHighlights = true;
            this.notTextFlag = new Map<string, boolean>();
        }
        this.activationHandler = this.handleActivation.bind(this);
        this.wnd.document.addEventListener("pointerup", this.activationHandler);
        this.hoverHandler = this.handleHover.bind(this);
        this.wnd.document.addEventListener("pointermove", this.hoverHandler);
    }

    get activatable() {
        return this._activatable;
    }

    set activatable(value: boolean) {
        this._activatable = value;
    }

    get hoverable() {
        return this._hoverable;
    }

    set hoverable(value: boolean) {
        this._hoverable = value;
        if (!value && this.hoveredItem) {
            const leaveRect = this.hoveredItem.range.getBoundingClientRect();
            const pixelRatio = this.wnd.devicePixelRatio;
            this.comms.send("decoration_pointer_leave", {
                decorationId: this.hoveredItem.decoration.id,
                group: this.name,
                rect: {
                    top: leaveRect.top * pixelRatio,
                    left: leaveRect.left * pixelRatio,
                    width: leaveRect.width * pixelRatio,
                    height: leaveRect.height * pixelRatio,
                },
            } as DecorationPointerLeaveData);
            this.hoveredItem = undefined;
        }
    }

    /**
     * Adds a new decoration to the group.
     * @param decoration Decoration to add
     */
    add(decoration: Decoration) {
        const id = `${this.id}-${this.lastItemId++}`;

        const range = rangeFromLocator(this.wnd.document, decoration.locator);
        if (!range) {
            this.comms.log("Can't locate DOM range for decoration", decoration);
            return;
        }
        const ancestor = range.commonAncestorContainer as HTMLElement;
        if(ancestor.nodeType !== Node.TEXT_NODE && this.experimentalHighlights) {
            if(cannotNativeHighlight.includes(ancestor.nodeName.toUpperCase())) {
                // The common ancestor is an element that definitely cannot be highlighted
                this.notTextFlag?.set(id, true);
            }
            // Check if the range itself contains elements that cannot be highlighted
            const rangeFragment = range.cloneContents();
            if(rangeFragment.querySelector(cannotNativeHighlight.join(", ").toLowerCase())) {
                // Range contains elements that definitely cannot be highlighted
                this.notTextFlag?.set(id, true);
            }
            if((ancestor.textContent?.trim() || "").length === 0) {
                // No text to be highlighted
                this.notTextFlag?.set(id, true);
            }
        }
        // Walk up from both ends of the range to detect inline SVG ancestry (namespace check
        // catches <text> inside <svg> which tag-name checks above would miss).
        if(this.experimentalHighlights && !this.notTextFlag?.has(id)) {
            const hasSvgAncestor = (node: Node | null): boolean => {
                while (node && node.nodeType === Node.ELEMENT_NODE) {
                    if ((node as Element).namespaceURI?.includes("svg")) return true;
                    node = node.parentNode;
                }
                return false;
            };
            if (hasSvgAncestor(range.startContainer) || hasSvgAncestor(range.endContainer)) {
                this.notTextFlag?.set(id, true);
            }
        }
        if (this.experimentalHighlights) {
            const { type } = decoration.style;
            const { layout, width, expand } = decoration.style as BuiltinDecorationStyle;
            // CSS Highlight API only handles text-level highlight styling (boxes + wrap).
            // Everything else must go through the DOM overlay path.
            const needsDomOverlay =
                type !== DecorationStyleType.TextColor && (
                    type === DecorationStyleType.Outline ||
                    type === DecorationStyleType.Template ||
                    type === DecorationStyleType.Mask ||
                    (layout !== undefined && layout !== DecorationLayout.Boxes) ||
                    (width  !== undefined && width  !== DecorationWidth.Wrap) ||
                    !!expand
                );
            if (needsDomOverlay) this.notTextFlag?.set(id, true);
        }

        const item = {
            decoration,
            id,
            range,
            hitRects: [],
            clickableElements: undefined,
            container: undefined,
        } as DecorationItem;

        this.items.push(item);
        this.layout(item);
        item.hitRects = this.clientRectsToDocCoords(getClientRectsNoOverlap(item.range, false, false, ((item.decoration.style as BuiltinDecorationStyle).expand ?? 0) + this.hitGap()));
        this.renderLayout([item]);
    }

    /**
     * Removes the decoration with given ID from the group.
     * @param identifier ID of item to remove
     */
    remove(identifier: string) {
        const index = this.items.findIndex(i => i.decoration.id === identifier);
        if (index < 0) return;

        const item = this.items[index];
        const wasMask = item.decoration.style?.type === DecorationStyleType.Mask;
        
        this.items.splice(index, 1);
        item.clickableElements = undefined;
        if (item.container) {
            item.container.remove();
            item.container = undefined;
        }
        if (this.experimentalHighlights && !this.notTextFlag?.has(item.id) && item.highlightSubKey) {
            const cssHighlights = (this.wnd as any).CSS.highlights as Map<string, any>;
            cssHighlights.get(item.highlightSubKey)?.delete(item.range);
            if (!this.items.some(i => i.highlightSubKey === item.highlightSubKey)) {
                cssHighlights.delete(item.highlightSubKey);
            }
            const stylesheet = this.wnd.document.getElementById(`${this.id}-style`) as HTMLStyleElement | null;
            if (stylesheet) this._rebuildHighlightStylesheet(stylesheet);
        }
        this.notTextFlag?.delete(item.id);
        if (this.hoveredItem === item) {
            this.hoveredItem = undefined;
        }

        // Update shared mask if we removed a mask decoration
        if (wasMask) {
            this.updateSharedMask();
        }
    }

    /**
     * Notifies that the given decoration was modified and needs to be updated.
     * @param decoration Decoration to update
     */
    update(decoration: Decoration) {
        this.remove(decoration.id);
        this.add(decoration);
    }

    /**
     * Removes all decorations from this group.
     */
    clear() {
        this.clearContainer();
        this.items.length = 0;
        this.notTextFlag?.clear();
        this.hoveredItem = undefined;
        // Clear shared mask
        if (this.maskSvg) {
            this.maskSvg.remove();
            this.maskSvg = undefined;
        }
        if (this.shadowHost) {
            this.shadowHost.remove();
            this.shadowHost = undefined;
            this.shadowRoot = undefined;
        }
    }

    /**
     * Removes all decorations and tears down event listeners.
     * Must be called when the group is permanently discarded.
     */
    destroy() {
        this.clear();
        this.wnd.document.removeEventListener("pointerup", this.activationHandler);
        this.wnd.document.removeEventListener("pointermove", this.hoverHandler);
    }

    private clientRectsToDocCoords(rects: Rect[]): Rect[] {
        const ctx = makeWritingContext(this.wnd);
        const dx = ctx.xDocOffset;
        const dy = ctx.yDocOffset;
        if (dx === 0 && dy === 0) return rects;
        return rects.map(r => ({
            left: r.left + dx, top: r.top + dy,
            right: r.right + dx, bottom: r.bottom + dy,
            width: r.width, height: r.height,
        }));
    }

    private pointerToDocCoords(e: PointerEvent): { docX: number; docY: number } {
        const ctx = makeWritingContext(this.wnd);
        return { docX: e.clientX + ctx.xDocOffset, docY: e.clientY + ctx.yDocOffset };
    }

    private effectiveZoom(): number {
        if (!sML.UA.Blink) return 1;
        const rootZoom = parseFloat(this.wnd.getComputedStyle(this.wnd.document.documentElement).zoom);
        const bodyZoom = parseFloat(this.wnd.getComputedStyle(this.wnd.document.body).zoom);
        return (rootZoom || 1) * (bodyZoom || 1);
    }

    private hitGap(): number {
        return 2 * this.effectiveZoom();
    }

    private handleActivation(e: PointerEvent) {
        if (!this._activatable) return;
        const { docX, docY } = this.pointerToDocCoords(e);
        const pixelRatio = this.wnd.devicePixelRatio;

        for (const item of this.items) {
            let hitRect: DOMRect | undefined;

            if (item.decoration.style.type === DecorationStyleType.Template) {
                // Templates can be positioned anywhere (e.g. a margin sidemark), so hit-test
                // against the rendered elements rather than the text range rects.
                for (const el of (item.clickableElements ?? [])) {
                    const r = el.getBoundingClientRect();
                    if (rectContainsPoint(r as Rect, e.clientX, e.clientY, 0)) {
                        hitRect = r;
                        break;
                    }
                }
            } else {
                // Use pre-merged hit rects stored in document coordinates so they remain
                // valid across column/scroll navigation.
                for (const rect of item.hitRects) {
                    if (rectContainsPoint(rect, docX, docY, 0)) {
                        hitRect = item.range.getBoundingClientRect();
                        break;
                    }
                }
            }

            if (hitRect) {
                this.comms.send("decoration_activated", {
                    decorationId: item.decoration.id,
                    group: this.name,
                    rect: {
                        top: hitRect.top * pixelRatio,
                        left: hitRect.left * pixelRatio,
                        width: hitRect.width * pixelRatio,
                        height: hitRect.height * pixelRatio,
                    },
                    point: { x: e.clientX * pixelRatio, y: e.clientY * pixelRatio },
                } as DecorationActivatedEvent);
                return;
            }
        }
    }

    private handleHover(e: PointerEvent) {
        if (!this._hoverable) return;
        const { docX, docY } = this.pointerToDocCoords(e);
        const pixelRatio = this.wnd.devicePixelRatio;

        let hitItem: DecorationItem | undefined;
        let hitRect: DOMRect | undefined;

        for (const item of this.items) {
            if (item.decoration.style.type === DecorationStyleType.Template) {
                for (const el of (item.clickableElements ?? [])) {
                    const r = el.getBoundingClientRect();
                    if (rectContainsPoint(r as Rect, e.clientX, e.clientY, 0)) {
                        hitItem = item;
                        hitRect = r;
                        break;
                    }
                }
            } else {
                for (const rect of item.hitRects) {
                    if (rectContainsPoint(rect, docX, docY, 0)) {
                        hitItem = item;
                        hitRect = item.range.getBoundingClientRect();
                        break;
                    }
                }
            }

            if (hitItem) break;
        }

        if (hitItem === this.hoveredItem) return;

        if (this.hoveredItem) {
            const connected = this.hoveredItem.range.commonAncestorContainer.isConnected;
            const leaveRect = connected ? this.hoveredItem.range.getBoundingClientRect() : null;
            this.comms.send("decoration_pointer_leave", {
                decorationId: this.hoveredItem.decoration.id,
                group: this.name,
                rect: leaveRect ? {
                    top: leaveRect.top * pixelRatio,
                    left: leaveRect.left * pixelRatio,
                    width: leaveRect.width * pixelRatio,
                    height: leaveRect.height * pixelRatio,
                } : undefined,
                point: { x: e.clientX * pixelRatio, y: e.clientY * pixelRatio },
            } as DecorationPointerLeaveData);
        }

        this.hoveredItem = hitItem;

        if (hitItem && hitRect) {
            this.comms.send("decoration_pointer_enter", {
                decorationId: hitItem.decoration.id,
                group: this.name,
                rect: {
                    top: hitRect.top * pixelRatio,
                    left: hitRect.left * pixelRatio,
                    width: hitRect.width * pixelRatio,
                    height: hitRect.height * pixelRatio,
                },
                point: { x: e.clientX * pixelRatio, y: e.clientY * pixelRatio },
            } as DecorationPointerEnterData);
        }
    }

    /**
     * Recreates the decoration elements.
     * To be called after reflowing the resource, for example.
     */
    requestLayout() {
        this.wnd.cancelAnimationFrame(this.currentRender);
        this.clearContainer();
        // Wait for fonts to finish loading before reading geometry, then use a
        // rAF to ensure the browser has finished reflowing with the new metrics.
        // Without this, font-family / zoom changes cause positions to be read
        // against stale or fallback-font layout.
        this.wnd.document.fonts.ready.then(() => {
            this.currentRender = this.wnd.requestAnimationFrame(() => {
                this.items.forEach(i => {
                    this.layout(i);
                    i.hitRects = this.clientRectsToDocCoords(getClientRectsNoOverlap(i.range, false, false, ((i.decoration.style as BuiltinDecorationStyle).expand ?? 0) + this.hitGap()));
                });
                this.renderLayout(this.items);
                // Update shared mask after layout
                this.updateSharedMask();
            });
        });
    }

    private experimentalLayout(item: DecorationItem) {
        const stylesheet = this.requireContainer(true) as HTMLStyleElement;
        const cssHighlights = (this.wnd as any).CSS.highlights as Map<string, any>;

        // Template items are always routed to the DOM overlay; only BuiltinDecorationStyle reaches here.
        const style = item.decoration.style as BuiltinDecorationStyle;
        const type = style.type ?? DecorationStyleType.Highlight;
        const tint = style.tint ?? defaultTint(type);
        const width = style.width;
        const layout = style.layout;

        // Group by (type, tint) — items sharing the same visual style share one sub-highlight and one CSS rule.
        const subKey = this._getSubKey(type, tint);

        // On update: remove this item's range from its previous sub-highlight.
        if (item.highlightSubKey) {
            const oldSub = cssHighlights.get(item.highlightSubKey) as any;
            oldSub?.delete(item.range);
            if (item.highlightSubKey !== subKey &&
                !this.items.some(i => i !== item && i.highlightSubKey === item.highlightSubKey)) {
                cssHighlights.delete(item.highlightSubKey);
            }
        }
        item.highlightSubKey = subKey;

        // Get or create the shared sub-highlight for this tint group.
        let sub: any;
        if (cssHighlights.has(subKey)) {
            sub = cssHighlights.get(subKey);
        } else {
            sub = new (this.wnd as any).Highlight();
            cssHighlights.set(subKey, sub);
        }

        // Helper for caret position
        const caretPositionFromPoint = (x: number, y: number): CaretPosition | null => {
            return this.wnd.document.caretPositionFromPoint?.(x, y) ?? null;
        };

        // TextColor range registration: expand to bounding rect when layout/width asks for it.
        if (
            type === DecorationStyleType.TextColor &&
            (layout === DecorationLayout.Bounds || width === DecorationWidth.Bounds || width === DecorationWidth.Page)
        ) {
            // For vertical writing, caretPositionFromPoint has browser bugs - use fallback
            const ctx = makeWritingContext(this.wnd);
            if (ctx.isVertical) {
                console.warn('Vertical writing detected: caretPositionFromPoint has known bugs, falling back to original range');
                sub.add(item.range);
            } else {
                const boundingRect = item.range.getBoundingClientRect();
                // Page snaps to the full page inline extent; Bounds/layout:Bounds uses the actual bounding rect.
                let inlineOrigin: number;
                let inlineExtent: number;
                if (width === DecorationWidth.Page) {
                    const snap = Math.floor(ctx.inlineStart(boundingRect) / ctx.pageInlineSize) * ctx.pageInlineSize;
                    inlineOrigin = snap;
                    inlineExtent = ctx.pageInlineSize;
                } else {
                    inlineOrigin = ctx.inlineStart(boundingRect);
                    inlineExtent = ctx.inlineSize(boundingRect);
                }
                const startCaret = caretPositionFromPoint(inlineOrigin, ctx.blockStart(boundingRect) + 1);
                const endCaret = caretPositionFromPoint(inlineOrigin + inlineExtent, ctx.blockStart(boundingRect) + ctx.blockSize(boundingRect) - 1);
                if (startCaret && endCaret) {
                    const expandedRange = this.wnd.document.createRange();
                    expandedRange.setStart(startCaret.offsetNode, startCaret.offset);
                    expandedRange.setEnd(endCaret.offsetNode, endCaret.offset);
                    sub.add(expandedRange);
                    item.range = expandedRange;
                } else {
                    sub.add(item.range);
                }
            }
        } else {
            sub.add(item.range);
        }

        const backgroundColor = this.getBackgroundColor();
        const applyContrast = style.enforceContrast !== false;
        const adjustedTint = applyContrast ? adjustColorForContrast(tint, backgroundColor) : tint;

        let css: string;
        switch (type) {
            case DecorationStyleType.Underline:
                css = `::highlight(${subKey}) {
                    text-decoration: underline;
                    text-decoration-color: ${adjustedTint};
                    text-decoration-thickness: 0.1em;
                }`;
                break;
            case DecorationStyleType.Strikethrough:
                css = `::highlight(${subKey}) {
                    text-decoration: line-through;
                    text-decoration-color: ${adjustedTint};
                    text-decoration-thickness: 0.1em;
                }`;
                break;
            case DecorationStyleType.Outline:
                css = `::highlight(${subKey}) {
                    outline: 2px solid ${adjustedTint};
                    outline-offset: 1px;
                }`;
                break;
            case DecorationStyleType.TextColor:
                css = `::highlight(${subKey}) {
                    color: ${adjustedTint};
                }`;
                break;
            case DecorationStyleType.HighlightUnderline: {
                const { r, g, b } = colorToRgba(adjustedTint);
                const fillTint = `rgba(${r}, ${g}, ${b}, 0.3)`;
                css = `::highlight(${subKey}) {
                    color: ${getContrastingTextColor(adjustedTint, backgroundColor)};
                    background-color: ${fillTint};
                    text-decoration: underline;
                    text-decoration-color: ${adjustedTint};
                    text-decoration-thickness: 0.1em;
                }`;
                break;
            }
            case DecorationStyleType.Highlight:
            default:
                css = `::highlight(${subKey}) {
                    color: ${getContrastingTextColor(adjustedTint, backgroundColor)};
                    background-color: ${adjustedTint};
                }`;
        }
        item.highlightCSS = css;
        this._rebuildHighlightStylesheet(stylesheet);
    }

    private _getSubKey(type: DecorationStyleType | string, tint: string): string {
        const fingerprint = `${type}::${tint}`;
        let subKey = this._tintSubKeys.get(fingerprint);
        if (!subKey) {
            subKey = `${this.id}--${this._subKeyCounter++}`;
            this._tintSubKeys.set(fingerprint, subKey);
        }
        return subKey;
    }

    private _rebuildHighlightStylesheet(stylesheet: HTMLStyleElement) {
        const seen = new Set<string>();
        const rules: string[] = [];
        for (const item of this.items) {
            if (item.highlightSubKey && item.highlightCSS && !seen.has(item.highlightSubKey)) {
                seen.add(item.highlightSubKey);
                rules.push(item.highlightCSS);
            }
        }
        stylesheet.innerHTML = rules.join("\n");
    }

    /**
     * Layouts a single DecorationItem.
     * @param item
     */
    private layout(item: DecorationItem) {
        if (this.experimentalHighlights && !this.notTextFlag?.has(item.id)) {
            // Highlight using the new Highlight Web API!
            return this.experimentalLayout(item);
        }
        // this.comms.log("Environment does not support experimental Web Highlight API, can't layout decorations");

        const itemContainer = this.wnd.document.createElement("div");
        itemContainer.setAttribute("id", item.id);
        itemContainer.dataset.highlightId = item.decoration.id;
        // itemContainer.dataset.style = item.decoration.style; // TODO style
        itemContainer.style.setProperty("pointer-events", "none");

        const ctx = makeWritingContext(this.wnd);

        const iz = 1 / this.effectiveZoom();

        const expand = (item.decoration.style as BuiltinDecorationStyle).expand ?? 0;
        const positionElement = (element: HTMLElement, rect: Rect, boundingRect: DOMRect, inlineInset = 0) => {
            const w = item.decoration?.style?.width;
            const r = rect;
            switch (w) {
                case DecorationWidth.Viewport: {
                    const snap = Math.floor(ctx.inlineStart(r) / ctx.viewportInlineSize) * ctx.viewportInlineSize;
                    ctx.applyPosition(element, snap + ctx.inlineScrollOffset + inlineInset, ctx.blockStart(r) + ctx.blockScrollOffset, ctx.viewportInlineSize - 2 * inlineInset, ctx.blockSize(r), iz);
                    break;
                }
                case DecorationWidth.Page: {
                    const snap = Math.floor(ctx.inlineStart(r) / ctx.pageInlineSize) * ctx.pageInlineSize;
                    ctx.applyPosition(element, snap + ctx.inlineScrollOffset + inlineInset, ctx.blockStart(r) + ctx.blockScrollOffset, ctx.pageInlineSize - 2 * inlineInset, ctx.blockSize(r), iz);
                    break;
                }
                case DecorationWidth.Bounds: {
                    ctx.applyPosition(element, ctx.inlineStart(boundingRect) + ctx.inlineScrollOffset, ctx.blockStart(r) + ctx.blockScrollOffset, ctx.inlineSize(boundingRect), ctx.blockSize(r), iz);
                    break;
                }
                default: {
                    ctx.applyPosition(element, ctx.inlineStart(r) + ctx.inlineScrollOffset, ctx.blockStart(r) + ctx.blockScrollOffset, ctx.inlineSize(r), ctx.blockSize(r), iz);
                }
            }
        }
        const boundingRect = item.range.getBoundingClientRect();

        const decoStyle = item.decoration.style;
        // outline: 2px + outline-offset: 1px = 3px bleed outside the box on each side.
        // For Page/Viewport widths the snap edge coincides with the viewport edge, so the
        // outline would be clipped. Inset the element to give that bleed room to render.
        const outlineInset = (() => {
            if ((decoStyle as BuiltinDecorationStyle).type !== DecorationStyleType.Outline) return 0;
            const w = (decoStyle as BuiltinDecorationStyle).width;
            return (w === DecorationWidth.Page || w === DecorationWidth.Viewport) ? 3 : 0;
        })();
        let elementTemplate: Element;

        if (decoStyle.type === DecorationStyleType.Template) {
            // HTMLDecorationTemplate — fully custom HTML provided by the caller.
            if (decoStyle.stylesheet) {
                this.injectCustomStylesheet(decoStyle.stylesheet);
            }
            const customEl = sanitizeHTML(this.wnd, decoStyle.element) as HTMLElement | null;
            if (!customEl) {
                item.container = itemContainer;
                item.clickableElements = [];
                return;
            }
            customEl.style.setProperty("pointer-events", "none");
            elementTemplate = customEl;
        } else {
            // BuiltinDecorationStyle path.
            const style = decoStyle as BuiltinDecorationStyle;
            const type = style.type ?? DecorationStyleType.Highlight;
            const tint = style.tint ?? defaultTint(type);

            // TextColor requires CSS Highlight API; DOM overlay has no equivalent.
            if (type === DecorationStyleType.TextColor) {
                item.container = itemContainer;
                item.clickableElements = [];
                return;
            }

            // Mask: dim overlay covering the full document with SVG clip-path holes.
            if (type === DecorationStyleType.Mask) {
                // Mask decorations use a shared overlay - just mark the item and update the shared mask
                item.container = itemContainer;
                item.clickableElements = [];
                this.updateSharedMask();
                return;
            }

            const isDarkMode = this.getCurrentDarkMode();
            const backgroundColor = this.getBackgroundColor();
            const applyContrast = style.enforceContrast !== false;
            const styleAttr = (() => {
                switch (type) {
                    case DecorationStyleType.Underline: {
                        const adjustedUnderlineTint = applyContrast ? adjustColorForContrast(tint, backgroundColor) : tint;
                        const isBounds = style.layout === DecorationLayout.Bounds;
                        const [underlineSide, overlineSide] = ctx.isVertical
                            ? ["border-right", "border-left"]
                            : ["border-bottom", "border-top"];
                        return [
                            isBounds
                                ? `${overlineSide}: 0.1em solid ${adjustedUnderlineTint} !important`
                                : null,
                            `${underlineSide}: 0.1em solid ${adjustedUnderlineTint} !important`,
                            "background-color: transparent !important",
                            "box-sizing: border-box !important",
                        ].filter(Boolean).join("; ");
                    }
                    case DecorationStyleType.Strikethrough: {
                        const adjustedStrikeTint = applyContrast ? adjustColorForContrast(tint, backgroundColor) : tint;
                        const isBounds = style.layout === DecorationLayout.Bounds;
                        if (isBounds) {
                            // Bounds covers the full height of the selection — use diagonal hatch lines
                            // so the text remains readable (physical "crossing out" appearance).
                            return [
                                `background: repeating-linear-gradient(-45deg, transparent, transparent 19px, ${adjustedStrikeTint} 19px, ${adjustedStrikeTint} 20px) !important`,
                                "background-color: transparent !important",
                                "box-sizing: border-box !important",
                            ].join("; ");
                        }
                        // Boxes path: the rect is thinned and centred by the boxes loop below; just fill it.
                        return [
                            `background-color: ${adjustedStrikeTint} !important`,
                            "box-sizing: border-box !important",
                        ].join("; ");
                    }
                    case DecorationStyleType.Outline:
                        const adjustedOutlineTint = applyContrast ? adjustColorForContrast(tint, backgroundColor) : tint;
                        return [
                            `outline: 2px solid ${adjustedOutlineTint} !important`,
                            "outline-offset: 1px !important",
                            "background-color: transparent !important",
                            "box-sizing: border-box !important",
                        ].join("; ");
                    case DecorationStyleType.HighlightUnderline: {
                        const adjustedHUTint = applyContrast ? adjustColorForContrast(tint, backgroundColor) : tint;
                        const { r, g, b } = colorToRgba(adjustedHUTint);
                        const huFillTint = `rgba(${r}, ${g}, ${b}, 0.3)`;
                        const isBounds = style.layout === DecorationLayout.Bounds;
                        const [huUnderlineSide, huOverlineSide] = ctx.isVertical
                            ? ["border-right", "border-left"]
                            : ["border-bottom", "border-top"];
                        return [
                            `background-color: ${huFillTint} !important`,
                            isBounds ? `${huOverlineSide}: 0.1em solid ${adjustedHUTint} !important` : null,
                            `${huUnderlineSide}: 0.1em solid ${adjustedHUTint} !important`,
                            "box-sizing: border-box !important",
                        ].filter(Boolean).join("; ");
                    }
                    case DecorationStyleType.Highlight:
                    default: {
                        const adjustedHighlightTint = applyContrast ? adjustColorForContrast(tint, backgroundColor) : tint;
                        return [
                            `background-color: ${adjustedHighlightTint} !important`,
                            `mix-blend-mode: ${isDarkMode ? "exclusion" : "multiply"} !important`,
                            "opacity: 1 !important",
                            "box-sizing: border-box !important",
                        ].join("; ");
                    }
                }
            })();

            const template = this.wnd.document.createElement("template");
            template.innerHTML = `<div data-readium="true" class="readium-${type}" style="${styleAttr}"></div>`.trim();
            elementTemplate = template.content.firstElementChild!;
        }

        if(item.decoration?.style?.layout === DecorationLayout.Bounds) {
            const bounds = elementTemplate.cloneNode(true) as HTMLDivElement;
            bounds.style.setProperty("pointer-events", "none");
            const boundsRect: Rect = expand ? {
                left:   boundingRect.left   - expand,
                right:  boundingRect.right  + expand,
                top:    boundingRect.top    - expand,
                bottom: boundingRect.bottom + expand,
                width:  boundingRect.width  + expand * 2,
                height: boundingRect.height + expand * 2,
            } : boundingRect;
            positionElement(bounds, boundsRect, boundingRect, outlineInset);
            itemContainer.append(bounds);
        } else {
            // Fall back to "boxes" value for layout.
            // For underline/strikethrough, pre-filter to text-node rects only so Ruby
            // (rt/rp) glyphs don't produce a separate decoration segment above the base text.
            const decoType = (decoStyle as BuiltinDecorationStyle).type;
            const isLineDecoration = decoType === DecorationStyleType.Underline
                || decoType === DecorationStyleType.Strikethrough;
            const isStrikethrough = decoType === DecorationStyleType.Strikethrough;
            const rectSource = isLineDecoration
                ? getTextClientRects(item.range, ["rt", "rp"])
                : item.range;
            // Line decorations (underline/strikethrough) don't expand in the block axis —
            // expand extends endpoints along the inline axis only.
            let clientRects = getClientRectsNoOverlap(
              rectSource,
              true,              // doNotMergeHorizontallyAlignedRects
              ctx.isVertical,    // doNotMergeVerticallyAlignedRects
              isLineDecoration ? 0 : expand
            );

            clientRects = clientRects.sort((r1, r2) => {
              if (ctx.isVertical) {
                // vertical-rl: rightmost column first; vertical-lr: leftmost first
                const factor = ctx.isVertLR ? 1 : -1;
                return factor * (r1.left - r2.left);
              }
              return r1.top - r2.top;
            });

            for (let clientRect of clientRects) {
              const line = elementTemplate.cloneNode(true) as HTMLDivElement;
              line.style.setProperty("pointer-events", "none");
              let posRect: Rect = clientRect;
              if (isStrikethrough) {
                  // Thin the rect to ~10% of block size, centred on the mid-line.
                  const thickness = ctx.blockSize(clientRect) * 0.1;
                  const blockMid  = ctx.blockStart(clientRect) + ctx.blockSize(clientRect) / 2;
                  const bs = blockMid - thickness / 2;
                  posRect = ctx.isVertical
                      ? { left: bs, right: bs + thickness, top: clientRect.top,    bottom: clientRect.bottom, width: thickness,           height: clientRect.height }
                      : { top:  bs, bottom: bs + thickness, left: clientRect.left, right: clientRect.right,   height: thickness,           width: clientRect.width  };
              }
              // Expand line decorations along the inline axis only (extend endpoints, not block size).
              if (expand && isLineDecoration) {
                  posRect = ctx.isVertical
                      ? { ...posRect, top: posRect.top - expand, bottom: posRect.bottom + expand, height: posRect.height + expand * 2 }
                      : { ...posRect, left: posRect.left - expand, right: posRect.right + expand, width: posRect.width + expand * 2 };
              }
              positionElement(line, posRect, boundingRect, outlineInset);
              itemContainer.append(line);
            }
        }

        item.container = itemContainer;
        item.clickableElements = Array.from(
            itemContainer.querySelectorAll("[data-activable='1']")
        );
        if(!item.clickableElements.length) {
            item.clickableElements = Array.from(itemContainer.children) as HTMLElement[];
        }
    }

    private currentRender = 0;
    private renderLayout(items: DecorationItem[]) {
        this.wnd.cancelAnimationFrame(this.currentRender);
        this.currentRender = this.wnd.requestAnimationFrame(() => {
            items = items.filter(i => !this.experimentalHighlights || !!this.notTextFlag?.has(i.id));
            if(!items || items.length === 0) return;
            const groupContainer = this.requireContainer() as HTMLDivElement;
            groupContainer.append(...items.map(i => i.container).filter(c => !!c) as Node[])
        });
    }

    /**
     * Returns the group container element, after making sure it exists.
     * @returns Group's container
     */
    private requireContainer(experimental=false): HTMLStyleElement | HTMLDivElement {
        if (experimental) {
            // Setup <style> for highlights
            let d: HTMLStyleElement;
            if (this.wnd.document.getElementById(`${this.id}-style`)) {
                d = this.wnd.document.getElementById(`${this.id}-style`) as HTMLStyleElement;
            } else {
                d = this.wnd.document.createElement("style");
                d.dataset.readium = "true";
                d.id = `${this.id}-style`;
                this.wnd.document.head.appendChild(d);
            }

            return d;
        }

        if (!this.container) {
            // Create shared shadow host if it doesn't exist
            if (!this.shadowRoot) {
                this.shadowHost = this.wnd.document.createElement("div");
                this.shadowHost.style.cssText = "position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none";
                this.wnd.document.body.appendChild(this.shadowHost);
                this.shadowRoot = this.shadowHost.attachShadow({ mode: "open" });
            }
            
            // Create container in shared shadow root
            this.container = this.wnd.document.createElement("div");
            this.container.setAttribute("id", this.id);
            this.container.dataset.group = this.name;
            this.container.dataset.readium = "true";
            this.container.style.setProperty("pointer-events", "none");
            this.container.style.display = "contents";
            this.shadowRoot.appendChild(this.container);
        }
        return this.container;
    }

    getCurrentDarkMode(): boolean {
        return getProperty(this.wnd, "--USER__appearance") === "readium-night-on" ||
            isDarkColor(this.getBackgroundColor());
    }

    getBackgroundColor(): string {
        return getProperty(this.wnd, "--USER__backgroundColor") ||
            this.wnd.getComputedStyle(this.wnd.document.documentElement).getPropertyValue("background-color");
    }

    private updateSharedMask() {
        const maskItems = this.items.filter(item =>
            item.decoration.style?.type === DecorationStyleType.Mask
        );

        if (maskItems.length === 0) {
            // Remove shared mask if no mask decorations exist
            if (this.maskSvg) {
                this.maskSvg.remove();
                this.maskSvg = undefined;
            }
            if (this.shadowRoot) {
                this.shadowRoot.innerHTML = '';
            }
            return;
        }

        const ctx = makeWritingContext(this.wnd);

        const iz = 1 / this.effectiveZoom();

        // Collect all hole rects from mask decorations
        const docEl = this.wnd.document.documentElement;
        const docW = docEl.scrollWidth;
        const docH = docEl.scrollHeight;
        const allHoleRects: DOMRect[] = [];
        for (const item of maskItems) {
            const style  = item.decoration.style as BuiltinDecorationStyle;
            const layout = style.layout ?? DecorationLayout.Boxes;
            const width  = style.width  ?? DecorationWidth.Wrap;
            const ex     = style.expand ?? 0;

            const boundingRect = item.range.getBoundingClientRect();

            // For Bounds layout the hole is a single bounding rect; expand it directly.
            // For Boxes layout, merge rects first with expand baked in (same as highlights).
            const baseRects: Rect[] = layout === DecorationLayout.Bounds
                ? [ex ? { left: boundingRect.left - ex, top: boundingRect.top - ex, right: boundingRect.right + ex, bottom: boundingRect.bottom + ex, width: boundingRect.width + ex * 2, height: boundingRect.height + ex * 2 } : boundingRect]
                : getClientRectsNoOverlap(item.range, false, false, ex);

            for (const rect of baseRects) {
                let hole: DOMRect;
                switch (width) {
                    case DecorationWidth.Viewport: {
                        const snap = Math.floor(ctx.inlineStart(rect) / ctx.viewportInlineSize) * ctx.viewportInlineSize;
                        hole = ctx.toRect(snap, ctx.blockStart(rect), ctx.viewportInlineSize, ctx.blockSize(rect));
                        break;
                    }
                    case DecorationWidth.Page: {
                        const snap = Math.floor(ctx.inlineStart(rect) / ctx.pageInlineSize) * ctx.pageInlineSize;
                        hole = ctx.toRect(snap, ctx.blockStart(rect), ctx.pageInlineSize, ctx.blockSize(rect));
                        break;
                    }
                    case DecorationWidth.Bounds: {
                        hole = ctx.toRect(ctx.inlineStart(boundingRect), ctx.blockStart(rect), ctx.inlineSize(boundingRect), ctx.blockSize(rect));
                        break;
                    }
                    default:
                        hole = ctx.toRect(ctx.inlineStart(rect), ctx.blockStart(rect), ctx.inlineSize(rect), ctx.blockSize(rect));
                }
                allHoleRects.push(hole);
            }
        }

        // Build SVG path with all holes (physical coords — always left/top regardless of writing mode)
        const pathData = [
            `M0 0 H${docW} V${docH} H0 Z`,
            ...allHoleRects.map(r => {
                const l  = (r.left   + ctx.xDocOffset) * iz;
                const t  = (r.top    + ctx.yDocOffset) * iz;
                const ri = (r.right  + ctx.xDocOffset) * iz;
                const b  = (r.bottom + ctx.yDocOffset) * iz;
                return `M${l} ${t} H${ri} V${b} H${l} Z`;
            }),
        ].join(" ");

        const svgNS = "http://www.w3.org/2000/svg";

        // Create or update SVG
        if (!this.maskSvg) {
            // Ensure shared shadow host exists
            if (!this.shadowRoot) {
                this.shadowHost = this.wnd.document.createElement("div");
                this.shadowHost.style.cssText = "position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none";
                this.wnd.document.body.appendChild(this.shadowHost);
                this.shadowRoot = this.shadowHost.attachShadow({ mode: "open" });
            }
            
            // Create SVG in shared shadow root
            this.maskSvg = this.wnd.document.createElementNS(svgNS, "svg") as SVGSVGElement;
            this.maskSvg.style.cssText = `position:absolute;top:0;left:0;width:${docW}px;height:${docH}px;pointer-events:none;z-index:9999`;
            this.maskSvg.dataset.readium = "true";
            const defs = this.wnd.document.createElementNS(svgNS, "defs");
            const clipPath = this.wnd.document.createElementNS(svgNS, "clipPath") as SVGClipPathElement;
            const clipId = `${this.id}-mask-clip`;
            clipPath.setAttribute("id", clipId);
            clipPath.setAttribute("clipPathUnits", "userSpaceOnUse");
            const svgPath = this.wnd.document.createElementNS(svgNS, "path") as SVGPathElement;
            svgPath.setAttribute("clip-rule", "evenodd");
            clipPath.appendChild(svgPath);
            defs.appendChild(clipPath);
            this.maskSvg.appendChild(defs);
            
            // Add SVG rect for the overlay (bypasses ReadiumCSS)
            const maskRect = this.wnd.document.createElementNS(svgNS, "rect") as SVGRectElement;
            maskRect.setAttribute("id", `${this.id}-mask-rect`);
            maskRect.setAttribute("clip-path", `url(#${clipId})`);
            maskRect.style.pointerEvents = "none";
            this.maskSvg.appendChild(maskRect);
            
            this.shadowRoot!.appendChild(this.maskSvg);
        }

        // Update SVG dimensions to cover full document
        this.maskSvg.style.width = `${docW}px`;
        this.maskSvg.style.height = `${docH}px`;

        // Update the path data
        const svgPath = this.maskSvg.querySelector("path") as SVGPathElement;
        if (svgPath) {
            svgPath.setAttribute("d", pathData);
        }

        // Update the mask rect
        const maskRect = this.maskSvg.querySelector("rect") as SVGRectElement;
        if (maskRect) {
            const firstMaskStyle = maskItems[0].decoration.style as BuiltinDecorationStyle;
            const userTint = firstMaskStyle.tint;
            // User-supplied tint: alpha is their responsibility (SVG fill respects rgba natively).
            // Background color fallback: always fully opaque, so apply default dimming.
            const fillColor   = userTint ?? this.getBackgroundColor() ?? defaultTint(DecorationStyleType.Mask);
            const fillOpacity = userTint ? "1" : "0.5";
            maskRect.setAttribute("x", "0");
            maskRect.setAttribute("y", "0");
            maskRect.setAttribute("width", String(docW));
            maskRect.setAttribute("height", String(docH));
            maskRect.setAttribute("fill", fillColor);
            maskRect.setAttribute("fill-opacity", fillOpacity);
        }
    }

    private injectCustomStylesheet(css: string) {
        const id = `${this.id}-custom-style`;
        let el = this.wnd.document.getElementById(id) as HTMLStyleElement | null;
        if (!el) {
            el = this.wnd.document.createElement("style");
            el.id = id;
            el.dataset.readium = "true";
            this.wnd.document.head.appendChild(el);
        }
        el.innerHTML = css;
    }

    /**
     * Removes the group container.
     */
    private clearContainer() {
        if (this.experimentalHighlights) {
            const cssHighlights = (this.wnd as any).CSS.highlights as Map<string, unknown>;
            for (const subKey of this._tintSubKeys.values()) {
                cssHighlights.delete(subKey);
            }
            this._tintSubKeys.clear();
            this._subKeyCounter = 0;
        }
        this.wnd.document.getElementById(`${this.id}-custom-style`)?.remove();
        if (this.container) {
            this.container.remove();
            this.container = undefined;
        }
    }
}

export class Decorator extends Module {
    static readonly moduleName: ModuleName = "decorator";
    private resizeObserver!: ResizeObserver;
    private styleObserver!: MutationObserver;
    private wnd!: Window;
    /*private readonly lastSize = {
        width: 0,
        height: 0
    };*/
    private resizeFrame = 0;

    private lastGroupId = 0;
    private groups = new Map<string, DecorationGroup>();

    private cleanup() {
        this.groups.forEach(g => g.destroy());
        this.groups.clear();
    }

    private updateHighlightStyles() {
        this.groups.forEach(group => {
            group.requestLayout();
        });
    }

    private handleResize() {
        this.wnd.clearTimeout(this.resizeFrame);
        this.resizeFrame = this.wnd.setTimeout(() => {
            this.groups.forEach(g => {
                if(!g.experimentalHighlights) g.requestLayout();
            });
        }, 50);
    }
    private readonly handleResizer = this.handleResize.bind(this);

    mount(wnd: Window, comms: IComms): boolean {
        this.wnd = wnd;

        comms.register("decorate", Decorator.moduleName, (data, ack) => {
            const req = data as DecoratorRequest;
            if (req.action === "add" || req.action === "update") {
                if (req.decoration.locator) {
                    req.decoration.locator = Locator.deserialize(req.decoration.locator)!;
                }
            }
            if (!this.groups.has(req.group)) {
                this.groups.set(req.group, new DecorationGroup(
                    wnd,
                    comms,
                    `readium-decoration-${this.lastGroupId++}`,
                    req.group
                ));
            }
            const group = this.groups.get(req.group);
            switch (req.action) {
                case "add":
                    group?.add(req.decoration);
                    break;
                case "remove":
                    group?.remove(req.decoration.id);
                    break;
                case "clear":
                    group?.clear();
                    break;
                case "update":
                    group?.update(req.decoration);
                    break;
            }

            ack(true);
        });

        comms.register("decoration_activatable", Decorator.moduleName, (data, ack) => {
            const req = data as { group: string; activatable: boolean };
            const group = this.groups.get(req.group);
            if (group) {
                group.activatable = req.activatable;
            }
            ack(true);
        });

        comms.register("decoration_hoverable", Decorator.moduleName, (data, ack) => {
            const req = data as { group: string; hoverable: boolean };
            const group = this.groups.get(req.group);
            if (group) {
                group.hoverable = req.hoverable;
            }
            ack(true);
        });

        this.resizeObserver = new ResizeObserver(() => wnd.requestAnimationFrame(() => this.handleResize()));
        this.resizeObserver.observe(wnd.document.documentElement);
        wnd.addEventListener("orientationchange", this.handleResizer);
        wnd.addEventListener("resize", this.handleResizer);

        // Watch for any style change on <html> — covers appearance, background color,
        // font size, line height, margins, and anything else that reflows text.
        this.styleObserver = new MutationObserver((mutations) => {
            const shouldUpdate = mutations.some(mutation =>
                mutation.type === "attributes" &&
                mutation.attributeName === "style" &&
                mutation.oldValue !== (mutation.target as Element).getAttribute("style")
            );
            if (shouldUpdate) this.updateHighlightStyles();
        });

        this.styleObserver.observe(wnd.document.documentElement, {
            attributes: true,
            attributeFilter: ["style"],
            attributeOldValue: true,
        });

        comms.log("Decorator Mounted");
        return true;
    }

    unmount(wnd: Window, comms: IComms): boolean {
        wnd.removeEventListener("orientationchange", this.handleResizer);
        wnd.removeEventListener("resize", this.handleResizer);

        comms.unregisterAll(Decorator.moduleName);
        this.resizeObserver.disconnect();
        this.styleObserver.disconnect();
        this.cleanup();

        comms.log("Decorator Unmounted");
        return true;
    }
}
