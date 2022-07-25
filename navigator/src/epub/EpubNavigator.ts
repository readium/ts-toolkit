import { Link } from "../../../shared/src/publication/Link";
import { Locator } from "../../../shared/src/publication/Locator";
import { Publication } from "../../../shared/src/publication/Publication";
import { ReadingProgression } from "../../../shared/src/publication/ReadingProgression";
import { VisualNavigator } from "../";
import FramePoolManager from "./frame/FramePoolManager";
import { CommsEventKey, ModuleLibrary, ModuleName } from "../../../navigator-html/src";
import { FrameClickEvent } from "../../../navigator-html/src/modules/ReflowablePeripherals";
import * as path from "path-browserify";

export interface EpubNavigatorListeners {
    frameLoaded: (wnd: Window) => void;
    positionChanged: (locator: Locator) => void;
    click: (e: FrameClickEvent) => void;
}

export class EpubNavigator extends VisualNavigator {
    private readonly pub: Publication;
    private readonly container: HTMLElement;
    private readonly listeners: EpubNavigatorListeners;
    private framePool: FramePoolManager;
    private positions: Locator[];
    private currentLocation: Locator;
    private wentBack: boolean;

    constructor(container: HTMLElement, pub: Publication, listeners: EpubNavigatorListeners, positions: Locator[] = []) {
        super();
        this.pub = pub;
        this.container = container;
        this.listeners = listeners;
        if (positions.length)
            this.positions = positions;
    }

    async load() {
        if (!this.positions?.length)
            this.positions = await this.pub.positionsFromManifest();
        this.framePool = new FramePoolManager(this.positions);
        this.currentLocation = this.positions[0];
        await this.apply();
    }

    /**
     * Exposed to the public to compensate for lack of implemented readium conveniences
     */
    public get cframe() {
        return this.framePool.currentFrame;
    }

    /**
     * Left intentionally public so you can pass in your own events here
     * to trigger the navigator when user's mouse/keyboard focus is
     * outside the readium-controller navigator. Be careful!
     */
    public eventListener(key: CommsEventKey, data: unknown) {
        switch (key) {
            case "_pong":
                this.listeners.frameLoaded(this.cframe.iframe.contentWindow!);
                this.listeners.positionChanged(this.currentLocation)
                break;
            case "click": // TODO distinguish between click and tap!
            case "tap":
                // Handle click
                const edata = data as FrameClickEvent;
                if (edata.interactiveElement) {
                    const element = new DOMParser().parseFromString(
                        edata.interactiveElement,
                        "text/html"
                    ).body.children[0];
                    if (
                        element.nodeType === element.ELEMENT_NODE &&
                        element.nodeName === "A" &&
                        element.hasAttribute("href")
                    ) {
                        const origHref = element.attributes.getNamedItem("href")?.value;
                        if (origHref?.startsWith("#")) {
                            console.warn("TODO reimplement anchor jump!");
                            // contentWindow.readium.scrollToId(origHref.substring(1));
                        } else {
                            // TODO see if this can be improved
                            const could = this.goLink(new Link({
                                href: path.join(path.dirname(this.currentLocation.href), origHref)
                            }), false, () => { });
                            if(!could) console.warn("Couldn't go to link for " + origHref);
                        }
                    } else console.log("Clicked on", element);
                } else {
                    const oneQuarter = (this.cframe.window.innerWidth * window.devicePixelRatio) / 4;
                    // open UI if middle screen is clicked/tapped
                    if (edata.x >= oneQuarter && edata.x <= oneQuarter * 3) this.listeners.click(edata);
                    // if (scrollMode.value) return; TODO!
                    if (edata.x < oneQuarter) this.goLeft(false, () => { }); // Go left if left quarter clicked
                    else if (edata.x > oneQuarter * 3) this.goRight(false, () => { }); // Go right if right quarter clicked
                }
                break;
            case "no_more":
                this.changeResource(1);
                break;
            case "no_less":
                this.changeResource(-1);
                break;
            case "swipe":
                // TODO properly update current locator!
                this.changeResource(0);
                break;
            default:
                console.warn("Unknown frame msg key", key); // TODO remove/replace
                break;
        }
    }

    private async apply() {
        // Change the current frame
        this.cframe?.msg?.clearListener();
        await this.framePool.update(this.pub, this.currentLocator);

        // Clear container of elements
        while (this.container.firstChild) {
            this.container.removeChild(this.container.firstChild);
        }

        // Add the new current iframe
        this.container.appendChild(this.cframe.iframe);

        // Load iframe with modules
        let modules = Array.from(ModuleLibrary.keys()) as ModuleName[];
        if (this.readingProgression === ReadingProgression.ttb) modules = modules.filter((m) => m !== "column_snapper");
        await this.cframe.load(modules);

        // Start listening to messages from the current iframe
        this.cframe.msg.listener = (key: CommsEventKey, value: unknown) => {
            this.eventListener(key, value);
        }

        const idx = this.pub.readingOrder.findIndexWithHref(this.currentLocation.href);
        if (idx < 0)
            throw Error("Link for " + this.currentLocation.href + " not found!");
        if (this.wentBack) {
            this.wentBack = false;
            this.cframe.msg.send("go_end", undefined);
            const shadowPositionsList = [...this.positions];
            this.currentLocation = shadowPositionsList?.reverse().find(
                (p) => p.href === this.currentLocation.href
            ) ?? shadowPositionsList[shadowPositionsList.length - 1];
        }
    }

    destroy() {
        this.framePool?.destroy();
    }

    private changeResource(relative: number): boolean {
        if (relative === 0) return false;
        const curr = this.pub.readingOrder.findIndexWithHref(this.currentLocation.href);
        const i = Math.max(
            0,
            Math.min(this.pub.readingOrder.items.length - 1, curr + relative)
        );
        if (i === curr) return false;
        if (curr > i) this.wentBack = true;

        // Apply change
        this.currentLocation = this.positions.find(p => p.href === this.pub.readingOrder.items[i].href)!;
        this.apply();

        return true;
    }

    private findNearestPosition(fromProgression: number): Locator {
        // TODO replace with locator service
        const potentialPositions = this.positions.filter(
            (p) => p.href === this.currentLocation.href
        );
        let pos = this.currentLocation;
        potentialPositions.forEach((p) => {
            const pr = p.locations.progression ?? 0;
            if (fromProgression < pr) pos = p;
            else return;
        });
        return pos;
    }

    goBackward(animated: boolean, cb: () => void): boolean {
        if (this.cframe.atLeft) {
            this.changeResource(-1);
            return false;
        }
        this.cframe.msg.send("go_prev", undefined, () => {
            // TODO make this direction-independent!!
            this.currentLocation = this.findNearestPosition(
                this.cframe.window.scrollX / this.cframe.window.document.scrollingElement!.scrollWidth
            );
            this.listeners.positionChanged(this.currentLocation);
            this.framePool.update(this.pub, this.currentLocation);
            cb();
        });
        return true;
    }

    goForward(animated: boolean, cb: () => void): boolean {
        if (this.cframe.atRight) {
            this.changeResource(1);
            return false;
        }
        this.cframe.msg.send("go_next", undefined, () => {
            // TODO make this direction-independent!!
            this.currentLocation = this.findNearestPosition(
                this.cframe.window.scrollX / this.cframe.window.document.scrollingElement!.scrollWidth
            );
            this.listeners.positionChanged(this.currentLocation);
            this.framePool.update(this.pub, this.currentLocation);
            cb();
        });
        return true;
    }

    get currentLocator(): Locator {
        // TODO seed locator with detailed info if this property is accessed
        return this.currentLocation;
    }

    get readingProgression(): ReadingProgression {
        return ReadingProgression.auto; // TODO
    }

    get publication(): Publication {
        return this.pub;
    }

    go(locator: Locator, animated: boolean, cb: () => void): boolean {
        const href = locator.href.split("#")[0];
        // TODO do we let clients go to a resource too? Seems to be the case in kotlin
        const link = this.pub.readingOrder.findWithHref(href);
        if(!link) return false;

        // TODO we need to use other parts of locator.locations to e.g. jump in a resource... right?

        this.currentLocation = this.positions.find(p => p.href === link.href)!;
        this.apply();

        cb(); // Should be used when we jump inside a resource
        return true;
    }

    goLink(link: Link, animated: boolean, cb: () => void): boolean {
        return this.go(link.locator, animated, cb);
    }
}