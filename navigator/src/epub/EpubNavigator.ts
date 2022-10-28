import { Link, Locator, Publication, ReadingProgression } from "@readium/shared/src";
import { VisualNavigator } from "../";
import FramePoolManager from "./frame/FramePoolManager";
import { CommsEventKey, ModuleLibrary, ModuleName } from "@readium/navigator-html-injectables/src";
import { FrameClickEvent } from "@readium/navigator-html-injectables/src/modules/ReflowablePeripherals";
import * as path from "path-browserify";

export interface EpubNavigatorListeners {
    frameLoaded: (wnd: Window) => void;
    positionChanged: (locator: Locator) => void;
    tap: (e: FrameClickEvent) => boolean; // Return true to prevent handling here
    click: (e: FrameClickEvent) => boolean;  // Return true to prevent handling here
    miscPointer: (amount: number) => void;
    customEvent: (key: string, data: unknown) => void;
    // showToc: () => void;
}

export class EpubNavigator extends VisualNavigator {
    private readonly pub: Publication;
    private readonly container: HTMLElement;
    private readonly listeners: EpubNavigatorListeners;
    private framePool!: FramePoolManager;
    private positions!: Locator[];
    private currentLocation!: Locator;
    private currentProgression: ReadingProgression;

    constructor(container: HTMLElement, pub: Publication, listeners: EpubNavigatorListeners, positions: Locator[] = [], initialPosition: Locator | undefined = undefined) {
        super();
        this.pub = pub;
        this.currentProgression = pub.metadata.effectiveReadingProgression;
        this.container = container;
        this.listeners = listeners;
        this.currentLocation = initialPosition!;
        if (positions.length)
            this.positions = positions;
    }

    public async load() {
        if (!this.positions?.length)
            this.positions = await this.pub.positionsFromManifest();
        this.framePool = new FramePoolManager(this.container, this.positions);
        if(this.currentLocation === undefined)
            this.currentLocation = this.positions[0];
        await this.apply();
    }

    /**
     * Exposed to the public to compensate for lack of implemented readium conveniences
     */
    public get _cframe() {
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
                this.listeners.frameLoaded(this._cframe!.iframe.contentWindow!);
                this.listeners.positionChanged(this.currentLocation);
                break;
            case "click":
            case "tap":
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
                        const origHref = element.attributes.getNamedItem("href")?.value!;
                        if (origHref.startsWith("#")) {
                            console.warn("TODO reimplement anchor jump!");
                            // contentWindow.readium.scrollToId(origHref.substring(1));
                        } else {
                            try {
                                this.goLink(new Link({
                                    href: path.join(path.dirname(this.currentLocation.href), origHref)
                                }), false, () => { });
                            } catch (error) {
                                console.warn(`Couldn't go to link for ${origHref}: ${error}`);
                                if(key === "click") this.listeners.click(edata);
                                else this.listeners.tap(edata);
                            }
                        }
                    } else console.log("Clicked on", element);
                } else {
                    const handled = key === "click" ? this.listeners.click(edata) : this.listeners.tap(edata);
                    if(handled) break;
                    const oneQuarter = (this._cframe!.window.innerWidth * window.devicePixelRatio) / 4;
                    // open UI if middle screen is clicked/tapped
                    if (edata.x >= oneQuarter && edata.x <= oneQuarter * 3) this.listeners.miscPointer(1);
                    // if (scrollMode.value) return; TODO!
                    if (edata.x < oneQuarter) this.goLeft(false, () => { }); // Go left if left quarter clicked
                    else if (edata.x > oneQuarter * 3) this.goRight(false, () => { }); // Go right if right quarter clicked
                }
                break;
            case "tap_more":
                this.listeners.miscPointer(data as number);
                break;
            case "no_more":
                this.changeResource(1);
                break;
            case "no_less":
                this.changeResource(-1);
                break;
            case "swipe":
                // Swipe event
                break;
            case "progress":
                this.syncLocation(data as number);
                break;
            case "log":
                console.log(this._cframe?.source.split("/")[3], ...(data as any[]));
                break;
            default:
                this.listeners.customEvent(key, data);
                break;
        }
    }

    private determineModules() {
        let modules = Array.from(ModuleLibrary.keys()) as ModuleName[];

        // Horizontal vs. Vertical reading
        if (this.readingProgression === ReadingProgression.ttb || this.readingProgression === ReadingProgression.btt)
            modules = modules.filter((m) => m !== "column_snapper");
        else
            modules = modules.filter((m) => m !== "scroll_snapper");

        return modules;
    }

    // Start listening to messages from the current iframe
    private attachListener() {
        if(!this._cframe) throw Error("no cframe to attach listener to");
        if(this._cframe.msg) this._cframe.msg.listener = (key: CommsEventKey, value: unknown) => {
            this.eventListener(key, value);
        }
    }

    private async apply() {
        await this.framePool.update(this.pub, this.currentLocator, this.determineModules());

        this.attachListener();

        const idx = this.pub.readingOrder.findIndexWithHref(this.currentLocation.href);
        if (idx < 0)
            throw Error("Link for " + this.currentLocation.href + " not found!");
    }

    public async destroy() {
        await this.framePool?.destroy();
    }

    private async changeResource(relative: number): Promise<boolean> {
        if (relative === 0) return false;
        const curr = this.pub.readingOrder.findIndexWithHref(this.currentLocation.href);
        const i = Math.max(
            0,
            Math.min(this.pub.readingOrder.items.length - 1, curr + relative)
        );
        if (i === curr) return false;

        // Apply change
        if(curr > i)
            for (let j = this.positions.length - 1; j >= 0; j--) {
                if(this.positions[j].href === this.pub.readingOrder.items[i].href) {
                    this.currentLocation = this.positions[j].copyWithLocations({
                        progression: 0.999999999999
                    });
                    break;
                }
            }
        else
            for (let j = 0; j < this.positions.length; j++) {
                if(this.positions[j].href === this.pub.readingOrder.items[i].href) {
                    this.currentLocation = this.positions[j];
                    break;
                }
            }

        await this.apply();
        return true;
    }

    private findNearestPosition(fromProgression: number): Locator {
        // TODO replace with locator service
        const potentialPositions = this.positions.filter(
            (p) => p.href === this.currentLocation.href
        );
        let pos = this.currentLocation;

        // Find the last locator with a progrssion that's
        // smaller than or equal to the requested progression.
        potentialPositions.some((p) => {
            const pr = p.locations.progression ?? 0;
            if (fromProgression <= pr) {
                pos = p;
                return true;
            }
            else return false;
        });
        return pos;
    }

    private async syncLocation(iframeProgress: number) {
        this.currentLocation = this.findNearestPosition(iframeProgress).copyWithLocations({
            progression: iframeProgress // Most accurate progression in resource
        });
        this.listeners.positionChanged(this.currentLocation);
        await this.framePool.update(this.pub, this.currentLocation, this.determineModules());
    }

    public goBackward(animated: boolean, cb: (ok: boolean) => void): void {
        this._cframe?.msg?.send("go_prev", undefined, async (ack) => {
            if(ack)
                // OK
                cb(true);
            else
                // Need to change resources because we're at the beginning of the current one
                cb(await this.changeResource(-1));
        });
    }

    public goForward(animated: boolean, cb: (ok: boolean) => void): void {
        this._cframe?.msg?.send("go_next", undefined, async (ack) => {
            if(ack)
                // OK
                cb(true);
            else
                // Need to change resources because we're at the end of the current one
                cb(await this.changeResource(1));
        });
    }

    get currentLocator(): Locator {
        // TODO seed locator with detailed info if this property is accessed
        /*return (async () => { // Wrapped because JS doesn't support async getters
            return this.currentLocation;
        })();*/

        return this.currentLocation;
    }

    // TODO: This is temporary until user settings are implemented.
    get readingProgression(): ReadingProgression {
        return this.currentProgression;
    }

    // TODO: This is temporary until user settings are implemented.
    public async setReadingProgression(newProgression: ReadingProgression) {
        if(this.currentProgression === newProgression) return;
        this.currentProgression = newProgression;
        await this.framePool.update(this.pub, this.currentLocator, this.determineModules(), true);
        this.attachListener();
    }

    get publication(): Publication {
        return this.pub;
    }

    public go(locator: Locator, animated: boolean, cb: (ok: boolean) => void): void {
        const href = locator.href.split("#")[0];
        let link = this.pub.readingOrder.findWithHref(href);
        if(!link) {
            // We don't let the user go to a resource right now.
            link = this.pub.resources?.findWithHref(href);
            if(!link) console.error(`Nothing in readingOrder or resources with href ${href} to go to`);
            /*if(link.rels?.has("contents")) {
                this.listeners.showToc();
                return cb();
            }*/
            else console.error(`${href} is only in resources, not readingOrder. Can't go to it`);
            return cb(false);
        }

        this.currentLocation = this.positions.find(p => p.href === link!.href)!;
        this.apply().then(() => {
            const progression = locator?.locations?.progression;
            const hasProgression = progression && progression > 0;

            if(hasProgression)
                this._cframe!.msg!.send("go_progression", progression, () => {
                    // Now that we've gone to the right progression, we can attach the listeners.
                    // Doing this only at this stage reduces janky UI with multiple progression updates.
                    this.attachListener();
                    cb(true);
                });
            else
                cb(true);
        });
    }

    public goLink(link: Link, animated: boolean, cb: (ok: boolean) => void): void {
        return this.go(link.locator, animated, cb);
    }
}