import { EPUBLayout, Link, Locator, Publication, ReadingProgression } from "@readium/shared/src/publication";
import { VisualNavigator } from "../";
import FramePoolManager from "./frame/FramePoolManager";
import FXLFramePoolManager from "./fxl/FXLFramePoolManager";
import { CommsEventKey, FXLModules, ModuleLibrary, ModuleName, ReflowableModules } from "@readium/navigator-html-injectables/src";
import { FrameClickEvent } from "@readium/navigator-html-injectables/src/modules/ReflowablePeripherals";
import * as path from "path-browserify";
import FXLFrameManager from "./fxl/FXLFrameManager";
import FrameManager from "./frame/FrameManager";

export type ManagerEventKey = "zoom";

export interface EpubNavigatorListeners {
    frameLoaded: (wnd: Window) => void;
    positionChanged: (locator: Locator) => void;
    tap: (e: FrameClickEvent) => boolean; // Return true to prevent handling here
    click: (e: FrameClickEvent) => boolean;  // Return true to prevent handling here
    zoom: (scale: number) => void;
    miscPointer: (amount: number) => void;
    customEvent: (key: string, data: unknown) => void;
    handleLocator: (locator: Locator) => boolean; // Retrun true to prevent handling here
    // showToc: () => void;
}

const defaultListeners = (listeners: EpubNavigatorListeners): EpubNavigatorListeners => ({
    frameLoaded: listeners.frameLoaded || (() => {}),
    positionChanged: listeners.positionChanged || (() => {}),
    tap: listeners.tap || (() => false),
    click: listeners.click || (() => false),
    zoom: listeners.zoom || (() => {}),
    miscPointer: listeners.miscPointer || (() => {}),
    customEvent: listeners.customEvent || (() => {}),
    handleLocator: listeners.handleLocator || (() => false),
})

export class EpubNavigator extends VisualNavigator {
    private readonly pub: Publication;
    private readonly container: HTMLElement;
    private readonly listeners: EpubNavigatorListeners;
    private framePool!: FramePoolManager | FXLFramePoolManager;
    private positions!: Locator[];
    private currentLocation!: Locator;
    private currentProgression: ReadingProgression;
    public readonly layout: EPUBLayout;

    constructor(container: HTMLElement, pub: Publication, listeners: EpubNavigatorListeners, positions: Locator[] = [], initialPosition: Locator | undefined = undefined) {
        super();
        this.pub = pub;
        this.layout = EpubNavigator.determineLayout(pub);
        this.currentProgression = pub.metadata.effectiveReadingProgression;
        this.container = container;
        this.listeners = defaultListeners(listeners);
        this.currentLocation = initialPosition!;
        if (positions.length)
            this.positions = positions;
    }

    public static determineLayout(pub: Publication): EPUBLayout {
        const presentation = pub.metadata.getPresentation();
        if(presentation?.layout == EPUBLayout.fixed) return EPUBLayout.fixed;
        if(pub.metadata.otherMetadata && ("http://openmangaformat.org/schema/1.0#version" in pub.metadata.otherMetadata))
            return EPUBLayout.fixed; // It's fixed layout even though it lacks presentation, although this should really be a divina
        if(pub.metadata.otherMetadata?.conformsTo === "https://readium.org/webpub-manifest/profiles/divina")
            // TODO: this is temporary until there's a divina reader in place
            return EPUBLayout.fixed;
        // TODO other logic to detect fixed layout publications

        return EPUBLayout.reflowable;
    }

    public async load() {
        if (!this.positions?.length)
            this.positions = await this.pub.positionsFromManifest();
        if(this.layout === EPUBLayout.fixed) {
            this.framePool = new FXLFramePoolManager(this.container, this.positions, this.pub);
            this.framePool.listener = (key: CommsEventKey | ManagerEventKey, data: unknown) => {
                this.eventListener(key, data);
            }
        } else
            this.framePool = new FramePoolManager(this.container, this.positions);
        if(this.currentLocation === undefined)
            this.currentLocation = this.positions[0];
        await this.apply();
    }

    /**
     * Exposed to the public to compensate for lack of implemented readium conveniences
     * TODO remove when settings management is incorporated
     */
    public get _cframes(): (FXLFrameManager | FrameManager | undefined)[] {
        return this.framePool.currentFrames;
    }

    /**
     * Exposed to the public to compensate for lack of implemented readium conveniences
     * TODO remove when settings management is incorporated
     */
    public get pool() {
        return this.framePool;
    }

    /**
     * Left intentionally public so you can pass in your own events here
     * to trigger the navigator when user's mouse/keyboard focus is
     * outside the readium-controller navigator. Be careful!
     */
    public eventListener(key: CommsEventKey | ManagerEventKey, data: unknown) {
        switch (key) {
            case "_pong":
                this.listeners.frameLoaded(this._cframes[0]!.iframe.contentWindow!);
                this.listeners.positionChanged(this.currentLocation);
                break;
            case "first_visible_locator":
                const loc = Locator.deserialize(data as string);
                if(!loc) break;
                this.currentLocation = new Locator({
                    href: this.currentLocation.href,
                    type: this.currentLocation.type,
                    title: this.currentLocation.title,
                    locations: loc?.locations,
                    text: loc?.text
                });
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
                            this.go(this.currentLocation.copyWithLocations({
                                fragments: [origHref.substring(1)]
                            }), false, () => { });
                        } else if(
                            origHref.startsWith("http://") ||
                            origHref.startsWith("https://") ||
                            origHref.startsWith("mailto:") ||
                            origHref.startsWith("tel:")
                        ) {
                            this.listeners.handleLocator(new Link({
                                href: origHref,
                            }).locator);
                        } else {
                            try {
                                this.goLink(new Link({
                                    href: path.join(path.dirname(this.currentLocation.href), origHref)
                                }), false, () => { });
                            } catch (error) {
                                console.warn(`Couldn't go to link for ${origHref}: ${error}`);
                                this.listeners.handleLocator(new Link({
                                    href: origHref,
                                }).locator);
                            }
                        }
                    } else console.log("Clicked on", element);
                } else {
                    if(this.layout === EPUBLayout.fixed && (this.framePool as FXLFramePoolManager).doNotDisturb)
                        edata.doNotDisturb = true;

                    if(this.layout === EPUBLayout.fixed
                        // TODO handle ttb/btt
                        && (
                            this.currentProgression === ReadingProgression.rtl ||
                            this.currentProgression === ReadingProgression.ltr
                        )
                    ) {
                        if(this.framePool.currentFrames.length > 1) {
                            // Spread page dimensions
                            const cfs = this.framePool.currentFrames;
                            if(edata.targetFrameSrc === cfs[this.currentProgression === ReadingProgression.rtl ? 0 : 1]?.source) {
                                // The right page (screen-wise) was clicked, so we add the left page's width to the click's x
                                edata.x += (cfs[this.currentProgression === ReadingProgression.rtl ? 1 : 0]?.iframe.contentWindow?.innerWidth ?? 0) * window.devicePixelRatio;
                            }
                        }
                    }

                    const handled = key === "click" ? this.listeners.click(edata) : this.listeners.tap(edata);
                    if(handled) break;
                    if (this.currentProgression === ReadingProgression.ttb || this.currentProgression === ReadingProgression.btt)
                        return; // Not applicable to vertical reading yet. TODO

                    const oneQuarter = ((this._cframes.length === 2 ? this._cframes[0]!.window.innerWidth + this._cframes[1]!.window.innerWidth : this._cframes[0]!.window.innerWidth) * window.devicePixelRatio) / 4;
                    // open UI if middle screen is clicked/tapped
                    if (edata.x >= oneQuarter && edata.x <= oneQuarter * 3) this.listeners.miscPointer(1);
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
            case "zoom":
                this.listeners.zoom(data as number);
                break;
            case "progress":
                this.syncLocation(data as number);
                break;
            case "log":
                console.log(this._cframes[0]?.source?.split("/")[3], ...(data as any[]));
                break;
            default:
                this.listeners.customEvent(key, data);
                break;
        }
    }

    private determineModules() {
        let modules = Array.from(ModuleLibrary.keys()) as ModuleName[];

        if(this.layout === EPUBLayout.fixed) {
            return modules.filter((m) => FXLModules.includes(m));
        } else modules = modules.filter((m) => ReflowableModules.includes(m));

        // Horizontal vs. Vertical reading
        if (this.readingProgression === ReadingProgression.ttb || this.readingProgression === ReadingProgression.btt)
            modules = modules.filter((m) => m !== "column_snapper");
        else
            modules = modules.filter((m) => m !== "scroll_snapper");

        return modules;
    }

    // Start listening to messages from the current iframe
    private attachListener() {
        const vframes = this._cframes.filter(f => !!f) as (FXLFrameManager | FrameManager)[];
        if(vframes.length === 0) throw Error("no cframe to attach listener to");
        vframes.forEach(f => {
            if(f.msg) f.msg.listener = (key: CommsEventKey | ManagerEventKey, value: unknown) => {
                this.eventListener(key, value);
            }
        })
        
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

        if(this.layout === EPUBLayout.fixed) {
            const p = this.framePool as FXLFramePoolManager;
            const old = p.currentNumbers[0];
            if(relative === 1) {
                if(!p.next(p.perPage)) return false;
            } else if(relative === -1) {
                if(!p.prev(p.perPage)) return false;
            } else
                throw Error("Invalid relative value for FXL");

            // Apply change
            const neW = p.currentNumbers[0]
            if(old > neW)
                for (let j = this.positions.length - 1; j >= 0; j--) {
                    if(this.positions[j].href === this.pub.readingOrder.items[neW-1].href) {
                        this.currentLocation = this.positions[j].copyWithLocations({
                            progression: 0.999999999999
                        });
                        break;
                    }
                }
            else if(old < neW)
                for (let j = 0; j < this.positions.length; j++) {
                    if(this.positions[j].href === this.pub.readingOrder.items[neW-1].href) {
                        this.currentLocation = this.positions[j];
                        break;
                    }
                }
            await this.apply();
            return true;
        }

        const curr = this.pub.readingOrder.findIndexWithHref(this.currentLocation.href);
        const i = Math.max(
            0,
            Math.min(this.pub.readingOrder.items.length - 1, curr + relative)
        );
        if (i === curr) {
            this._cframes[0]?.msg?.send("shake", undefined, async (_) => {});
            return false;
        }

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

    public goBackward(_: boolean, cb: (ok: boolean) => void): void {
        if(this.layout === EPUBLayout.fixed) {
            this.changeResource(-1);
            cb(true);
        } else {
            this._cframes[0]?.msg?.send("go_prev", undefined, async (ack) => {
                if(ack)
                    // OK
                    cb(true);
                else
                    // Need to change resources because we're at the beginning of the current one
                    cb(await this.changeResource(-1));
            });
        }
    }

    public goForward(_: boolean, cb: (ok: boolean) => void): void {
        if(this.layout === EPUBLayout.fixed) {
            this.changeResource(1);
            cb(true);
        } else {
            this._cframes[0]?.msg?.send("go_next", undefined, async (ack) => {
                if(ack)
                    // OK
                    cb(true);
                else
                    // Need to change resources because we're at the end of the current one
                    cb(await this.changeResource(1));
            });
        }
    }

    get currentLocator(): Locator {
        // TODO seed locator with detailed info if this property is accessed
        /*return (async () => { // Wrapped because JS doesn't support async getters
            return this.currentLocation;
        })();*/

        return this.currentLocation;
    }

    // Starting and ending position currently showing in the reader
    get currentPositionNumbers(): number[] {
        if(this.layout === EPUBLayout.fixed)
         return (this.framePool as FXLFramePoolManager).currentNumbers;

        return [this.currentLocator?.locations.position ?? 0];
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

    private async loadLocator(locator: Locator, cb: (ok: boolean) => void) {
        let done = false;
        let cssSelector = (typeof locator.locations.getCssSelector === 'function') && locator.locations.getCssSelector();
        if(locator.text?.highlight) {
            done = await new Promise<boolean>((res, _) => {
                // Attempt to go to a highlighted piece of text in the resource
                this._cframes[0]!.msg!.send(
                    "go_text",
                    cssSelector ? [
                        locator.text?.serialize(),
                        cssSelector // Include CSS selector if it exists
                    ] : locator.text?.serialize(),
                    (ok) => res(ok)
                );
            });
        } else if(cssSelector) {
            done = await new Promise<boolean>((res, _) => {
                this._cframes[0]!.msg!.send(
                    "go_text",
                    [
                        "", // No text!
                        cssSelector // Just CSS selector
                    ],
                    (ok) => res(ok)
                );
            });
        }
        if(done) {
            cb(done);
            return;
        }
        // This sanity check has to be performed because we're still passing non-locator class
        // locator objects to this function. This is not good and should eventually be forbidden
        // or the locator should be deserialized sometime before this function.
        const hid = (typeof locator.locations.htmlId === 'function') && locator.locations.htmlId();
        if(hid)
            done = await new Promise<boolean>((res, _) => {
                // Attempt to go to an HTML ID in the resource
                this._cframes[0]!.msg!.send("go_id", hid, (ok) => res(ok));
            });
        if(done) {
            cb(done);
            return;
        }

        const progression = locator?.locations?.progression;
        const hasProgression = progression && progression > 0;
        if(hasProgression)
            done = await new Promise<boolean>((res, _) => {
                // Attempt to go to a progression in the resource
                this._cframes[0]!.msg!.send("go_progression", progression, (ok) => res(ok));
            });
        else done = true;
        cb(done);
    }

    public go(locator: Locator, _: boolean, cb: (ok: boolean) => void): void {
        const href = locator.href.split("#")[0];
        let link = this.pub.readingOrder.findWithHref(href);
        if(!link) {
            return cb(this.listeners.handleLocator(locator));
        }

        this.currentLocation = this.positions.find(p => p.href === link!.href)!;
        this.apply().then(() => this.loadLocator(locator, (ok) => cb(ok))).then(() => {
            // Now that we've gone to the right locator, we can attach the listeners.
            // Doing this only at this stage reduces janky UI with multiple locator updates.
            this.attachListener();
        });
    }

    public goLink(link: Link, animated: boolean, cb: (ok: boolean) => void): void {
        return this.go(link.locator, animated, cb);
    }
}