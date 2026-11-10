import { Locator } from "@readium/shared";
import { IComms } from "../comms/comms.ts";
import { Module } from "./Module.ts";
import { rangeFromLocator } from "../helpers/locator.ts";
import { ModuleName } from "./ModuleLibrary.ts";
import { Rect, getBoundingRect, getClientRectsNoOverlap, getTextClientRects, getTextNodeClientRects, rectContainsPoint } from "../helpers/rect.ts";
import { getProperty } from "../helpers/css.ts";
import { isDarkColor, getContrastingTextColor, adjustColorForContrast, colorToRgba } from "@readium/helpers";
import { hasRTLDirection, isVerticalWriting, makeWritingContext, OVERLAY_Z_INDEX, WritingContext } from "../helpers/document.ts";
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

export enum DecorationLineStyle {
    Solid = "solid",
    Dashed = "dashed",
    Dotted = "dotted",
    Wavy = "wavy",
}

/** Built-in decoration styles. layout/width are optional overrides; defaults are Boxes/Wrap. */
export interface BuiltinDecorationStyle {
    type?: Exclude<DecorationStyleType, "template">;
    tint?: string;
    layout?: DecorationLayout;
    width?: DecorationWidth;
    enforceContrast?: boolean; // When true (default), tint is adjusted for contrast against the background.
    expand?: number; // Inflates each client rect outward by this many CSS pixels on all sides.
    thickness?: number; // Line/stroke width in CSS pixels; for textColor, extra glyph stroke width (faux bold, not in WebKit).
    lineStyle?: DecorationLineStyle; // Line/stroke pattern of underline, strikethrough, highlightUnderline and outline.
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

export type DecorationResizeRequest =
    | { action: "watch"; selector: string }
    | { action: "unwatch"; selector: string };

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
// Elements whose boxes text-node rects leave out.
const replacedContentTags = [...cannotNativeHighlight, "IFRAME", "OBJECT", "EMBED", "CANVAS"];
// Text of a range in one column, or in a column-spanning element: a run is text in the same container, outside or inside the same spanner.
type FragmentPart = { text: Rect; column?: Rect; run: number; vertical: boolean };
// Elements that trigger WebKit's CSS Custom Highlight repaint bug on removal.
const webkitRepaintProneTags = new Set(["SUP", "SUB", "SMALL", "CODE"]);
const outlineStrokeWidth = 2;
const outlineOffset = 1;
const lineThickness = 0.1;

class DecorationGroup {
    public readonly items: DecorationItem[] = [];
    private lastItemId = 0;
    private container: HTMLDivElement | undefined = undefined;
    private _activatable = false;
    private _hoverable = false;
    private hoveredItem: DecorationItem | undefined = undefined;
    private hoveredFragment = 0;
    public readonly experimentalHighlights: boolean = false;
    private readonly notTextFlag: Map<string, boolean> | undefined;
    private readonly _tintSubKeys = new Map<string, string>(); // (type::adjustedTint) → subKey
    private _subKeyCounter = 0;
    private pendingWebkitReflow: Set<Element> | null = null;
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

    /** True if this group has at least one item rendered via the DOM overlay path (not CSS Highlight API). */
    get hasOverlayItems(): boolean {
        return !this.experimentalHighlights || (this.notTextFlag?.size ?? 0) > 0;
    }

    set hoverable(value: boolean) {
        this._hoverable = value;
        if (!value && this.hoveredItem) {
            const leaveRect = this.hoveredBounds(this.hoveredItem);
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
            const { layout, width, expand, thickness, lineStyle } = decoration.style as BuiltinDecorationStyle;
            // CSS Highlight API only handles text-level highlight styling (boxes + wrap).
            // Everything else must go through the DOM overlay path.
            const needsDomOverlay =
                type !== DecorationStyleType.TextColor && (
                    type === DecorationStyleType.Outline ||
                    type === DecorationStyleType.Template ||
                    type === DecorationStyleType.Mask ||
                    (layout !== undefined && layout !== DecorationLayout.Boxes) ||
                    (width  !== undefined && width  !== DecorationWidth.Wrap) ||
                    !!expand ||
                    // WebKit parses but doesn't paint text-decoration thickness/style in ::highlight().
                    (!!sML.UA.WebKit && type !== DecorationStyleType.Highlight &&
                        (thickness !== undefined || (!!lineStyle && lineStyle !== DecorationLineStyle.Solid))) ||
                    // Blink doesn't paint underlines in ::highlight() in vertical Japanese or Korean documents.
                    (!!sML.UA.Blink && isVerticalWriting(this.wnd) &&
                        (type === DecorationStyleType.Underline || type === DecorationStyleType.HighlightUnderline))
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
        item.hitRects = this.clientRectsToDocCoords(getClientRectsNoOverlap(DecorationGroup.rangeBoxes(item.range), false, false, this.scaledExpand(item.decoration.style) + this.hitGap()));
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
            this.scheduleWebkitRepaintFix([item]);
        }
        this.notTextFlag?.delete(item.id);
        if (this.hoveredItem === item) {
            this.hoveredItem = undefined;
        }

        // Update shared mask if we removed a mask decoration
        if (wasMask) {
            this.scheduleMaskUpdate();
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
        if (this.experimentalHighlights) {
            this.scheduleWebkitRepaintFix(this.items);
        }
        this.clearContainer();
        this.items.length = 0;
        this.notTextFlag?.clear();
        this.hoveredItem = undefined;
        // The shared mask is removed with the next update, so masks added back meanwhile don't flash.
        if (this.maskSvg) this.scheduleMaskUpdate();
        else this.removeShadowHost();
    }

    /**
     * Removes all decorations and tears down event listeners.
     * Must be called when the group is permanently discarded.
     */
    destroy() {
        this.clear();
        this.wnd.cancelAnimationFrame(this.maskFrame);
        this.maskFrame = 0;
        this.maskSvg?.remove();
        this.maskSvg = undefined;
        this.removeShadowHost();
        this.wnd.document.removeEventListener("pointerup", this.activationHandler);
        this.wnd.document.removeEventListener("pointermove", this.hoverHandler);
    }

    /** True if the element triggers WebKit's CSS Custom Highlight repaint bug. */
    private isWebkitRepaintProne(el: Element): boolean {
        const style = this.wnd.getComputedStyle(el);
        if (webkitRepaintProneTags.has(el.tagName.toUpperCase()) || style.display === "inline-block" || style.verticalAlign !== "baseline") {
            return true;
        }
        const parentStyle = el.parentElement ? this.wnd.getComputedStyle(el.parentElement) : null;
        return !!parentStyle && parseFloat(style.fontSize) !== parseFloat(parentStyle.fontSize);
    }

    /** Finds a repaint-prone element (see isWebkitRepaintProne) intersecting the range, if any. */
    private findWebkitRepaintProneElement(range: Range): Element | null {
        let el: Element | null = range.startContainer.nodeType === Node.ELEMENT_NODE
            ? range.startContainer as Element
            : range.startContainer.parentElement;
        while (el) {
            if (this.isWebkitRepaintProne(el)) return el;
            if (this.wnd.getComputedStyle(el).display !== "inline") break; // reached the containing block
            el = el.parentElement;
        }

        const root = range.commonAncestorContainer;
        const walkRoot = root.nodeType === Node.ELEMENT_NODE ? root as Element : root.parentElement;
        if (!walkRoot) return null;
        // Reject prunes subtrees the range doesn't touch, so a small range under a large
        // common ancestor (e.g. spanning two paragraphs in a big section) doesn't walk the whole thing.
        const walker = this.wnd.document.createTreeWalker(walkRoot, NodeFilter.SHOW_ELEMENT, node =>
            range.intersectsNode(node as Element) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT
        );
        for (let node = walker.nextNode() as Element | null; node; node = walker.nextNode() as Element | null) {
            if (this.isWebkitRepaintProne(node)) return node;
        }
        return null;
    }

    /** Reflows the containing block of the offending element; its own box isn't enough since inline layout is computed per line. */
    private forceWebkitBlockReflow(offender: Element) {
        let el: Element | null = offender;
        while (el) {
            const display = this.wnd.getComputedStyle(el).display;
            if (display !== "inline" && display !== "inline-block") break;
            el = el.parentElement;
        }
        if (!el || !el.isConnected) return;
        const block = el as HTMLElement;
        const previousTransform = block.style.getPropertyValue("transform");
        const previousPriority = block.style.getPropertyPriority("transform");
        // Paint-only nudge: promotes then repaints the compositing layer without
        // touching layout, so it can't disturb scroll position, focus, or selection.
        block.style.setProperty("transform", "translateZ(0.001px)", "important");
        void block.offsetHeight;
        block.style.setProperty("transform", "translateZ(0px)", "important");
        void block.offsetHeight;
        if (previousTransform) {
            block.style.setProperty("transform", previousTransform, previousPriority);
        } else {
            block.style.removeProperty("transform");
        }
    }

    /** Finds WebKit repaint-prone elements among the given items and queues a reflow of their containing blocks. */
    private scheduleWebkitRepaintFix(items: DecorationItem[]) {
        if (!sML.UA.WebKit) return;
        for (const item of items) {
            if (this.notTextFlag?.has(item.id) || !item.highlightSubKey) continue;
            const offender = this.findWebkitRepaintProneElement(item.range);
            if (offender) this.queueWebkitReflow(offender);
        }
    }

    /** Batches offenders behind a single animation frame so many decorations removed in the same tick only reflow each block once. */
    private queueWebkitReflow(offender: Element) {
        if (!this.pendingWebkitReflow) {
            this.pendingWebkitReflow = new Set();
            // Forcing layout synchronously doesn't guarantee a paint; defer to a real frame.
            this.wnd.requestAnimationFrame(() => {
                const pending = this.pendingWebkitReflow;
                this.pendingWebkitReflow = null;
                pending?.forEach(el => this.forceWebkitBlockReflow(el));
            });
        }
        this.pendingWebkitReflow.add(offender);
    }

    private clientRectsToDocCoords(rects: Rect[], ctx: WritingContext = makeWritingContext(this.wnd)): Rect[] {
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

    /** The style's expand (CSS pixels) converted to client-rect units. */
    private scaledExpand(style: DecorationStyle): number {
        return ((style as BuiltinDecorationStyle).expand ?? 0) * this.effectiveZoom();
    }

    private handleActivation(e: PointerEvent) {
        if (!this._activatable) return;
        const { docX, docY } = this.pointerToDocCoords(e);
        const pixelRatio = this.wnd.devicePixelRatio;

        for (const item of this.items) {
            let hitRect: Rect | undefined;

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
                        const bounds = DecorationGroup.fragmentBounds(item.range);
                        hitRect = bounds[DecorationGroup.fragmentIndex(bounds, DecorationGroup.pointRect(e), makeWritingContext(this.wnd))];
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
        let hitRect: Rect | undefined;
        let hitFragment = 0;

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
                        break;
                    }
                }
            }

            if (hitItem) break;
        }

        if (hitItem === this.hoveredItem) return;

        if (hitItem) {
            const bounds = DecorationGroup.fragmentBounds(hitItem.range);
            hitFragment = DecorationGroup.fragmentIndex(bounds, DecorationGroup.pointRect(e), makeWritingContext(this.wnd));
            // Templates report their rendered element instead.
            hitRect ??= bounds[hitFragment];
        }

        if (this.hoveredItem) {
            const connected = this.hoveredItem.range.commonAncestorContainer.isConnected;
            const leaveRect = connected ? this.hoveredBounds(this.hoveredItem) : null;
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
        this.hoveredFragment = hitFragment;

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
                    i.hitRects = this.clientRectsToDocCoords(getClientRectsNoOverlap(DecorationGroup.rangeBoxes(i.range), false, false, this.scaledExpand(i.decoration.style) + this.hitGap()));
                });
                this.renderLayout(this.items);
            });
        });
    }

    /**
     * Cheap scroll-driven pass: repositions existing overlay elements in place instead of
     * requestLayout()'s full destroy-and-rebuild, only falling back to a full layout()
     * per item when geometry has genuinely changed shape (a real reflow).
     */
    repositionOverlays() {
        const relaidOut: DecorationItem[] = [];
        const ctx = makeWritingContext(this.wnd);
        let overlayCtx: WritingContext | undefined;
        this.items.forEach(item => {
            if (this.experimentalHighlights && !this.notTextFlag?.has(item.id)) return;
            // Scrolling inside a container moves the text without scrolling the document.
            if (item.decoration.style?.type === DecorationStyleType.Mask) {
                this.scheduleMaskUpdate();
                return;
            }
            if (!this.repositionItem(item, overlayCtx ??= this.overlayContext())) {
                item.container?.remove();
                this.layout(item);
                relaidOut.push(item);
            }
            item.hitRects = this.clientRectsToDocCoords(getClientRectsNoOverlap(DecorationGroup.rangeBoxes(item.range), false, false, this.scaledExpand(item.decoration.style) + this.hitGap()), ctx);
        });
        if (relaidOut.length) this.renderLayout(relaidOut);
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
        const subKey = this._getSubKey(type, tint, style.thickness, style.lineStyle);

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
                // The range starts in its first fragment and ends in its last.
                const bounds = DecorationGroup.fragmentBounds(item.range);
                const first = bounds[0];
                const last = bounds[bounds.length - 1];
                // Right-to-left lines start on the right.
                const ancestor = item.range.commonAncestorContainer;
                const textElement = ancestor.nodeType === Node.ELEMENT_NODE ? ancestor as Element : ancestor.parentElement!;
                const rtl = hasRTLDirection(this.wnd, textElement);
                // Page snaps to the full page inline extent; Bounds/layout:Bounds uses the actual bounding rect.
                const lineEdges = (fragment: Rect): [number, number] => {
                    const inlineOrigin = width === DecorationWidth.Page
                        ? Math.floor(ctx.inlineStart(fragment) / ctx.pageInlineSize) * ctx.pageInlineSize
                        : ctx.inlineStart(fragment);
                    const inlineExtent = width === DecorationWidth.Page ? ctx.pageInlineSize : ctx.inlineSize(fragment);
                    return rtl ? [inlineOrigin + inlineExtent, inlineOrigin] : [inlineOrigin, inlineOrigin + inlineExtent];
                };
                const startCaret = caretPositionFromPoint(lineEdges(first)[0], ctx.blockStart(first) + 1);
                const endCaret = caretPositionFromPoint(lineEdges(last)[1], ctx.blockStart(last) + ctx.blockSize(last) - 1);
                const expandedRange = this.wnd.document.createRange();
                if (startCaret && endCaret) {
                    expandedRange.setStart(startCaret.offsetNode, startCaret.offset);
                    // Text running against the element's direction puts the carets in reverse document order.
                    if (expandedRange.comparePoint(endCaret.offsetNode, endCaret.offset) < 0) {
                        expandedRange.setStart(endCaret.offsetNode, endCaret.offset);
                    } else {
                        expandedRange.setEnd(endCaret.offsetNode, endCaret.offset);
                    }
                }
                if (!expandedRange.collapsed) {
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

        const lineWidth = style.thickness === undefined ? `${lineThickness}em` : `${style.thickness}px`;
        const lineStyle = style.lineStyle ?? DecorationLineStyle.Solid;

        let css: string;
        switch (type) {
            case DecorationStyleType.Underline:
                css = `::highlight(${subKey}) {
                    text-decoration: underline;
                    text-decoration-color: ${adjustedTint};
                    text-decoration-thickness: ${lineWidth};
                    text-decoration-style: ${lineStyle};
                }`;
                break;
            case DecorationStyleType.Strikethrough:
                css = `::highlight(${subKey}) {
                    text-decoration: line-through;
                    text-decoration-color: ${adjustedTint};
                    text-decoration-thickness: ${lineWidth};
                    text-decoration-style: ${lineStyle};
                }`;
                break;
            case DecorationStyleType.Outline:
                css = `::highlight(${subKey}) {
                    outline: 2px solid ${adjustedTint};
                    outline-offset: 1px;
                }`;
                break;
            case DecorationStyleType.TextColor: {
                // Faux bold: font-weight isn't allowed in ::highlight() and would reflow anyway.
                const shift = style.thickness ? style.thickness / 2 : 0;
                const [x, y] = makeWritingContext(this.wnd).isVertical ? [0, shift] : [shift, 0];
                css = `::highlight(${subKey}) {
                    color: ${adjustedTint};${shift ? `
                    text-shadow: ${x}px ${y}px 0 ${adjustedTint}, ${-x}px ${-y}px 0 ${adjustedTint};` : ""}
                }`;
                break;
            }
            case DecorationStyleType.HighlightUnderline: {
                const { r, g, b } = colorToRgba(adjustedTint);
                const fillTint = `rgba(${r}, ${g}, ${b}, 0.3)`;
                css = `::highlight(${subKey}) {
                    color: ${getContrastingTextColor(fillTint, backgroundColor)};
                    background-color: ${fillTint};
                    text-decoration: underline;
                    text-decoration-color: ${adjustedTint};
                    text-decoration-thickness: ${lineWidth};
                    text-decoration-style: ${lineStyle};
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

    private _getSubKey(type: DecorationStyleType | string, tint: string, thickness?: number, lineStyle?: DecorationLineStyle): string {
        const fingerprint = `${type}::${tint}::${thickness ?? ""}::${lineStyle ?? ""}`;
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
     * Positions a single overlay element according to the decoration's width mode.
     */
    private positionElement(item: DecorationItem, ctx: WritingContext, iz: number, element: HTMLElement, rect: Rect, bounds: Rect[], inlineInset = 0) {
        const [inlineStart, blockStart, inlineSize, blockSize] = this.overlayBox(item, ctx, rect, bounds, inlineInset);
        ctx.applyPosition(element, inlineStart, blockStart, inlineSize, blockSize, iz);
    }

    /**
     * Logical box (inline start, block start, inline size, block size) in document
     * coordinates that an overlay rect occupies under the decoration's width mode.
     */
    private overlayBox(item: DecorationItem, ctx: WritingContext, rect: Rect, bounds: Rect[], inlineInset = 0): [number, number, number, number] {
        const w = item.decoration?.style?.width;
        const r = rect;
        switch (w) {
            case DecorationWidth.Viewport: {
                const snap = Math.floor(ctx.inlineStart(r) / ctx.viewportInlineSize) * ctx.viewportInlineSize;
                return [snap + ctx.inlineScrollOffset + inlineInset, ctx.blockStart(r) + ctx.blockScrollOffset, ctx.viewportInlineSize - 2 * inlineInset, ctx.blockSize(r)];
            }
            case DecorationWidth.Page: {
                const snap = Math.floor(ctx.inlineStart(r) / ctx.pageInlineSize) * ctx.pageInlineSize;
                return [snap + ctx.inlineScrollOffset + inlineInset, ctx.blockStart(r) + ctx.blockScrollOffset, ctx.pageInlineSize - 2 * inlineInset, ctx.blockSize(r)];
            }
            case DecorationWidth.Bounds: {
                const fragment = bounds[DecorationGroup.fragmentIndex(bounds, r, ctx)];
                return [ctx.inlineStart(fragment) + ctx.inlineScrollOffset, ctx.blockStart(r) + ctx.blockScrollOffset, ctx.inlineSize(fragment), ctx.blockSize(r)];
            }
            default:
                return [ctx.inlineStart(r) + ctx.inlineScrollOffset, ctx.blockStart(r) + ctx.blockScrollOffset, ctx.inlineSize(r), ctx.blockSize(r)];
        }
    }

    /** Bounding rects of a range, one per column it runs across in multi-column containers, in document order. */
    private static fragmentBounds(range: Range): Rect[] {
        const parts = DecorationGroup.fragmentParts(range);
        const boxes = DecorationGroup.rangeBoxes(range);
        // With a multi-column element held whole, the range's bounding rect would cover all its columns.
        if (!parts.length || (parts.length < 2 && !Array.isArray(boxes))) return [range.getBoundingClientRect()];

        // Images and other element boxes, which text rects leave out, widen the part they're in.
        for (const box of Array.isArray(boxes) ? boxes : Array.from(boxes.getClientRects())) {
            if (!box.width && !box.height) continue;
            // A block box can be wider than its text, so the part it holds comes first; then the part of the
            // content it's in, as parts before and after a nested multi-column element share a column.
            const part = parts.find(p => rectContainsPoint(box, ...DecorationGroup.center(p.column ?? p.text), 0))
                ?? parts.find(p => rectContainsPoint(p.text, ...DecorationGroup.center(box), 0))
                ?? parts.find(p => rectContainsPoint(p.column ?? p.text, ...DecorationGroup.center(box), 0));
            if (part) part.text = getBoundingRect(part.text, box);
            else parts.push({ text: box, run: 0, vertical: false });
        }
        return parts.map(p => p.text);
    }

    /**
     * Text of a range, in one part per column it runs across in multi-column containers, in document order.
     * A line's column is the box holding it among the ones the container's child reports, one per column.
     */
    private static fragmentParts(range: Range): FragmentPart[] {
        const wnd = range.startContainer.ownerDocument?.defaultView;
        if (!wnd) return [];
        const styles = new Map<Element, CSSStyleDeclaration>();
        const style = (el: Element) => styles.get(el) ?? styles.set(el, wnd.getComputedStyle(el)).get(el)!;
        const childBoxes = new Map<Node, Rect[]>();
        // Text directly in the container has no element of its own, so its line boxes stand in for it.
        const boxesOf = (child: Node) => {
            let boxes = childBoxes.get(child);
            if (!boxes) {
                const textRange = child.ownerDocument!.createRange();
                textRange.selectNode(child);
                const source = child.nodeType === Node.ELEMENT_NODE ? child as Element : textRange;
                childBoxes.set(child, boxes = Array.from(source.getClientRects()));
            }
            return boxes;
        };
        const center = DecorationGroup.center;

        const parts: FragmentPart[] = [];
        const overlap = (a: FragmentPart, b: Rect) => a.vertical ? a.column!.top < b.bottom && b.top < a.column!.bottom : a.column!.left < b.right && b.left < a.column!.right;
        let run = 0;
        let previous: [Element | null, Element | null] | undefined;
        // Content without text, such as an image or an empty block, takes up a column all the same.
        const textless = DecorationGroup.rangeElements(range).textless.map(node => ({ node: node as Node, rects: DecorationGroup.plainRects(node.getClientRects()) }));
        const contents = [...getTextNodeClientRects(range, ["rt", "rp"]), ...textless]
            .sort((a, b) => a.node.compareDocumentPosition(b.node) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1);
        for (const { node, rects } of contents) {
            let child: Node = node, container: Element | null = null;
            let spanner: Element | null = node.nodeType === Node.ELEMENT_NODE && style(node as Element).columnSpan === "all" ? node as Element : null;
            for (let el = node.parentElement; el; child = el, el = el.parentElement) {
                const s = style(el);
                if (s.columnCount !== "auto" || s.columnWidth !== "auto") { container = el; break; }
                if (s.columnSpan === "all") spanner = el;
            }
            if (!container) spanner = null;
            if (!previous || previous[0] !== container || previous[1] !== spanner) run++;
            previous = [container, spanner];
            const vertical = !!container && !style(container).writingMode.startsWith("horizontal");
            for (const rect of rects) {
                if (!rect.width && !rect.height) continue;
                const column = container && !spanner ? boxesOf(child).find(b => rectContainsPoint(b, ...center(rect), 0)) ?? rect : undefined;
                const part = parts.find(p => p.run === run && (column && p.column ? overlap(p, column) : !column && !p.column));
                if (!part) parts.push({ text: rect, column, run, vertical });
                else {
                    part.text = getBoundingRect(part.text, rect);
                    if (column) part.column = getBoundingRect(part.column!, column);
                }
            }
        }
        // A child box wider than its column, for one, can make two parts overlap.
        for (let merged = true; merged;) {
            merged = false;
            for (let i = 0; i < parts.length && !merged; i++) {
                const j = parts.findIndex((q, k) => k > i && q.run === parts[i].run && !!q.column && !!parts[i].column && overlap(parts[i], q.column));
                if (j < 0) continue;
                parts[i].text = getBoundingRect(parts[i].text, parts[j].text);
                parts[i].column = getBoundingRect(parts[i].column!, parts[j].column!);
                parts.splice(j, 1);
                merged = true;
            }
        }
        return parts;
    }

    /**
     * A range's boxes, without those of the elements it holds whole that lay out columns or hold one that does,
     * which run across those columns. The range itself when it holds none.
     */
    private static rangeBoxes(range: Range): Range | Rect[] {
        const { textless, columns } = DecorationGroup.rangeElements(range);
        if (!columns.length) return range;
        const leftOut = columns.flatMap(el => DecorationGroup.plainRects(el.getClientRects()));
        const same = (a: Rect, b: Rect) => Math.abs(a.left - b.left) < 0.5 && Math.abs(a.top - b.top) < 0.5 && Math.abs(a.right - b.right) < 0.5 && Math.abs(a.bottom - b.bottom) < 0.5;
        const kept = DecorationGroup.plainRects(range.getClientRects()).filter(box => !leftOut.some(r => same(r, box)));
        // A left-out element box stood for its content without text too, unlike its text, which has rects of its own.
        return [...kept, ...textless.flatMap(el => DecorationGroup.plainRects(el.getClientRects()))];
    }

    private static center(r: Rect): readonly [number, number] {
        return [(r.left + r.right) / 2, (r.top + r.bottom) / 2];
    }

    /** Index of the bounds holding a rect's center, or else the nearest along the inline axis, then the block axis. */
    private static fragmentIndex(bounds: Rect[], rect: Rect, ctx: WritingContext): number {
        const x = (rect.left + rect.right) / 2, y = (rect.top + rect.bottom) / 2;
        const holding = bounds.findIndex(b => rectContainsPoint(b, x, y, 0));
        if (holding >= 0) return holding;
        const gap = (start: number, size: number, p: number) => Math.max(0, start - p, p - start - size);
        const distance = (b: Rect) => [
            gap(ctx.inlineStart(b), ctx.inlineSize(b), ctx.isVertical ? y : x),
            gap(ctx.blockStart(b), ctx.blockSize(b), ctx.isVertical ? x : y),
        ];
        let best = 0;
        bounds.forEach((b, i) => {
            const [inline, block] = distance(b), [bestInline, bestBlock] = distance(bounds[best]);
            if (inline < bestInline || (inline === bestInline && block < bestBlock)) best = i;
        });
        return best;
    }

    private static pointRect(e: PointerEvent): Rect {
        return { left: e.clientX, right: e.clientX, top: e.clientY, bottom: e.clientY, width: 0, height: 0 };
    }

    /** Fragment bounds for the styles drawn from them, as measuring them walks the decoration's text. */
    private static drawnBounds(item: DecorationItem): Rect[] {
        const style = item.decoration?.style;
        return style?.layout === DecorationLayout.Bounds || style?.width === DecorationWidth.Bounds
            ? DecorationGroup.fragmentBounds(item.range)
            : [];
    }

    /** Bounds of the fragment the pointer entered, so leaving reports the same rect as entering. */
    private hoveredBounds(item: DecorationItem): Rect {
        const bounds = DecorationGroup.fragmentBounds(item.range);
        return bounds[Math.min(this.hoveredFragment, bounds.length - 1)];
    }

    /** Boxes of the images and other replaced content in a range, which text-node rects leave out. */
    private static replacedContentRects(range: Range): Rect[] {
        const ancestor = range.commonAncestorContainer;
        if (ancestor.nodeType !== Node.ELEMENT_NODE) return [];
        return Array.from((ancestor as Element).querySelectorAll(replacedContentTags.join(", ").toLowerCase()))
            .filter(element => range.intersectsNode(element))
            .flatMap(element => DecorationGroup.plainRects(element.getClientRects()));
    }

    /**
     * Elements of a range whose boxes text-node rects don't account for: the outermost ones without text inside,
     * and the ones it holds whole that lay out columns or hold one that does.
     */
    private static rangeElements(range: Range): { textless: Element[]; columns: Element[] } {
        const ancestor = range.commonAncestorContainer;
        const doc = ancestor.ownerDocument;
        const wnd = doc?.defaultView;
        if (ancestor.nodeType !== Node.ELEMENT_NODE || !wnd) return { textless: [], columns: [] };
        const walker = doc.createTreeWalker(ancestor, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT, {
            acceptNode: node => range.intersectsNode(node) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT,
        });
        const elements: Element[] = [];
        const withText = new Set<Node>(), withColumns = new Set<Node>();
        const mark = (from: Node | null, set: Set<Node>) => {
            for (let node = from; node && node !== ancestor && !set.has(node); node = node.parentNode) set.add(node);
        };
        for (let node = walker.nextNode(); node; node = walker.nextNode()) {
            if (node.nodeType !== Node.ELEMENT_NODE) {
                if (node.textContent!.trim()) mark(node.parentNode, withText);
                continue;
            }
            elements.push(node as Element);
            const s = wnd.getComputedStyle(node as Element);
            if (s.columnCount !== "auto" || s.columnWidth !== "auto") mark(node, withColumns);
        }
        // Elements laying out columns have their content measured instead, column by column.
        let outermost: Element | undefined;
        const textless = elements.filter(el => !withText.has(el) && !withColumns.has(el) && !outermost?.contains(el) && (outermost = el));
        const elementRange = doc.createRange();
        const columns = elements.filter(el => {
            if (!withColumns.has(el)) return false;
            elementRange.selectNode(el);
            return range.compareBoundaryPoints(Range.START_TO_START, elementRange) <= 0 && range.compareBoundaryPoints(Range.END_TO_END, elementRange) >= 0;
        });
        return { textless, columns };
    }

    /** Plain objects, since getClientRectsNoOverlap adjusts rects in place. */
    private static plainRects(rects: DOMRectList): Rect[] {
        return Array.from(rects, ({ left, right, top, bottom, width, height }) => ({ left, right, top, bottom, width, height }));
    }

    /**
     * Merges the runs of each line, which inline elements such as sup or code split into rects of different sizes.
     * With `lengthenOnly`, as for text decorations, a line keeps the block position of its tallest run, and those rects only lengthen it.
     */
    private static mergeLineRects(rects: Rect[], ctx: WritingContext, lengthenOnly?: Rect[]): Rect[] {
        const blockEnd = (r: Rect) => ctx.blockStart(r) + ctx.blockSize(r);
        const inlineEnd = (r: Rect) => ctx.inlineStart(r) + ctx.inlineSize(r);
        const sameLine = (rect: Rect, line: Rect) =>
            Math.min(blockEnd(rect), blockEnd(line)) - Math.max(ctx.blockStart(rect), ctx.blockStart(line)) > Math.min(ctx.blockSize(rect), ctx.blockSize(line)) / 2 &&
            Math.max(ctx.inlineStart(rect), ctx.inlineStart(line)) - Math.min(inlineEnd(rect), inlineEnd(line)) <= 1;
        const union = (a: Rect, b: Rect, blockFrom?: Rect): Rect => {
            const left = Math.min(a.left, b.left), right = Math.max(a.right, b.right);
            const top = Math.min(a.top, b.top), bottom = Math.max(a.bottom, b.bottom);
            const box = { left, right, top, bottom, width: right - left, height: bottom - top };
            if (!blockFrom) return box;
            return ctx.isVertical
                ? { ...box, left: blockFrom.left, right: blockFrom.right, width: blockFrom.width }
                : { ...box, top: blockFrom.top, bottom: blockFrom.bottom, height: blockFrom.height };
        };
        const merged: Rect[] = [];
        // Sorted along the inline axis, each run touches the line it extends.
        for (const rect of [...rects].sort((a, b) => ctx.inlineStart(a) - ctx.inlineStart(b))) {
            const index = merged.findIndex(line => sameLine(rect, line));
            if (index < 0) {
                merged.push(rect);
                continue;
            }
            const line = merged[index];
            merged[index] = union(line, rect, lengthenOnly && (ctx.blockSize(rect) > ctx.blockSize(line) ? rect : line));
        }
        for (const rect of lengthenOnly ?? []) {
            const index = merged.findIndex(line => sameLine(rect, line));
            if (index < 0) merged.push(rect);
            else merged[index] = union(merged[index], rect, merged[index]);
        }
        return merged;
    }

    private static isShapeOutline(style: DecorationStyle): boolean {
        // CSS outlines can't be wavy, so a wavy Bounds outline is drawn as a path too, as is a dotted one in WebKit.
        const { lineStyle } = style as BuiltinDecorationStyle;
        return style.type === DecorationStyleType.Outline &&
            (style.layout !== DecorationLayout.Bounds || lineStyle === DecorationLineStyle.Wavy || DecorationGroup.drawsOwnDots(lineStyle));
    }

    /** WebKit sometimes paints dotted borders solid on high-density screens, depending on their length. */
    private static drawsOwnDots(lineStyle?: DecorationLineStyle): boolean {
        return !!sML.UA.WebKit && lineStyle === DecorationLineStyle.Dotted;
    }

    /** Tiling SVG dot for a CSS background, one dot and one gap long and one dot across. */
    private static dotImage(tint: string, vertical: boolean): string {
        const viewBox = vertical ? "0 0 1 2" : "0 0 2 1";
        const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}" preserveAspectRatio="none"><circle cx="0.5" cy="0.5" r="0.5" fill="${tint}"/></svg>`;
        return `url('data:image/svg+xml,${encodeURIComponent(svg)}')`;
    }

    /** Tiling SVG wave for a CSS background, one wavelength long and three stroke widths across. */
    private static waveImage(tint: string, vertical: boolean): string {
        const [viewBox, path] = vertical ? ["0 0 3 6", "M1.5 0Q-0.5 1.5 1.5 3T1.5 6"] : ["0 0 6 3", "M0 1.5Q1.5 -0.5 3 1.5T6 1.5"];
        const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}" preserveAspectRatio="none"><path d="${path}" fill="none" stroke="${tint}" stroke-width="1" stroke-linecap="round"/></svg>`;
        return `url('data:image/svg+xml,${encodeURIComponent(svg)}')`;
    }

    /**
     * Declarations drawing an underline, plus an overline for Bounds layout, outside the element's box so
     * thickness grows away from the text, with an optional fill kept over the text.
     */
    private underlineDeclarations(item: DecorationItem, ctx: WritingContext, tint: string, lineStyle: DecorationLineStyle, isBounds: boolean, fill?: string): string[] {
        const t = this.underlineWidth(item);
        const [under, over] = ctx.isVertical ? ["right", "left"] : ["bottom", "top"];
        const sides = isBounds ? [under, over] : [under];
        // Content-box sizing adds borders and padding outside the positioned box; the overline is pulled back over it.
        const declarations = ["box-sizing: content-box !important"];
        const wavy = lineStyle === DecorationLineStyle.Wavy;
        if (!wavy && !DecorationGroup.drawsOwnDots(lineStyle)) {
            declarations.push(...sides.map(side => `border-${side}: ${t} ${lineStyle} ${tint} !important`));
            if (isBounds) declarations.push(`margin-${over}: calc(-1 * ${t}) !important`);
            declarations.push(fill ? `background: ${fill} padding-box !important` : "background-color: transparent !important");
            return declarations;
        }
        const band = wavy ? `calc(3 * ${t})` : t;
        const period = `calc(${wavy ? 6 : 2} * ${t})`;
        declarations.push(...sides.map(side => `padding-${side}: ${band} !important`));
        if (isBounds) declarations.push(`margin-${over}: calc(-1 * ${band}) !important`);
        const image = wavy ? DecorationGroup.waveImage(tint, ctx.isVertical) : DecorationGroup.dotImage(tint, ctx.isVertical);
        const waves = sides.map(side => ({
            position: ctx.isVertical ? `${side} top` : `left ${side}`,
            size: ctx.isVertical ? `${band} ${period}` : `${period} ${band}`,
            repeat: ctx.isVertical ? "no-repeat round" : "round no-repeat",
        }));
        // The fill is a last background layer clipped to the content box, so it stays off the waves' padding.
        const layers = fill ? [...waves.map(w => ({ ...w, image, clip: "border-box" })), { image: `linear-gradient(${fill}, ${fill})`, position: "0 0", size: "auto", repeat: "no-repeat", clip: "content-box" }]
            : waves.map(w => ({ ...w, image, clip: "border-box" }));
        declarations.push(
            `background-image: ${layers.map(l => l.image).join(", ")} !important`,
            `background-position: ${layers.map(l => l.position).join(", ")} !important`,
            `background-size: ${layers.map(l => l.size).join(", ")} !important`,
            `background-repeat: ${layers.map(l => l.repeat).join(", ")} !important`,
            `background-clip: ${layers.map(l => l.clip).join(", ")} !important`,
            "background-color: transparent !important",
        );
        return declarations;
    }

    private underlineWidth(item: DecorationItem): string {
        const { thickness } = item.decoration.style as BuiltinDecorationStyle;
        return thickness === undefined ? `${lineThickness}em` : `${thickness}px`;
    }

    /** Sizes a patterned strikethrough's border or wave to its thinned box, whose default size varies per line. */
    private sizeStrikethroughPattern(item: DecorationItem, ctx: WritingContext, iz: number, el: HTMLElement, rect: Rect) {
        const { type, layout, lineStyle } = item.decoration.style as BuiltinDecorationStyle;
        if (type !== DecorationStyleType.Strikethrough || layout === DecorationLayout.Bounds) return;
        if (!lineStyle || lineStyle === DecorationLineStyle.Solid) return;
        const band = ctx.blockSize(rect) * iz;
        if (lineStyle === DecorationLineStyle.Wavy || DecorationGroup.drawsOwnDots(lineStyle)) {
            el.style.setProperty("background-size", ctx.isVertical ? `${band}px ${band * 2}px` : `${band * 2}px ${band}px`, "important");
            return;
        }
        el.style.setProperty(ctx.isVertical ? "border-left-width" : "border-top-width", `${band}px`, "important");
    }

    /** Outline stroke width and wave amplitude in CSS pixels, and inset needed for Page/Viewport widths in client-rect units. */
    private outlineMetrics(item: DecorationItem): { stroke: number; wave: number; inset: number } {
        const style = item.decoration.style as BuiltinDecorationStyle;
        if (style.type !== DecorationStyleType.Outline) return { stroke: 0, wave: 0, inset: 0 };
        const stroke = style.thickness ?? outlineStrokeWidth;
        const wave = style.lineStyle === DecorationLineStyle.Wavy ? stroke : 0;
        // For Page/Viewport widths the snap edge coincides with the viewport edge, so the outline would be clipped.
        // A wave adds twice its amplitude: once to the path offset, once for its crests.
        const inset = style.width === DecorationWidth.Page || style.width === DecorationWidth.Viewport ? (stroke + outlineOffset + wave * 2) * this.effectiveZoom() : 0;
        return { stroke, wave, inset };
    }

    /**
     * SVG path data outlining the overlay rects as one shape per run of adjacent lines,
     * `offset` outside them. Coordinates are in the shadow host's (document) space.
     */
    private outlinePath(item: DecorationItem, ctx: WritingContext, iz: number, rects: Rect[], bounds: Rect[], inlineInset: number, offset: number, wave: number): string {
        // Block coordinates are negated in vertical-rl so lines always progress towards larger values.
        const flip = ctx.isVertical && !ctx.isVertLR ? -1 : 1;
        const boxes = rects.map(rect => {
            const [inlineStart, blockStart, inlineSize, blockSize] = this.overlayBox(item, ctx, rect, bounds, inlineInset).map(v => v * iz);
            const inlineEnd = inlineStart + inlineSize;
            const blockEnd = blockStart + blockSize;
            return flip === 1
                ? { i0: inlineStart, i1: inlineEnd, b0: blockStart, b1: blockEnd }
                : { i0: inlineStart, i1: inlineEnd, b0: -blockEnd, b1: -blockStart };
        }).sort((r1, r2) => r1.b0 - r2.b0);

        // A line joins the previous one when it starts below it, less than a line away, and overlaps it inline.
        const runs: (typeof boxes)[] = [];
        for (const box of boxes) {
            const run = runs.find(run => {
                const last = run[run.length - 1];
                return box.b0 > last.b0
                    && box.b0 - last.b1 < Math.min(last.b1 - last.b0, box.b1 - box.b0)
                    && box.i0 < last.i1 && box.i1 > last.i0;
            });
            if (run) run.push(box);
            else runs.push([box]);
        }

        const toPoint = (i: number, b: number) => ctx.isVertical ? `${b * flip} ${i}` : `${i} ${b}`;
        return runs.map(run => {
            const n = run.length - 1;
            const mid = (k: number) => (run[k].b1 + run[k + 1].b0) / 2;
            // A step between two lines sits on the wider one's side, `offset` into the narrower one's band.
            const step = (k: number, wider: number) => mid(k) + Math.sign(wider) * offset;
            const points: [number, number][] = [[run[0].i1 + offset, run[0].b0 - offset]];
            for (let k = 0; k < n; k++) {
                const b = step(k, run[k].i1 - run[k + 1].i1);
                points.push([run[k].i1 + offset, b], [run[k + 1].i1 + offset, b]);
            }
            points.push([run[n].i1 + offset, run[n].b1 + offset], [run[n].i0 - offset, run[n].b1 + offset]);
            for (let k = n - 1; k >= 0; k--) {
                const b = step(k, run[k + 1].i0 - run[k].i0);
                points.push([run[k + 1].i0 - offset, b], [run[k].i0 - offset, b]);
            }
            points.push([run[0].i0 - offset, run[0].b0 - offset]);
            return wave
                ? DecorationGroup.wavyPolygon(points, wave, toPoint)
                : `M${points.map(([i, b]) => toPoint(i, b)).join(" L")} Z`;
        }).join(" ");
    }

    /** Closed path through `points` (inline, block) as a wave with a node on every corner, so edges always join cleanly. */
    private static wavyPolygon(points: [number, number][], wave: number, toPoint: (i: number, b: number) => string): string {
        const halfWave = wave * 3;
        let d = `M${toPoint(...points[0])}`;
        points.forEach(([i0, b0], k) => {
            const [i1, b1] = points[(k + 1) % points.length];
            const length = Math.hypot(i1 - i0, b1 - b0);
            // Edges shorter than a half-wave, such as small steps between lines, stay straight.
            if (length < halfWave) {
                d += ` L${toPoint(i1, b1)}`;
                return;
            }
            const count = Math.round(length / halfWave);
            const [di, db] = [(i1 - i0) / count, (b1 - b0) / count];
            // A quadratic control point twice the amplitude off the edge puts the crest `wave` away from it.
            const [ni, nb] = [-(b1 - b0) / length * wave * 2, (i1 - i0) / length * wave * 2];
            for (let j = 0; j < count; j++) {
                const sign = j % 2 ? -1 : 1;
                d += ` Q${toPoint(i0 + di * (j + 0.5) + ni * sign, b0 + db * (j + 0.5) + nb * sign)} ${toPoint(i0 + di * (j + 1), b0 + db * (j + 1))}`;
            }
        });
        return `${d} Z`;
    }

    /**
     * Computes the ordered list of rects an overlay item's elements should occupy
     * (one rect for Bounds layout, one per merged client rect for Boxes layout).
     * Shared between the full build path (layout) and the cheap reposition path.
     */
    private computeOverlayRects(item: DecorationItem, ctx: WritingContext, bounds: Rect[], expand: number): Rect[] {
        if (item.decoration?.style?.layout === DecorationLayout.Bounds) {
            return bounds.map(boundsRect => expand ? {
                left:   boundsRect.left   - expand,
                right:  boundsRect.right  + expand,
                top:    boundsRect.top    - expand,
                bottom: boundsRect.bottom + expand,
                width:  boundsRect.width  + expand * 2,
                height: boundsRect.height + expand * 2,
            } : boundsRect);
        }

        // Fall back to "boxes" value for layout.
        const decoStyle = item.decoration.style;
        const decoType = (decoStyle as BuiltinDecorationStyle).type;
        const isLineDecoration = decoType === DecorationStyleType.Underline
            || decoType === DecorationStyleType.Strikethrough;
        const isStrikethrough = decoType === DecorationStyleType.Strikethrough;
        const strikeWidth = isStrikethrough ? (decoStyle as BuiltinDecorationStyle).thickness : undefined;
        const isWavyStrike = isStrikethrough && (decoStyle as BuiltinDecorationStyle).lineStyle === DecorationLineStyle.Wavy;
        // Styles drawing lines or strokes use text-node rects plus images and the like, so Ruby (rt/rp) doesn't
        // get its own segment above the base text; a range without text keeps its own boxes.
        let rectSource: Range | Rect[] | undefined;
        let replacedRects: Rect[] = [];
        if (isLineDecoration || decoType === DecorationStyleType.Outline || decoType === DecorationStyleType.HighlightUnderline) {
            const textRects = getTextClientRects(item.range, ["rt", "rp"]);
            if (textRects.length) {
                replacedRects = DecorationGroup.replacedContentRects(item.range);
                rectSource = isLineDecoration ? textRects : [...textRects, ...replacedRects];
            }
        }
        rectSource ??= DecorationGroup.rangeBoxes(item.range);
        // Line decorations are expanded after thinning below, so expand isn't merged in here.
        // Like CSS text decorations, their lines keep the base text's position; raised runs and images only lengthen them.
        let clientRects = DecorationGroup.mergeLineRects(getClientRectsNoOverlap(
            rectSource,
            true,              // doNotMergeHorizontallyAlignedRects
            ctx.isVertical,    // doNotMergeVerticallyAlignedRects
            isLineDecoration ? 0 : expand
        ), ctx, isLineDecoration ? replacedRects : undefined);

        clientRects = clientRects.sort((r1, r2) => {
            if (ctx.isVertical) {
                // vertical-rl: rightmost column first; vertical-lr: leftmost first
                const factor = ctx.isVertLR ? 1 : -1;
                return factor * (r1.left - r2.left);
            }
            return r1.top - r2.top;
        });

        return clientRects.map(clientRect => {
            let posRect: Rect = clientRect;
            if (isStrikethrough) {
                // Thin the rect to the line width (~10% of block size by default), centred on the mid-line.
                const lineWidth = strikeWidth !== undefined ? strikeWidth * this.effectiveZoom() : ctx.blockSize(clientRect) * 0.1;
                // A wave tile is three line widths across.
                const thickness = isWavyStrike ? lineWidth * 3 : lineWidth;
                const blockMid  = ctx.blockStart(clientRect) + ctx.blockSize(clientRect) / 2;
                const bs = blockMid - thickness / 2;
                posRect = ctx.isVertical
                    ? { left: bs, right: bs + thickness, top: clientRect.top,    bottom: clientRect.bottom, width: thickness,           height: clientRect.height }
                    : { top:  bs, bottom: bs + thickness, left: clientRect.left, right: clientRect.right,   height: thickness,           width: clientRect.width  };
            }
            if (expand && isLineDecoration) {
                // A strikethrough stays centred, so only its inline extent grows; an underline moves away from the text.
                const ie = expand;
                const be = isStrikethrough ? 0 : expand;
                const [dx, dy] = ctx.isVertical ? [be, ie] : [ie, be];
                posRect = { left: posRect.left - dx, right: posRect.right + dx, top: posRect.top - dy, bottom: posRect.bottom + dy, width: posRect.width + dx * 2, height: posRect.height + dy * 2 };
            }
            return posRect;
        });
    }

    /**
     * Cheaply repositions an already-rendered overlay item's existing elements in place,
     * without destroying and rebuilding them. Returns false if the element count no
     * longer matches the current geometry (a genuine reflow happened), signalling the
     * caller to fall back to a full layout().
     */
    private repositionItem(item: DecorationItem, ctx: WritingContext): boolean {
        if (!item.container) return true;
        const decoStyle = item.decoration.style;
        if (decoStyle.type !== DecorationStyleType.Template) {
            const type = (decoStyle as BuiltinDecorationStyle).type ?? DecorationStyleType.Highlight;
            if (type === DecorationStyleType.TextColor || type === DecorationStyleType.Mask) return true;
        }

        const iz = 1 / this.effectiveZoom();
        const expand = this.scaledExpand(decoStyle);
        const bounds = DecorationGroup.drawnBounds(item);
        const outline = this.outlineMetrics(item);
        const outlineInset = outline.inset;

        const rects = this.computeOverlayRects(item, ctx, bounds, expand);
        if (DecorationGroup.isShapeOutline(decoStyle)) {
            item.container.querySelector("path")?.setAttribute("d", this.outlinePath(item, ctx, iz, rects, bounds, outlineInset, outlineOffset + outline.stroke / 2 + outline.wave, outline.wave));
            return true;
        }
        const children = Array.from(item.container.children) as HTMLElement[];
        if (children.length !== rects.length) return false;

        children.forEach((el, i) => {
            this.positionElement(item, ctx, iz, el, rects[i], bounds, outlineInset);
            this.sizeStrikethroughPattern(item, ctx, iz, el, rects[i]);
        });
        return true;
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

        const ctx = this.overlayContext();

        const iz = 1 / this.effectiveZoom();

        const expand = this.scaledExpand(item.decoration.style);
        const bounds = DecorationGroup.drawnBounds(item);

        const decoStyle = item.decoration.style;
        const outline = this.outlineMetrics(item);
        const outlineInset = outline.inset;
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

            // Mask: dim overlay covering the full document with SVG mask holes.
            if (type === DecorationStyleType.Mask) {
                // Mask decorations use a shared overlay, updated once per frame.
                item.container = itemContainer;
                item.clickableElements = [];
                this.scheduleMaskUpdate();
                return;
            }

            const isDarkMode = this.getCurrentDarkMode();
            const backgroundColor = this.getBackgroundColor();
            const applyContrast = style.enforceContrast !== false;
            const lineStyle = style.lineStyle ?? DecorationLineStyle.Solid;

            if (DecorationGroup.isShapeOutline(style)) {
                const svgNS = "http://www.w3.org/2000/svg";
                const svg = this.wnd.document.createElementNS(svgNS, "svg");
                svg.dataset.readium = "true";
                // WebKit doesn't paint an SVG's overflow in vertical-rl, so the SVG keeps a horizontal writing mode.
                svg.style.cssText = `position:absolute;top:0;left:0;width:1px;height:1px;overflow:visible;writing-mode:horizontal-tb;pointer-events:none;z-index:${OVERLAY_Z_INDEX}`;
                const path = this.wnd.document.createElementNS(svgNS, "path");
                path.setAttribute("fill", "none");
                path.setAttribute("stroke", applyContrast ? adjustColorForContrast(tint, backgroundColor) : tint);
                path.setAttribute("stroke-width", String(outline.stroke));
                if (lineStyle === DecorationLineStyle.Dashed) path.setAttribute("stroke-dasharray", `${outline.stroke * 3} ${outline.stroke * 2}`);
                if (lineStyle === DecorationLineStyle.Dotted) {
                    // Zero-length dashes with round caps draw round dots, like dotted borders.
                    path.setAttribute("stroke-dasharray", `0 ${outline.stroke * 2}`);
                    path.setAttribute("stroke-linecap", "round");
                }
                // SVG centres the stroke on the path, so half of it, plus any wave amplitude, is added to the outline offset.
                path.setAttribute("d", this.outlinePath(item, ctx, iz, this.computeOverlayRects(item, ctx, bounds, expand), bounds, outlineInset, outlineOffset + outline.stroke / 2 + outline.wave, outline.wave));
                svg.append(path);
                itemContainer.append(svg);
                item.container = itemContainer;
                item.clickableElements = [];
                return;
            }

            const styleAttr = (() => {
                switch (type) {
                    case DecorationStyleType.Underline: {
                        const adjustedUnderlineTint = applyContrast ? adjustColorForContrast(tint, backgroundColor) : tint;
                        const isBounds = style.layout === DecorationLayout.Bounds;
                        return this.underlineDeclarations(item, ctx, adjustedUnderlineTint, lineStyle, isBounds).join("; ");
                    }
                    case DecorationStyleType.Strikethrough: {
                        const adjustedStrikeTint = applyContrast ? adjustColorForContrast(tint, backgroundColor) : tint;
                        const isBounds = style.layout === DecorationLayout.Bounds;
                        if (isBounds) {
                            // Bounds covers the full height of the selection — use diagonal hatch lines
                            // so the text remains readable (physical "crossing out" appearance).
                            const hatchWidth = style.thickness ?? 1;
                            // A mask striped across the hatch lines cuts them into dashes or dots.
                            const [dash, period] = lineStyle === DecorationLineStyle.Dashed ? [hatchWidth * 3, hatchWidth * 5]
                                : lineStyle === DecorationLineStyle.Dotted ? [hatchWidth, hatchWidth * 2]
                                : [];
                            const mask = dash ? `repeating-linear-gradient(45deg, black 0 ${dash}px, transparent ${dash}px ${period}px)` : null;
                            return [
                                `background: repeating-linear-gradient(-45deg, transparent, transparent 19px, ${adjustedStrikeTint} 19px, ${adjustedStrikeTint} ${19 + hatchWidth}px) !important`,
                                "background-color: transparent !important",
                                mask ? `-webkit-mask-image: ${mask} !important` : null,
                                mask ? `mask-image: ${mask} !important` : null,
                                "box-sizing: border-box !important",
                            ].filter(Boolean).join("; ");
                        }
                        // Boxes path: the rect is thinned and centred by the boxes loop below.
                        if (lineStyle === DecorationLineStyle.Wavy || DecorationGroup.drawsOwnDots(lineStyle)) {
                            const image = lineStyle === DecorationLineStyle.Wavy ? DecorationGroup.waveImage(adjustedStrikeTint, ctx.isVertical) : DecorationGroup.dotImage(adjustedStrikeTint, ctx.isVertical);
                            return [
                                `background-image: ${image} !important`,
                                `background-repeat: ${ctx.isVertical ? "no-repeat round" : "round no-repeat"} !important`,
                                "background-color: transparent !important",
                                "box-sizing: border-box !important",
                            ].join("; ");
                        }
                        if (lineStyle !== DecorationLineStyle.Solid) {
                            return [
                                `${ctx.isVertical ? "border-left" : "border-top"}: 0 ${lineStyle} ${adjustedStrikeTint} !important`,
                                "background-color: transparent !important",
                                "box-sizing: border-box !important",
                            ].join("; ");
                        }
                        return [
                            `background-color: ${adjustedStrikeTint} !important`,
                            "box-sizing: border-box !important",
                        ].join("; ");
                    }
                    case DecorationStyleType.Outline:
                        const adjustedOutlineTint = applyContrast ? adjustColorForContrast(tint, backgroundColor) : tint;
                        return [
                            `outline: ${outline.stroke}px ${lineStyle} ${adjustedOutlineTint} !important`,
                            `outline-offset: ${outlineOffset}px !important`,
                            "background-color: transparent !important",
                            "box-sizing: border-box !important",
                        ].join("; ");
                    case DecorationStyleType.HighlightUnderline: {
                        const adjustedHUTint = applyContrast ? adjustColorForContrast(tint, backgroundColor) : tint;
                        const { r, g, b } = colorToRgba(adjustedHUTint);
                        const huFillTint = `rgba(${r}, ${g}, ${b}, 0.3)`;
                        const isBounds = style.layout === DecorationLayout.Bounds;
                        return this.underlineDeclarations(item, ctx, adjustedHUTint, lineStyle, isBounds, huFillTint).join("; ");
                    }
                    case DecorationStyleType.Highlight:
                    default: {
                        const adjustedHighlightTint = applyContrast ? adjustColorForContrast(tint, backgroundColor) : tint;
                        return [
                            `background-color: ${adjustedHighlightTint} !important`,
                            `mix-blend-mode: ${isDarkMode ? "exclusion" : "multiply"} !important`,
                            "opacity: 1 !important",
                            "box-sizing: border-box !important",
                            // Works around an iPadOS Safari bug where mix-blend-mode paints opaque instead of blending.
                            "transform: translateZ(0) !important",
                        ].join("; ");
                    }
                }
            })();

            const template = this.wnd.document.createElement("template");
            template.innerHTML = `<div data-readium="true" class="readium-${type}" style="${styleAttr}"></div>`.trim();
            elementTemplate = template.content.firstElementChild!;
        }

        const rects = this.computeOverlayRects(item, ctx, bounds, expand);
        for (const posRect of rects) {
            const el = elementTemplate.cloneNode(true) as HTMLDivElement;
            el.style.setProperty("pointer-events", "none");
            this.positionElement(item, ctx, iz, el, posRect, bounds, outlineInset);
            this.sizeStrikethroughPattern(item, ctx, iz, el, posRect);
            itemContainer.append(el);
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
    private readonly pendingRender = new Set<DecorationItem>();
    private renderLayout(items: DecorationItem[]) {
        items.forEach(i => this.pendingRender.add(i));
        this.wnd.cancelAnimationFrame(this.currentRender);
        this.currentRender = this.wnd.requestAnimationFrame(() => {
            // Items removed or cleared since they were queued aren't rendered.
            items = Array.from(this.pendingRender).filter(i => this.items.includes(i) && (!this.experimentalHighlights || !!this.notTextFlag?.has(i.id)));
            this.pendingRender.clear();
            if(items.length === 0) return;
            const groupContainer = this.requireContainer() as HTMLDivElement;
            groupContainer.append(...items.map(i => i.container).filter(c => !!c) as Node[])
        });
    }

    /** The shared shadow host overlays are drawn in, created on first use. */
    private requireShadowHost(): HTMLDivElement {
        if (!this.shadowHost || !this.shadowRoot) {
            this.shadowHost = this.wnd.document.createElement("div");
            this.shadowHost.style.cssText = "position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none";
            this.wnd.document.body.appendChild(this.shadowHost);
            this.shadowRoot = this.shadowHost.attachShadow({ mode: "open" });
        }
        return this.shadowHost;
    }

    /** Context for drawing overlays, whose offsets are measured from the shadow host wherever the page positions it. */
    private overlayContext(): WritingContext {
        return makeWritingContext(this.wnd, this.requireShadowHost());
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
            this.requireShadowHost();

            // Create container in shared shadow root
            this.container = this.wnd.document.createElement("div");
            this.container.setAttribute("id", this.id);
            this.container.dataset.group = this.name;
            this.container.dataset.readium = "true";
            this.container.style.setProperty("pointer-events", "none");
            this.container.style.display = "contents";
            this.shadowRoot!.appendChild(this.container);
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

    private maskFrame = 0;
    // Removing and adding masks in the same frame then goes straight from the old mask to the new one.
    private scheduleMaskUpdate() {
        if (this.maskFrame) return;
        this.maskFrame = this.wnd.requestAnimationFrame(() => {
            this.maskFrame = 0;
            this.updateSharedMask();
        });
    }

    private removeShadowHost() {
        this.shadowHost?.remove();
        this.shadowHost = undefined;
        this.shadowRoot = undefined;
    }

    // Unset, the background is computed as fully transparent (e.g. rgba(0, 0, 0, 0)), which would leave a mask invisible.
    private opaqueBackgroundColor(): string | undefined {
        const color = this.getBackgroundColor().trim();
        const transparent = /^rgba\(.*,\s*(0|0?\.0+)\s*\)$|\/\s*(0|0?\.0+)\s*\)$/;
        return !color || color === "transparent" || transparent.test(color) ? undefined : color;
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
            // Only tear down the shared shadow host if no other decorations use it
            if (!this.container) this.removeShadowHost();
            return;
        }

        // Measured without the mask, which would otherwise keep the document as large as when last drawn.
        if (this.maskSvg) this.maskSvg.style.display = "none";

        const ctx = this.overlayContext();

        const iz = 1 / this.effectiveZoom();

        // Collect all hole rects from mask decorations
        const docEl = this.wnd.document.documentElement;
        const docW = docEl.scrollWidth * iz;
        const docH = docEl.scrollHeight * iz;
        // The document's top-left corner in overlay coordinates; it extends left of the viewport when scrolling towards negative scrollLeft.
        const se = this.wnd.document.scrollingElement!;
        const startsRight = ctx.isVertical ? !ctx.isVertLR : hasRTLDirection(this.wnd, docEl);
        const docX = ((startsRight ? se.clientWidth - se.scrollWidth : 0) - se.scrollLeft + ctx.xDocOffset) * iz;
        const docY = (-se.scrollTop + ctx.yDocOffset) * iz;
        const allHoleRects: DOMRect[] = [];
        for (const item of maskItems) {
            const style  = item.decoration.style as BuiltinDecorationStyle;
            const layout = style.layout ?? DecorationLayout.Boxes;
            const width  = style.width  ?? DecorationWidth.Wrap;
            const ex     = this.scaledExpand(style);

            const bounds = DecorationGroup.drawnBounds(item);

            // For Bounds layout the hole is a bounding rect per fragment; expand it directly.
            // For Boxes layout, merge rects first with expand baked in (same as highlights).
            const baseRects: Rect[] = layout === DecorationLayout.Bounds
                ? bounds.map(b => ex ? { left: b.left - ex, top: b.top - ex, right: b.right + ex, bottom: b.bottom + ex, width: b.width + ex * 2, height: b.height + ex * 2 } : b)
                : getClientRectsNoOverlap(DecorationGroup.rangeBoxes(item.range), false, false, ex);

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
                        const fragment = bounds[DecorationGroup.fragmentIndex(bounds, rect, ctx)];
                        hole = ctx.toRect(ctx.inlineStart(fragment), ctx.blockStart(rect), ctx.inlineSize(fragment), ctx.blockSize(rect));
                        break;
                    }
                    default:
                        hole = ctx.toRect(ctx.inlineStart(rect), ctx.blockStart(rect), ctx.inlineSize(rect), ctx.blockSize(rect));
                }
                allHoleRects.push(hole);
            }
        }

        // Build SVG path with all holes (physical coords — always left/top regardless of writing mode)
        // Consecutive lines can belong to different decorations, e.g. the pieces of one utterance.
        const pathData = this.closeInterlines(ctx, allHoleRects).map(r => {
            const l  = (r.left   + ctx.xDocOffset) * iz;
            const t  = (r.top    + ctx.yDocOffset) * iz;
            const ri = (r.right  + ctx.xDocOffset) * iz;
            const b  = (r.bottom + ctx.yDocOffset) * iz;
            return `M${l} ${t} H${ri} V${b} H${l} Z`;
        }).join(" ");

        const svgNS = "http://www.w3.org/2000/svg";

        // Create or update SVG
        if (!this.maskSvg) {
            this.requireShadowHost();

            // Create SVG in shared shadow root
            this.maskSvg = this.wnd.document.createElementNS(svgNS, "svg") as SVGSVGElement;
            this.maskSvg.style.cssText = `position:absolute;top:0;left:0;width:${docW}px;height:${docH}px;pointer-events:none;z-index:${OVERLAY_Z_INDEX - 1}`;
            this.maskSvg.dataset.readium = "true";
            const defs = this.wnd.document.createElementNS(svgNS, "defs");
            // Holes are painted black on white, so overlapping holes stay holes.
            const mask = this.wnd.document.createElementNS(svgNS, "mask") as SVGMaskElement;
            const maskId = `${this.id}-mask-holes`;
            mask.setAttribute("id", maskId);
            mask.setAttribute("maskUnits", "userSpaceOnUse");
            const visible = this.wnd.document.createElementNS(svgNS, "rect") as SVGRectElement;
            visible.setAttribute("fill", "white");
            const svgPath = this.wnd.document.createElementNS(svgNS, "path") as SVGPathElement;
            svgPath.setAttribute("fill", "black");
            mask.append(visible, svgPath);
            defs.appendChild(mask);
            this.maskSvg.appendChild(defs);

            // Add SVG rect for the overlay (bypasses ReadiumCSS)
            const maskRect = this.wnd.document.createElementNS(svgNS, "rect") as SVGRectElement;
            maskRect.setAttribute("id", `${this.id}-mask-rect`);
            maskRect.setAttribute("mask", `url(#${maskId})`);
            maskRect.style.pointerEvents = "none";
            this.maskSvg.appendChild(maskRect);
            
            this.shadowRoot!.appendChild(this.maskSvg);
        }

        // Update SVG dimensions to cover full document
        this.maskSvg.style.display = "";
        this.maskSvg.style.left = `${docX}px`;
        this.maskSvg.style.top = `${docY}px`;
        this.maskSvg.style.width = `${docW}px`;
        this.maskSvg.style.height = `${docH}px`;
        this.maskSvg.setAttribute("viewBox", `${docX} ${docY} ${docW} ${docH}`);

        // A userSpaceOnUse mask clips to its own region, which doesn't follow the viewBox.
        const maskElement = this.maskSvg.querySelector("mask");
        maskElement?.setAttribute("x", String(docX));
        maskElement?.setAttribute("y", String(docY));
        maskElement?.setAttribute("width", String(docW));
        maskElement?.setAttribute("height", String(docH));

        const visible = this.maskSvg.querySelector("mask > rect");
        visible?.setAttribute("x", String(docX));
        visible?.setAttribute("y", String(docY));
        visible?.setAttribute("width", String(docW));
        visible?.setAttribute("height", String(docH));

        // Update the path data
        const svgPath = this.maskSvg.querySelector("mask > path") as SVGPathElement;
        if (svgPath) {
            svgPath.setAttribute("d", pathData);
        }

        // Update the mask rect
        const maskRect = this.maskSvg.querySelector(":scope > rect") as SVGRectElement;
        if (maskRect) {
            const firstMaskStyle = maskItems[0].decoration.style as BuiltinDecorationStyle;
            const userTint = firstMaskStyle.tint;
            // Tints carry their own alpha; the background is opaque, so it's applied at half opacity.
            const background  = userTint ? undefined : this.opaqueBackgroundColor();
            const fillColor   = userTint ?? background ?? defaultTint(DecorationStyleType.Mask);
            const fillOpacity = background ? "0.5" : "1";
            maskRect.setAttribute("x", String(docX));
            maskRect.setAttribute("y", String(docY));
            maskRect.setAttribute("width", String(docW));
            maskRect.setAttribute("height", String(docH));
            maskRect.setAttribute("fill", fillColor);
            maskRect.setAttribute("fill-opacity", fillOpacity);
        }
    }

    /** Stretches the holes of adjacent lines to meet halfway, so the space between them isn't dimmed. */
    private closeInterlines(ctx: WritingContext, holes: DOMRect[]): DOMRect[] {
        const boxes = holes.map(hole => ({
            i0: ctx.inlineStart(hole), i1: ctx.inlineStart(hole) + ctx.inlineSize(hole),
            b0: ctx.blockStart(hole), b1: ctx.blockStart(hole) + ctx.blockSize(hole),
        })).sort((r1, r2) => r1.b0 - r2.b0);
        const ends = boxes.map(box => box.b1);
        const starts = boxes.map(box => box.b0);
        boxes.forEach((box, i) => {
            // Fragments overlapping it inline and starting less than a line after it, nearest first.
            const after = boxes.flatMap((other, j) => other.b0 >= box.b1 && other.i0 < box.i1 && other.i1 > box.i0
                && other.b0 - box.b1 < Math.min(box.b1 - box.b0, other.b1 - other.b0) ? [j] : []);
            if (after.length === 0) return;
            const nearest = boxes[after[0]];
            const mid = (box.b1 + nearest.b0) / 2;
            ends[i] = mid;
            // The next line is made of the fragments starting before the nearest one ends.
            for (const j of after) if (boxes[j].b0 < nearest.b1) starts[j] = Math.min(starts[j], mid);
        });
        return boxes.map((box, i) => ctx.toRect(box.i0, starts[i], box.i1 - box.i0, ends[i] - starts[i]));
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
    private observedResizeTargets = new Map<string, Element>();
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
        this.observedResizeTargets.clear();
    }

    private updateHighlightStyles() {
        this.groups.forEach(group => {
            group.requestLayout();
        });
    }

    private handleResize() {
        this.wnd.clearTimeout(this.resizeFrame);
        this.resizeFrame = this.wnd.setTimeout(() => {
            this.groups.forEach(g => g.requestLayout());
        }, 50);
    }
    private readonly handleResizer = this.handleResize.bind(this);

    private scrollScheduled = false;
    private handleScroll() {
        // rAF-throttled, not debounced: overlays must track every frame, not just settle after scroll stops.
        if (this.scrollScheduled) return;
        this.scrollScheduled = true;
        this.wnd.requestAnimationFrame(() => {
            this.scrollScheduled = false;
            this.groups.forEach(g => {
                if(g.hasOverlayItems) g.repositionOverlays();
            });
        });
    }
    private readonly handleScroller = this.handleScroll.bind(this);

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

        comms.register("decoration_resize", Decorator.moduleName, (data, ack) => {
            const req = data as DecorationResizeRequest;
            if (req.action === "watch") this.addDecorationResizeTarget(req.selector);
            else this.removeDecorationResizeTarget(req.selector);
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
        // Capture phase: scroll events don't bubble, so a scrollable descendant
        // (e.g. an app shell's own reading-pane container) would never reach a
        // bubble-phase listener on wnd.
        wnd.addEventListener("scroll", this.handleScroller, { passive: true, capture: true });

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
        wnd.removeEventListener("scroll", this.handleScroller, { capture: true });

        comms.unregisterAll(Decorator.moduleName);
        this.resizeObserver.disconnect();
        this.styleObserver.disconnect();
        this.cleanup();

        comms.log("Decorator Unmounted");
        return true;
    }

    private addDecorationResizeTarget(selector: string): void {
        const existing = this.observedResizeTargets.get(selector);
        if (existing) this.resizeObserver.unobserve(existing);

        const el = this.wnd.document.querySelector(selector);
        if (el) {
            this.resizeObserver.observe(el);
            this.observedResizeTargets.set(selector, el);
        } else {
            this.observedResizeTargets.delete(selector);
        }
    }

    private removeDecorationResizeTarget(selector: string): void {
        const el = this.observedResizeTargets.get(selector);
        if (el) {
            this.resizeObserver.unobserve(el);
            this.observedResizeTargets.delete(selector);
        }
    }
}
