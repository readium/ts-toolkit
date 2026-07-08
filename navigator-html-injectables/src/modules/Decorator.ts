import { Locator } from "@readium/shared";
import { Comms } from "../comms/comms.ts";
import { Module } from "./Module.ts";
import { rangeFromLocator } from "../helpers/locator.ts";
import { ModuleName } from "./ModuleLibrary.ts";
import { Rect, getClientRectsNoOverlap, rectContainsPoint } from "../helpers/rect.ts";
import { getProperty } from "../helpers/css.ts";
import { ReadiumWindow } from "../helpers/dom.ts";
import { isDarkColor, getContrastingTextColor, adjustColorForContrast } from "../helpers/color.ts";
import { makeWritingContext } from "../helpers/document.ts";
import { sML } from "../helpers/sML.ts";
import { sanitizeHTML } from "../helpers/sanitize.ts";

function defaultTint(type: DecorationStyleType): string {
    switch (type) {
        case DecorationStyleType.Mask:
            return "rgba(255, 255, 255, 0.5)";
        case DecorationStyleType.Highlight:
            return "#FFFF00";
        default:
            return "#FF0000";
    }
}

export const DecorationStyleType = {
    Highlight: "highlight", // Background color overlay.
    Underline: "underline", // Underline drawn beneath the text.
    Outline:   "outline",   // Border drawn around the text boxes.
    TextColor: "textColor", // Changes the text color directly.
    Mask:      "mask",      // Dims everything outside the selection rects. Use width: Page for block-level behaviour.
    Template:  "template",  // Custom HTML template (HTMLDecorationTemplate).
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
    isActive?: boolean;
    enforceContrast?: boolean; // When true (default), tint is adjusted for contrast against the background.
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
    isActive?: boolean;
}

export type DecorationStyle = BuiltinDecorationStyle | HTMLDecorationTemplate;

export interface Decoration {
    id: string; // Unique ID of the decoration. It must be unique in the group the decoration is applied to.
    locator: Locator; // Location in the publication where the decoration will be rendered.
    style: DecorationStyle; // Declares the look and feel of the decoration.
    extras?: Record<string, unknown>; // App-specific context data passed through to DecorationActivationEvent.
}

export interface DecorationActivatedEvent {
    decorationId: string;
    group: string; // Human-readable group name (matches DecoratorRequest.group).
    rect: { top: number; left: number; width: number; height: number }; // Bounding rect in iframe client coords.
    point: { x: number; y: number }; // Click point in iframe client coords.
}

export type DecoratorRequest =
    | { group: string; action: "add" | "update"; decoration: Decoration }
    | { group: string; action: "remove"; decoration: Pick<Decoration, "id"> }
    | { group: string; action: "clear" };

interface DecorationItem {
    id: string;
    decoration: Decoration;
    range: Range;

    clickableElements: HTMLElement[] | undefined;
    container: HTMLElement | undefined;
}

const canNativeHighlight = () => ("Highlight" in window);
const cannotNativeHighlight = ["IMG", "IMAGE", "AUDIO", "VIDEO", "SVG"];

class DecorationGroup {
    public readonly items: DecorationItem[] = [];
    private lastItemId = 0;
    private container: HTMLDivElement | undefined = undefined;
    private _activatable = false;
    public readonly experimentalHighlights: boolean = false;
    private readonly notTextFlag: Map<string, boolean> | undefined;
    private readonly activationHandler: (e: PointerEvent) => void;
    private maskSvg: SVGSVGElement | undefined = undefined;
    private shadowHost: HTMLDivElement | undefined = undefined;
    private shadowRoot: ShadowRoot | undefined = undefined;

    /**
     * Creates a DecorationGroup object
     * @param id Unique HTML ID-adhering name of the group
     * @param name Human-readable name of the group
     */
    constructor(
        private readonly wnd: ReadiumWindow,
        private readonly comms: Comms,
        private readonly id: string,
        private readonly name: string
    ) {
        if (canNativeHighlight()) {
            this.experimentalHighlights = true;
            this.notTextFlag = new Map<string, boolean>();
        }
        this.activationHandler = this.handleActivation.bind(this);
        this.wnd.document.addEventListener("pointerup", this.activationHandler);
    }

    get activatable() {
        return this._activatable;
    }

    set activatable(value: boolean) {
        this._activatable = value;
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
        if (this.experimentalHighlights) {
            const { type } = decoration.style;
            const { layout, width } = decoration.style as BuiltinDecorationStyle;
            // CSS Highlight API only handles text-level highlight styling (boxes + wrap).
            // Everything else must go through the DOM overlay path.
            const needsDomOverlay =
                type !== DecorationStyleType.TextColor && (
                    type === DecorationStyleType.Outline ||
                    type === DecorationStyleType.Template ||
                    type === DecorationStyleType.Mask ||
                    (layout !== undefined && layout !== DecorationLayout.Boxes) ||
                    (width  !== undefined && width  !== DecorationWidth.Wrap)
                );
            if (needsDomOverlay) this.notTextFlag?.set(id, true);
        }

        const item = {
            decoration,
            id,
            range,
        } as DecorationItem;

        this.items.push(item);
        this.layout(item);
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
        if (this.experimentalHighlights && !this.notTextFlag?.has(item.id)) {
            // Remove highlight from ranges
            const mm = ((this.wnd as any).CSS.highlights as Map<string, unknown>).get(this.id) as Set<Range>;
            mm?.delete(item.range);
        }
        this.notTextFlag?.delete(item.id);
        
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
    }

    private handleActivation(e: PointerEvent) {
        if (!this._activatable) return;
        const cssX = e.clientX;
        const cssY = e.clientY;
        const pixelRatio = this.wnd.devicePixelRatio;

        for (const item of this.items) {
            if (!item.decoration.style?.isActive) continue;

            let hitRect: DOMRect | undefined;

            if (item.decoration.style.type === DecorationStyleType.Template) {
                // Templates can be positioned anywhere (e.g. a margin sidemark), so hit-test
                // against the rendered elements rather than the text range rects.
                for (const el of (item.clickableElements ?? [])) {
                    const r = el.getBoundingClientRect();
                    if (rectContainsPoint(r as Rect, cssX, cssY, 0)) {
                        hitRect = r;
                        break;
                    }
                }
            } else {
                // Built-in styles sit over the text. Range.getClientRects() works for both
                // rendering paths: the CSS Highlight API has no DOM overlay to target, and the
                // DOM overlay divs have pointer-events: none, so neither intercepts the event.
                const rects = item.range.getClientRects();
                for (const rect of rects) {
                    if (rectContainsPoint(rect as Rect, cssX, cssY, 0)) {
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
                    point: { x: cssX * pixelRatio, y: cssY * pixelRatio },
                } as DecorationActivatedEvent);
                return;
            }
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
                this.items.forEach(i => this.layout(i));
                this.renderLayout(this.items);
                // Update shared mask after layout
                this.updateSharedMask();
            });
        });
    }

    private experimentalLayout(item: DecorationItem) {
        const [stylesheet, highlighter]: [HTMLStyleElement, any] = this.requireContainer(true) as [HTMLStyleElement, unknown];

        // Template items are always routed to the DOM overlay; only BuiltinDecorationStyle reaches here.
        const style = item.decoration.style as BuiltinDecorationStyle;
        const type = style.type ?? DecorationStyleType.Highlight;
        const tint = style.tint ?? defaultTint(type);
        const width = style.width;
        const layout = style.layout;

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
                highlighter.add(item.range);
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
                    highlighter.add(expandedRange);
                    item.range = expandedRange;
                } else {
                    highlighter.add(item.range);
                }
            }
        } else {
            highlighter.add(item.range);
        }

        // TODO add caching layer ("vdom") to this so we aren't completely replacing the CSS every time
        const backgroundColor = this.getBackgroundColor();
        const applyContrast = style.enforceContrast !== false;
        let css: string;
        switch (type) {
            case DecorationStyleType.Underline:
                const adjustedUnderlineTint = applyContrast ? adjustColorForContrast(tint, backgroundColor) : tint;
                css = `::highlight(${this.id}) {
                    text-decoration: underline;
                    text-decoration-color: ${adjustedUnderlineTint};
                    text-decoration-thickness: 0.1em;
                }`;
                break;
            case DecorationStyleType.Outline:
                const adjustedOutlineTint = applyContrast ? adjustColorForContrast(tint, backgroundColor) : tint;
                css = `::highlight(${this.id}) {
                    outline: 2px solid ${adjustedOutlineTint};
                    outline-offset: 1px;
                }`;
                break;
            case DecorationStyleType.TextColor: {
                const adjustedTextTint = applyContrast ? adjustColorForContrast(tint, backgroundColor) : tint;
                css = `::highlight(${this.id}) {
                    color: ${adjustedTextTint};
                }`;
                break;
            }
            case DecorationStyleType.Highlight:
            default: {
                const adjustedHighlightTint = applyContrast ? adjustColorForContrast(tint, backgroundColor) : tint;
                css = `::highlight(${this.id}) {
                    color: ${getContrastingTextColor(adjustedHighlightTint, backgroundColor)};
                    background-color: ${adjustedHighlightTint};
                }`;
            }
        }
        stylesheet.innerHTML = css;
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

        let iz = 1;
        if (sML.UA.Blink) {
            const rootZoom = parseFloat(this.wnd.getComputedStyle(this.wnd.document.documentElement).zoom);
            const bodyZoom = parseFloat(this.wnd.getComputedStyle(this.wnd.document.body).zoom);
            const effectiveZoom = (rootZoom || 1) * (bodyZoom || 1);
            if (effectiveZoom) iz = 1 / effectiveZoom;
        }

        const positionElement = (element: HTMLElement, rect: Rect, boundingRect: DOMRect, inlineInset = 0) => {
            const w = item.decoration?.style?.width;
            switch (w) {
                case DecorationWidth.Viewport: {
                    const snap = Math.floor(ctx.inlineStart(rect) / ctx.viewportInlineSize) * ctx.viewportInlineSize;
                    ctx.applyPosition(element, snap + ctx.inlineScrollOffset + inlineInset, ctx.blockStart(rect) + ctx.blockScrollOffset, ctx.viewportInlineSize - 2 * inlineInset, ctx.blockSize(rect), iz);
                    break;
                }
                case DecorationWidth.Page: {
                    const snap = Math.floor(ctx.inlineStart(rect) / ctx.pageInlineSize) * ctx.pageInlineSize;
                    ctx.applyPosition(element, snap + ctx.inlineScrollOffset + inlineInset, ctx.blockStart(rect) + ctx.blockScrollOffset, ctx.pageInlineSize - 2 * inlineInset, ctx.blockSize(rect), iz);
                    break;
                }
                case DecorationWidth.Bounds: {
                    ctx.applyPosition(element, ctx.inlineStart(boundingRect) + ctx.inlineScrollOffset, ctx.blockStart(rect) + ctx.blockScrollOffset, ctx.inlineSize(boundingRect), ctx.blockSize(rect), iz);
                    break;
                }
                default: {
                    ctx.applyPosition(element, ctx.inlineStart(rect) + ctx.inlineScrollOffset, ctx.blockStart(rect) + ctx.blockScrollOffset, ctx.inlineSize(rect), ctx.blockSize(rect), iz);
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
                        return [
                            isBounds
                                ? `border-top: 0.1em solid ${adjustedUnderlineTint} !important`
                                : null,
                            `border-bottom: 0.1em solid ${adjustedUnderlineTint} !important`,
                            "background-color: transparent !important",
                            "box-sizing: border-box !important",
                        ].filter(Boolean).join("; ");
                    }
                    case DecorationStyleType.Outline:
                        const adjustedOutlineTint = applyContrast ? adjustColorForContrast(tint, backgroundColor) : tint;
                        return [
                            `outline: 2px solid ${adjustedOutlineTint} !important`,
                            "outline-offset: 1px !important",
                            "background-color: transparent !important",
                            "box-sizing: border-box !important",
                        ].join("; ");
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
            positionElement(bounds, boundingRect, boundingRect, outlineInset);
            itemContainer.append(bounds);
        } else {
            // Fall back to "boxes" value for layout
            let clientRects = getClientRectsNoOverlap(
              item.range,
              true,              // doNotMergeHorizontallyAlignedRects
              ctx.isVertical     // doNotMergeVerticallyAlignedRects
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
              positionElement(line, clientRect, boundingRect, outlineInset);
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
    private requireContainer(experimental=false): [HTMLStyleElement, any] | HTMLDivElement {
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

            // Setup CSS.highlights
            let h: unknown;
            if (((this.wnd as any).CSS.highlights as Map<string, unknown>).has(this.id)) {
                h = ((this.wnd as any).CSS.highlights as Map<string, unknown>).get(this.id)
            } else {
                h = new (this.wnd as any).Highlight();
                ((this.wnd as any).CSS.highlights as Map<string, unknown>).set(this.id, h);
            }
            return [d, h];
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

        let iz = 1;
        if (sML.UA.Blink) {
            const rootZoom = parseFloat(this.wnd.getComputedStyle(this.wnd.document.documentElement).zoom);
            const bodyZoom = parseFloat(this.wnd.getComputedStyle(this.wnd.document.body).zoom);
            const effectiveZoom = (rootZoom || 1) * (bodyZoom || 1);
            if (effectiveZoom) iz = 1 / effectiveZoom;
        }

        // Collect all hole rects from mask decorations
        const docEl = this.wnd.document.documentElement;
        const docW = docEl.scrollWidth;
        const docH = docEl.scrollHeight;
        const allHoleRects: DOMRect[] = [];
        for (const item of maskItems) {
            const style  = item.decoration.style as BuiltinDecorationStyle;
            const layout = style.layout ?? DecorationLayout.Boxes;
            const width  = style.width  ?? DecorationWidth.Wrap;

            const boundingRect = item.range.getBoundingClientRect();

            const baseRects: DOMRect[] = layout === DecorationLayout.Bounds
                ? [boundingRect]
                : Array.from(item.range.getClientRects());

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
                        hole = rect;
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
            ((this.wnd as any).CSS.highlights as Map<string, unknown>).delete(this.id);
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
    private wnd!: ReadiumWindow;
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

    mount(wnd: ReadiumWindow, comms: Comms): boolean {
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

    unmount(wnd: ReadiumWindow, comms: Comms): boolean {
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
