import { Locator } from "@readium/shared/src/publication";
import { Comms } from "../comms/comms";
import { Module } from "./Module";
import { rangeFromLocator } from "../helpers/locator";
import { ModuleName } from "./ModuleLibrary";
import { Rect, getClientRectsNoOverlap } from "../helpers/rect";
import { ResizeObserver as Polyfill } from '@juggle/resize-observer';
import { getProperty } from "../helpers/css";

// Necessary for iOS 13 and below
const ResizeObserver = window.ResizeObserver || Polyfill;

export enum Width {
    Wrap = "wrap", // Smallest width fitting the CSS border box.
    Viewport = "viewport", // Fills the whole viewport.
    Bounds = "bounds", // Fills the anchor page, useful for dual page.
    Page = "page", // Fills the whole viewport.
}

export enum Layout {
    Boxes = "boxes", // One HTML element for each CSS border box (e.g. line of text).
    Bounds = "bounds", // A single HTML element covering the smallest region containing all CSS border boxes.
}

// TODO improve
export interface Style {
    tint: string; // CSS color string
    layout: Layout; // Determines the number of created HTML elements and their position relative to the matching DOM range.
    width: Width; // Indicates how the width of each created HTML element expands in the viewport.
}

export interface Decoration {
    id: string; // Unique ID of the decoration. It must be unique in the group the decoration is applied to.
    locator: Locator; // Location in the publication where the decoration will be rendered.
    style: Style; // Declares the look and feel of the decoration.
    // TODO extras (userInfo)
}

export interface DecoratorRequest {
    group: string; // Unique ID of the decoration group
    action: "add" | "remove" | "clear" | "update"; // Command
    decoration: Decoration | undefined;
}

interface DecorationItem {
    id: string;
    decoration: Decoration;
    range: Range;

    clickableElements: HTMLElement[] | undefined;
    container: HTMLElement | undefined;
}

const canNativeHighlight = "Highlight" in window;
const cannotNativeHighlight = ["IMG", "IMAGE", "AUDIO", "VIDEO", "SVG"];

class DecorationGroup {
    public readonly items: DecorationItem[] = [];
    private lastItemId = 0;
    private container: HTMLDivElement | undefined = undefined;
    private activateable = false;
    public readonly experimentalHighlights: boolean = false;
    private readonly notTextFlag: Map<string, boolean> | undefined;

    /**
     * Creates a DecorationGroup object
     * @param id Unique HTML ID-adhering name of the group
     * @param name Human-readable name of the group
     */
    constructor(
        private readonly wnd: Window,
        private readonly comms: Comms,
        private readonly id: string,
        private readonly name: string
    ) {
        if (canNativeHighlight) {
            this.experimentalHighlights = true;
            this.notTextFlag = new Map<string, boolean>();
        }
    }

    get activeable() {
        return this.activateable;
    }

    set activeable(value: boolean) {
        this.activateable = value;
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
            if(ancestor.querySelector(cannotNativeHighlight.join(", ").toLowerCase())) {
                // Contains elements that definitely cannot be highlighted as children
                this.notTextFlag?.set(id, true);
            }
            if((ancestor.textContent?.trim() || "").length === 0) {
                // No text to be highlighted
                this.notTextFlag?.set(id, true);
            }
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
    }

    /**
     * Recreates the decoration elements.
     * To be called after reflowing the resource, for example.
     */
    requestLayout() {
        this.wnd.cancelAnimationFrame(this.currentRender);
        this.clearContainer();
        this.items.forEach(i => this.layout(i));
        this.renderLayout(this.items);
    }

    private experimentalLayout(item: DecorationItem) {
        const [stylesheet, highlighter]: [HTMLStyleElement, any] = this.requireContainer(true) as [HTMLStyleElement, unknown];
        highlighter.add(item.range);

        // TODO add caching layer ("vdom") to this so we aren't completely replacing the CSS every time
        stylesheet.innerHTML = `
        ::highlight(${this.id}) {
            color: black;
            background-color: ${item.decoration?.style?.tint ?? "yellow"};
        }`;
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
        // itemContainer.dataset.style = item.decoration.style; // TODO style
        itemContainer.style.setProperty("pointer-events", "none");

        const viewportWidth = this.wnd.innerWidth;
        const columnCount = parseInt(
            getComputedStyle(this.wnd.document.documentElement).getPropertyValue(
                "column-count"
            )
        );
        const pageWidth = viewportWidth / (columnCount || 1);
        const scrollingElement = this.wnd.document.scrollingElement!;
        const xOffset = scrollingElement.scrollLeft;
        const yOffset = scrollingElement.scrollTop;

        const positionElement = (element: HTMLElement, rect: Rect, boundingRect: DOMRect) => {
            element.style.position = "absolute";

            // TODO change to switch
            if (item.decoration?.style?.width === Width.Viewport) {
                element.style.width = `${viewportWidth}px`;
                element.style.height = `${rect.height}px`;
                let left = Math.floor(rect.left / viewportWidth) * viewportWidth;
                element.style.left = `${left + xOffset}px`;
                element.style.top = `${rect.top + yOffset}px`;
            } else if (item.decoration?.style?.width === Width.Bounds) {
                element.style.width = `${boundingRect.width}px`;
                element.style.height = `${rect.height}px`;
                element.style.left = `${boundingRect.left + xOffset}px`;
                element.style.top = `${rect.top + yOffset}px`;
            } else if (item.decoration?.style?.width === Width.Page) {
                element.style.width = `${pageWidth}px`;
                element.style.height = `${rect.height}px`;
                let left = Math.floor(rect.left / pageWidth) * pageWidth;
                element.style.left = `${left + xOffset}px`;
                element.style.top = `${rect.top + yOffset}px`;
            } else {
                // Fall back to "wrap"
                element.style.width = `${rect.width}px`;
                element.style.height = `${rect.height}px`;
                element.style.left = `${rect.left + xOffset}px`;
                element.style.top = `${rect.top + yOffset}px`;
            }
        }

        const boundingRect = item.range.getBoundingClientRect();

        let template = this.wnd.document.createElement("template");
        // template.innerHTML = item.decoration.element.trim();
        // TODO more styles logic

        const isDarkMode = getProperty(this.wnd, "--USER__appearance") === "readium-night-on";

        template.innerHTML = `
        <div
            class="r2-highlight-0"
            style="${[
                `background-color: ${item.decoration?.style?.tint ?? "yellow"} !important`,
                //"opacity: 0.3 !important",
                `mix-blend-mode: ${isDarkMode ? "exclusion" : "multiply"} !important`,
                "opacity: 1 !important",
                "box-sizing: border-box !important"
            ].join("; ")}"
        >
        </div>
        `.trim();
        const elementTemplate = template.content.firstElementChild!;

        if(item.decoration?.style?.layout === Layout.Bounds) {
            const bounds = elementTemplate.cloneNode(true) as HTMLDivElement;
            bounds.style.setProperty("pointer-events", "none");
            positionElement(bounds, boundingRect, boundingRect);
            itemContainer.append(bounds);
        } else {
            // Fall back to "boxes" value for layout
            let clientRects = getClientRectsNoOverlap(
              item.range,
              true // doNotMergeHorizontallyAlignedRects
            );

            clientRects = clientRects.sort((r1, r2) => {
              if (r1.top < r2.top) {
                return -1;
              } else if (r1.top > r2.top) {
                return 1;
              } else {
                return 0;
              }
            });

            for (let clientRect of clientRects) {
              const line = elementTemplate.cloneNode(true) as HTMLDivElement;
              line.style.setProperty("pointer-events", "none");
              positionElement(line, clientRect, boundingRect);
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
            this.container = this.wnd.document.createElement("div");
            this.container.setAttribute("id", this.id);
            this.container.dataset.group = this.name;
            this.container.dataset.readium = "true";
            this.container.style.setProperty("pointer-events", "none");
            this.container.style.display = "contents";
            this.wnd.document.body.append(this.container);
        }
        return this.container;
    }

    /**
     * Removes the group container.
     */
    private clearContainer() {
        if (this.experimentalHighlights) {
            ((this.wnd as any).CSS.highlights as Map<string, unknown>).delete(this.id);
        }
        if (this.container) {
            this.container.remove();
            this.container = undefined;
        }
    }
}

export class Decorator extends Module {
    static readonly moduleName: ModuleName = "decorator";
    private resizeObserver!: ResizeObserver;
    private wnd!: Window;
    /*private readonly lastSize = {
        width: 0,
        height: 0
    };*/
    private resizeFrame = 0;

    private lastGroupId = 0;
    private groups = new Map<string, DecorationGroup>();

    private cleanup() {
        // TODO cleanup all decorators
        this.groups.forEach(g => g.clear());
        this.groups.clear();
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

    mount(wnd: Window, comms: Comms): boolean {
        this.wnd = wnd;

        comms.register("decorate", Decorator.moduleName, (data, ack) => {
            const req = data as DecoratorRequest;
            if (req.decoration && req.decoration.locator) {
                req.decoration.locator = Locator.deserialize(req.decoration.locator)!;
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
                    group?.add(req.decoration!);
                    break;
                case "remove":
                    group?.remove(req.decoration!.id);
                    break;
                case "clear":
                    group?.clear();
                    break;
                case "update":
                    group?.update(req.decoration!);
                    break;
            }

            ack(true);
        });

        this.resizeObserver = new ResizeObserver(() => wnd.requestAnimationFrame(() => this.handleResize()));
        this.resizeObserver.observe(wnd.document.body);
        wnd.addEventListener("orientationchange", this.handleResizer);
        wnd.addEventListener("resize", this.handleResizer);

        comms.log("Decorator Mounted");
        return true;
    }

    unmount(wnd: Window, comms: Comms): boolean {
        wnd.removeEventListener("orientationchange", this.handleResizer);
        wnd.removeEventListener("resize", this.handleResizer);

        comms.unregisterAll(Decorator.moduleName);
        this.resizeObserver.disconnect();
        this.cleanup();

        comms.log("Decorator Unmounted");
        return true;
    }
}