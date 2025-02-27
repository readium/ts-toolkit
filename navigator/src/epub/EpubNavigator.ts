import { EPUBLayout, Link, Locator, Publication, ReadingProgression } from "@readium/shared";
import { Configurable, ConfigurablePreferences, ConfigurableSettings, LineLengths, VisualNavigator } from "../";
import { FramePoolManager } from "./frame/FramePoolManager";
import { FXLFramePoolManager } from "./fxl/FXLFramePoolManager";
import { CommsEventKey, FXLModules, ModuleLibrary, ModuleName, ReflowableModules } from "@readium/navigator-html-injectables";
import { BasicTextSelection, FrameClickEvent } from "@readium/navigator-html-injectables";
import * as path from "path-browserify";
import { FXLFrameManager } from "./fxl/FXLFrameManager";
import { FrameManager } from "./frame/FrameManager";
import { IEpubPreferences, EpubPreferences } from "./preferences/EpubPreferences";
import { IEpubDefaults, EpubDefaults } from "./preferences/EpubDefaults";
import { EpubSettings } from "./preferences";
import { EpubPreferencesEditor } from "./preferences/EpubPreferencesEditor";
import { ReadiumCSS } from "./css/ReadiumCSS";
import { RSProperties, UserProperties } from "./css/Properties";

export type ManagerEventKey = "zoom";

export interface EpubNavigatorConfiguration {
    preferences: IEpubPreferences;
    defaults: IEpubDefaults;
}

export interface EpubNavigatorListeners {
    frameLoaded: (wnd: Window) => void;
    positionChanged: (locator: Locator) => void;
    tap: (e: FrameClickEvent) => boolean; // Return true to prevent handling here
    click: (e: FrameClickEvent) => boolean;  // Return true to prevent handling here
    zoom: (scale: number) => void;
    miscPointer: (amount: number) => void;
    customEvent: (key: string, data: unknown) => void;
    handleLocator: (locator: Locator) => boolean; // Retrun true to prevent handling here
    textSelected: (selection: BasicTextSelection) => void;
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
    textSelected: listeners.textSelected || (() => {})
})

export class EpubNavigator extends VisualNavigator implements Configurable<ConfigurableSettings, ConfigurablePreferences> {
    private readonly pub: Publication;
    private readonly container: HTMLElement;
    private readonly listeners: EpubNavigatorListeners;
    private framePool!: FramePoolManager | FXLFramePoolManager;
    private positions!: Locator[];
    private currentLocation!: Locator;
    private lastLocationInView: Locator | undefined;
    private currentProgression: ReadingProgression;
    public readonly layout: EPUBLayout;

    private _preferences: EpubPreferences;
    private _defaults: EpubDefaults;
    private _settings: EpubSettings;
    private _constraint: number;
    private _css: ReadiumCSS;
    private _preferencesEditor: EpubPreferencesEditor | null = null;

    private resizeObserver: ResizeObserver;

    constructor(container: HTMLElement, pub: Publication, listeners: EpubNavigatorListeners, positions: Locator[] = [], initialPosition: Locator | undefined = undefined, configuration: EpubNavigatorConfiguration = { preferences: {}, defaults: {} }) {
        super();
        this.pub = pub;
        this.layout = EpubNavigator.determineLayout(pub);
        this.currentProgression = pub.metadata.effectiveReadingProgression;
        this.container = container;
        this.listeners = defaultListeners(listeners);
        this.currentLocation = initialPosition!;
        if (positions.length)
            this.positions = positions;

        this._preferences = new EpubPreferences(configuration.preferences);
        this._defaults = new EpubDefaults(configuration.defaults);
        this._settings = new EpubSettings(this._preferences, this._defaults);
        this._constraint = this._preferences.constraint || 0;
        this._css = new ReadiumCSS({ 
            rsProperties: new RSProperties(this._preferences),
            userProperties: new UserProperties({}),
            lineLengths: new LineLengths({
                optimalChars: this._preferences.optimalLineLength || this._defaults.optimalLineLength,
                minChars: this._preferences.minimalLineLength,
                pageGutter: this._preferences.pageGutter,
                fontFace: this._preferences.fontFamily,
                fontSize: this._preferences.fontSize,
                letterSpacing: this._preferences.letterSpacing,
                wordSpacing: this._preferences.wordSpacing,
                sample: this.pub.metadata.description
            }),
            container: container,
            constraint: this._constraint
        });

        // We use a resizeObserver cos’ the container parent may not be the width of 
        // the document/window e.g. app using a docking system with left and right panels.
        // If we observe this.container, that won’t obviously work since we set its width.
        this.resizeObserver = new ResizeObserver(() => this.ownerWindow.requestAnimationFrame(() => this.resizeHandler()));
        this.resizeObserver.observe(this.container.parentElement || this.container);
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
        
        this.resizeHandler();
        await this.apply();
    }

    public get settings() {
        return this._settings;
    }

    public get preferencesEditor() {
        if (this._preferencesEditor === null) {
            this._preferencesEditor = new EpubPreferencesEditor(this._preferences, this._settings, this.pub.metadata);
        }
        return this._preferencesEditor;
    }

    public async submitPreferences(preferences: EpubPreferences) {
        this._preferences = this._preferences.merging(preferences) as EpubPreferences;
        await this.applyPreferences();
    }

    private async applyPreferences() {
        const oldSettings = this._settings;
        this._settings = new EpubSettings(this._preferences, this._defaults);
        
        if (this._preferencesEditor !== null) {
            this._preferencesEditor = new EpubPreferencesEditor(this._preferences, this._settings, this.pub.metadata);
        }

        // Invalidation by comparing old and new settings if needed
        
        if (this.layout === EPUBLayout.fixed) {
            this.handleFXLPrefs(oldSettings, this._settings);
        } else {
            await this.updateCSS();
        }
    }

    // TODO: fit, etc.
    private handleFXLPrefs(from: EpubSettings, to: EpubSettings) {
        if (from.columnCount !== to.columnCount) {
            (this.framePool as FXLFramePoolManager).setPerPage(to.columnCount);
        }
    }

    private async updateCSS() {
        this._css.update(this._settings);

        if (
            this._css.userProperties.view === "paged" && 
            this.readingProgression === ReadingProgression.ttb
        ) {
            await this.setReadingProgression(this.pub.metadata.effectiveReadingProgression); 
        } else if (
            this._css.userProperties.view === "scroll" && 
            (this.readingProgression === ReadingProgression.ltr || this.readingProgression === ReadingProgression.rtl)
        ) {
            await this.setReadingProgression(ReadingProgression.ttb);
        }

        this.commitCSS(this._css);
    };

    private commitCSS(css: ReadiumCSS) {
        // Since we’re updating the CSS properties in injectables by removing
        // the existing properties that are not inside this object first, 
        // then adding all from it, we don’t compare the previous properties here
        const properties: { [key: string]: string } = {};

        for (const [key, value] of Object.entries(css.rsProperties.toCSSProperties())) {
            properties[key] = value;
        }

        for (const [key, value] of Object.entries(css.userProperties.toCSSProperties())) {
            properties[key] = value;
        }

        (this.framePool as FramePoolManager).setCSSProperties(properties);
    }

    resizeHandler() {
        // We check the parentElement cos we want to remove constraint from the container
        // and the container may not be the entire width of the document/window
        const parentEl = this.container.parentElement || document.documentElement;

        if (this.layout === EPUBLayout.fixed) {
            this.container.style.width = `${ parentEl.clientWidth - this._constraint }px`;
            (this.framePool as FXLFramePoolManager).resizeHandler();
        } else {
            // for reflow ReadiumCSS gets the width from columns + line-lengths 
            // but we need to check whether colCount has changed to commit new CSS
            const oldColCount = this._css.userProperties.colCount; 
            this._css.resizeHandler();
            if (
                this._css.userProperties.view === "paged" &&
                oldColCount !== this._css.userProperties.colCount
            ) {
                this.commitCSS(this._css);
            }
        }
    }

    get ownerWindow() {
        return this.container.ownerDocument.defaultView || window;
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
            case "text_selected":
                this.listeners.textSelected(data as BasicTextSelection);
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
                this.syncLocation(data as { progress: number, reference: number });
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

        if (this.layout === EPUBLayout.reflowable) {
            this.updateCSS();
        }
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

    private findLastPositionInProgressionRange(positions: Locator[], range: number[]): Locator | undefined {
        const match = positions.findLastIndex((p) => {
            const pr = p.locations.progression;
            if (pr && pr > Math.min(...range) && pr <= Math.max(...range)) {
                return true;
            } else {
                return false;
            }
        });
        return match !== -1 ? positions[match] : undefined;
    }

    private findNearestPositions(fromProgression: { progress: number, reference: number }):  { first: Locator, last: Locator | undefined } {
        // TODO replace with locator service
        const potentialPositions = this.positions.filter(
            (p) => p.href === this.currentLocation.href
        );
        let first = this.currentLocation;
        let last = undefined;

        // Find the last locator with a progression that's
        // smaller than or equal to the requested progression.
        potentialPositions.some((p, idx) => {
            const pr = p.locations.progression ?? 0;
            if (fromProgression.progress <= pr) {
                first = p;

                // If there’s a match, check the last in view, from the next progression
                const nextPositions = potentialPositions.splice(idx + 1, potentialPositions.length);
                const range = [fromProgression.progress, fromProgression.progress + fromProgression.reference];
                last = this.findLastPositionInProgressionRange(nextPositions, range);

                return true;
            }
            else return false;
        });
        return { first: first, last: last }
    }

    private async syncLocation(iframeProgress: { progress: number, reference: number }) {
        const nearestPositions = this.findNearestPositions(iframeProgress)
        this.currentLocation = nearestPositions.first.copyWithLocations({
            progression: iframeProgress.progress // Most accurate progression in resource
        });
        this.lastLocationInView = nearestPositions.last;
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

        return [this.currentLocator?.locations.position ?? 0, ...(this.lastLocationInView?.locations.position ? [this.lastLocationInView.locations.position] : [])];
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