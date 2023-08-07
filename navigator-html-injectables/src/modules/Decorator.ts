import { Locator } from "@readium/shared/src";
import { Comms } from "../comms/comms";
import { Module } from "./Module";
import { rangeFromLocator } from "../helpers/locator";
import { ModuleName } from "./ModuleLibrary";

export interface Decoration {
    id: string; // Unique ID of the decoration. It must be unique in the group the decoration is applied to.
    locator: Locator; // Location in the publication where the decoration will be rendered.
    // TODO style
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

class DecorationGroup {
    public readonly items: DecorationItem[] = [];
    private lastItemId = 0;
    private container: HTMLDivElement | undefined = undefined;
    private activateable = false;
    private experimentalHighlights = false;

    /**
     * Creates a DecorationGroup object
     * @param id Unique HTML ID-adhering name of the group
     * @param name Human-readable name of the group
     */
    constructor(private wnd: Window, private comms: Comms, private id: string, private name: string) {
        if ("Highlight" in window) {
            this.experimentalHighlights = true;
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

        const item = {
            decoration,
            id,
            range,
        } as DecorationItem;
        this.items.push(item);
        this.layout(item);
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
        if (this.experimentalHighlights) {
            // Remove highlight from ranges
            const mm = ((this.wnd as any).CSS.highlights as Map<string, unknown>).get(this.id) as Set<Range>;
            mm?.delete(item.range);
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
    }

    /**
     * Recreates the decoration elements.
     * To be called after reflowing the resource, for example.
     */
    requestLayout() {
        this.clearContainer();
        this.items.forEach(i => this.layout(i));
    }

    /**
     * Layouts a single DecorationItem.
     * @param item 
     */
    private layout(item: DecorationItem) {
        if (this.experimentalHighlights) {
            const [stylesheet, highlighter]: [HTMLStyleElement, any] = this.requireContainer() as [HTMLStyleElement, unknown];
            highlighter.add(item.range);
            if (stylesheet.innerHTML.length < 3)
                // TODO customization
                stylesheet.innerHTML += `
                ::highlight(${this.id}) {
                    color: black;
                    background-color: yellow;
                }`;
            return;
        }

        this.comms.log("Environment does not support experimental Web Highlight API, can't layout decorations");
        return;

        /*
        const groupContainer = this.requireContainer();

        // TODO styles

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

        const positionElement = (element: HTMLElement, rect, boundingRect: DOMRect) => {
            element.style.position = "absolute";

            if (style.width === "wrap") {
                element.style.width = `${rect.width}px`;
                element.style.height = `${rect.height}px`;
                element.style.left = `${rect.left + xOffset}px`;
                element.style.top = `${rect.top + yOffset}px`;
            } else if (style.width === "viewport") {
                element.style.width = `${viewportWidth}px`;
                element.style.height = `${rect.height}px`;
                let left = Math.floor(rect.left / viewportWidth) * viewportWidth;
                element.style.left = `${left + xOffset}px`;
                element.style.top = `${rect.top + yOffset}px`;
            } else if (style.width === "bounds") {
                element.style.width = `${boundingRect.width}px`;
                element.style.height = `${rect.height}px`;
                element.style.left = `${boundingRect.left + xOffset}px`;
                element.style.top = `${rect.top + yOffset}px`;
            } else if (style.width === "page") {
                element.style.width = `${pageWidth}px`;
                element.style.height = `${rect.height}px`;
                let left = Math.floor(rect.left / pageWidth) * pageWidth;
                element.style.left = `${left + xOffset}px`;
                element.style.top = `${rect.top + yOffset}px`;
            }
        }

        const boundingRect = item.range.getBoundingClientRect();

        let elementTemplate;
        try {
            let template = this.wnd.document.createElement("template");
            template.innerHTML = item.decoration.element.trim();
            elementTemplate = template.content.firstElementChild;
        } catch (error) {
            logErrorMessage(
                `Invalid decoration element "${item.decoration.element}": ${error.message}`
            );
            return;
        }*/
    }

    /**
     * Returns the group container element, after making sure it exists.
     * @returns Group's container
     */
    private requireContainer(): [HTMLStyleElement, any] | HTMLDivElement {
        if (this.experimentalHighlights) {
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
            this.container.style.setProperty("pointer-events", "none");
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
    private wnd!: Window;
    private comms!: Comms;

    private lastGroupId = 0;
    private groups = new Map<string, DecorationGroup>();

    private cleanup() {

    }

    mount(wnd: Window, comms: Comms): boolean {
        this.wnd = wnd;
        this.comms = comms;

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

        comms.log("Decorator Mounted");
        return true;
    }

    unmount(wnd: Window, comms: Comms): boolean {
        comms.unregisterAll(Decorator.moduleName);

        // TODO cleanup all decorators
        this.groups.forEach(g => g.clear());
        this.groups.clear();


        comms.log("Decorator Unmounted");
        return true;
    }
}