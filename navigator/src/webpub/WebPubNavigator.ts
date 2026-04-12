import { Feature, Link, Locator, Publication, ReadingProgression, LocatorLocations } from "@readium/shared";
import { VisualNavigator, VisualNavigatorViewport, ProgressionRange } from "../Navigator.ts";
import { Configurable } from "../preferences/Configurable.ts";
import { WebPubFramePoolManager } from "./WebPubFramePoolManager.ts";
import { BasicTextSelection, CommsEventKey, ContextMenuEvent, FrameClickEvent, KeyboardEventData, ModuleLibrary, ModuleName, SuspiciousActivityEvent, WebPubModules } from "@readium/navigator-html-injectables";
import * as path from "path-browserify";
import { WebPubFrameManager } from "./WebPubFrameManager.ts";

import { ManagerEventKey } from "../epub/EpubNavigator.ts";
import { WebPubCSS } from "./css/WebPubCSS.ts";
import { WebUserProperties, WebRSProperties } from "./css/Properties.ts";
import { IWebPubPreferences, WebPubPreferences } from "./preferences/WebPubPreferences.ts";
import { IWebPubDefaults, WebPubDefaults } from "./preferences/WebPubDefaults.ts";
import { WebPubSettings } from "./preferences/WebPubSettings.ts";
import { IPreferencesEditor } from "../preferences/PreferencesEditor.ts";
import { WebPubPreferencesEditor } from "./preferences/WebPubPreferencesEditor.ts";
import { Injector } from "../injection/Injector.ts";
import { createReadiumWebPubRules } from "../injection/webpubInjectables.ts";
import { IInjectablesConfig } from "../injection/Injectable.ts";
import { IContentProtectionConfig, IKeyboardPeripheralsConfig } from "../Navigator.ts";
import { NavigatorProtector, NAVIGATOR_SUSPICIOUS_ACTIVITY_EVENT } from "../protection/NavigatorProtector.ts";
import { KeyboardPeripherals, NAVIGATOR_KEYBOARD_PERIPHERAL_EVENT } from "../peripherals/KeyboardPeripherals.ts";

export interface WebPubNavigatorConfiguration {
    preferences: IWebPubPreferences;
    defaults: IWebPubDefaults;
    injectables?: IInjectablesConfig;
    contentProtection?: IContentProtectionConfig;
    keyboardPeripherals?: IKeyboardPeripheralsConfig;
}

export interface WebPubNavigatorListeners {
    frameLoaded: (wnd: Window) => void;
    positionChanged: (locator: Locator) => void;
    tap: (e: FrameClickEvent) => boolean;
    click: (e: FrameClickEvent) => boolean;
    zoom: (scale: number) => void;
    scroll: (delta: number) => void;
    customEvent: (key: string, data: unknown) => void;
    handleLocator: (locator: Locator) => boolean;
    textSelected: (selection: BasicTextSelection) => void;
    contentProtection: (type: string, data: SuspiciousActivityEvent) => void;
    contextMenu: (data: ContextMenuEvent) => void;
    peripheral: (data: KeyboardEventData) => void;
}

const defaultListeners = (listeners: WebPubNavigatorListeners): WebPubNavigatorListeners => ({
    frameLoaded: listeners.frameLoaded || (() => {}),
    positionChanged: listeners.positionChanged || (() => {}),
    tap: listeners.tap || (() => false),
    click: listeners.click || (() => false),
    zoom: listeners.zoom || (() => {}),
    scroll: listeners.scroll || (() => {}),
    customEvent: listeners.customEvent || (() => {}),
    handleLocator: listeners.handleLocator || (() => false),
    textSelected: listeners.textSelected || (() => {}),
    contentProtection: listeners.contentProtection || (() => {}),
    contextMenu: listeners.contextMenu || (() => {}),
    peripheral: listeners.peripheral || (() => {})
})

export class WebPubNavigator extends VisualNavigator implements Configurable<WebPubSettings, WebPubPreferences> {
    private readonly pub: Publication;
    private readonly container: HTMLElement;
    private readonly listeners: WebPubNavigatorListeners;
    private framePool!: WebPubFramePoolManager;
    private currentIndex: number = 0;
    private currentLocation: Locator;

    private _preferences: WebPubPreferences;
    private _defaults: WebPubDefaults;
    private _settings: WebPubSettings;
    private _css: WebPubCSS;
    private _preferencesEditor: WebPubPreferencesEditor | null = null;
    private readonly _injector: Injector | null = null;
    private readonly _contentProtection: IContentProtectionConfig;
    private readonly _keyboardPeripherals: IKeyboardPeripheralsConfig;
    private readonly _navigatorProtector: NavigatorProtector | null = null;
    private readonly _keyboardPeripheralsManager: KeyboardPeripherals | null = null;
    private readonly _suspiciousActivityListener: ((event: Event) => void) | null = null;
    private readonly _keyboardPeripheralListener: ((event: Event) => void) | null = null;

    private webViewport: VisualNavigatorViewport = {
        readingOrder: [],
        progressions: new Map(),
        positions: null
    };

    constructor(container: HTMLElement, pub: Publication, listeners: WebPubNavigatorListeners, initialPosition: Locator | undefined = undefined, configuration: WebPubNavigatorConfiguration = { preferences: {}, defaults: {} }) {
        super();
        this.pub = pub;
        this.container = container;
        this.listeners = defaultListeners(listeners);

        // Initialize preference system
        this._preferences = new WebPubPreferences(configuration.preferences);
        this._defaults = new WebPubDefaults(configuration.defaults);
        this._settings = new WebPubSettings(this._preferences, this._defaults, this.hasDisplayTransformability);
        this._css = new WebPubCSS({
            rsProperties: new WebRSProperties({ experiments: this._settings.experiments || null }),
            userProperties: new WebUserProperties({ zoom: this._settings.zoom })
        });

        // Combine WebPub rules with user-provided injectables
        const webpubRules = createReadiumWebPubRules(pub.readingOrder.items);
        const userConfig = configuration.injectables || { rules: [], allowedDomains: [] };

        this._injector = new Injector({
            rules: [...webpubRules, ...userConfig.rules],
            allowedDomains: userConfig.allowedDomains
        });

        // Initialize content protection with provided config or default values
        this._contentProtection = configuration.contentProtection || {};

        // Merge keyboard peripherals
        this._keyboardPeripherals = this.mergeKeyboardPeripherals(
            this._contentProtection,
            configuration.keyboardPeripherals || []
        );

        // Initialize navigator protection if any protection is configured
        if (this._contentProtection.disableContextMenu ||
            this._contentProtection.checkAutomation ||
            this._contentProtection.checkIFrameEmbedding ||
            this._contentProtection.monitorDevTools ||
            this._contentProtection.protectPrinting?.disable) {
            this._navigatorProtector = new NavigatorProtector(this._contentProtection);

            // Listen for custom events from NavigatorProtector
            this._suspiciousActivityListener = (event: Event) => {
                const { type, ...activity } = (event as CustomEvent).detail;
                if (type === "context_menu") {
                    this.listeners.contextMenu(activity as ContextMenuEvent);
                } else {
                    this.listeners.contentProtection(type, activity);
                }
            };
            window.addEventListener(NAVIGATOR_SUSPICIOUS_ACTIVITY_EVENT, this._suspiciousActivityListener);
        }

        // Initialize keyboard peripherals separately (works independently of protection)
        if (this._keyboardPeripherals.length > 0) {
            this._keyboardPeripheralsManager = new KeyboardPeripherals({
                keyboardPeripherals: this._keyboardPeripherals
            });

            // Listen for keyboard peripheral events from main window
            this._keyboardPeripheralListener = (event: Event) => {
                const activity = (event as CustomEvent).detail;
                this.listeners.peripheral(activity);
            };
            window.addEventListener(NAVIGATOR_KEYBOARD_PERIPHERAL_EVENT, this._keyboardPeripheralListener);
        }

        // Initialize current location
        if (initialPosition && typeof initialPosition.copyWithLocations === "function") {
            this.currentLocation = initialPosition;
            // Update currentIndex to match the initial position
            const index = this.pub.readingOrder.findIndexWithHref(initialPosition.href);
            if (index >= 0) {
                this.currentIndex = index;
            }
        } else {
            this.currentLocation = this.createCurrentLocator();
        }
    }

    public async load() {
        await this.updateCSS(false);
        const cssProperties = this.compileCSSProperties(this._css);
        this.framePool = new WebPubFramePoolManager(
            this.container,
            cssProperties,
            this._injector,
            this._contentProtection,
            this._keyboardPeripherals
        );

        await this.apply();
    }

    // Configurable interface implementation
    public get settings(): Readonly<WebPubSettings> {
        return Object.freeze({ ...this._settings });
    }

    public get preferencesEditor(): IPreferencesEditor {
        if (this._preferencesEditor === null) {
            this._preferencesEditor = new WebPubPreferencesEditor(this._preferences, this.settings, this.pub.metadata);
        }
        return this._preferencesEditor;
    }

    public async submitPreferences(preferences: WebPubPreferences) {
        this._preferences = this._preferences.merging(preferences) as WebPubPreferences;
        await this.applyPreferences();
    }

    private async applyPreferences() {
        this._settings = new WebPubSettings(this._preferences, this._defaults, this.hasDisplayTransformability);

        if (this._preferencesEditor !== null) {
            this._preferencesEditor = new WebPubPreferencesEditor(this._preferences, this.settings, this.pub.metadata);
        }

        // Apply preferences using CSS system like EPUB
        await this.updateCSS(true);
    }

    private async updateCSS(commit: boolean) {
        this._css.update(this._settings);

        if (commit) await this.commitCSS(this._css);
    };

    private compileCSSProperties(css: WebPubCSS) {
        const properties: { [key: string]: string } = {};

        // Include RS properties (i.e. experiments)
        for (const [key, value] of Object.entries(css.rsProperties.toCSSProperties())) {
            properties[key] = value;
        }

        // Include user properties
        for (const [key, value] of Object.entries(css.userProperties.toCSSProperties())) {
            properties[key] = value;
        }

        return properties;
    }

    private async commitCSS(css: WebPubCSS) {
        const properties = this.compileCSSProperties(css);
        this.framePool.setCSSProperties(properties);
    }

    /**
     * Exposed to the public to compensate for lack of implemented readium conveniences
     * TODO remove when settings management is incorporated
     */
    public get _cframes(): (WebPubFrameManager | undefined)[] {
        return this.framePool.currentFrames;
    }

    private get hasDisplayTransformability(): boolean {
        return this.pub.metadata?.accessibility?.feature?.some(
            f => f.value === Feature.DISPLAY_TRANSFORMABILITY.value
        ) ?? false;
    }

    public eventListener(key: CommsEventKey | ManagerEventKey, data: unknown) {
        switch (key) {
            case "_pong":
                this.listeners.frameLoaded(this.framePool.currentFrames[0]!.iframe.contentWindow!);
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
                            origHref.startsWith("mailto:") ||
                            origHref.startsWith("tel:")
                        ) {
                            this.listeners.handleLocator(new Link({
                                href: origHref,
                            }).locator);
                        } else {
                            // Handle internal links that should navigate within the WebPub
                            // This includes relative links and full URLs that might be in the readingOrder
                            try {
                                let hrefToCheck;

                                // If origHref is already a full URL, use it directly
                                if (origHref.startsWith("http://") || origHref.startsWith("https://")) {
                                    hrefToCheck = origHref;
                                } else {
                                    // For relative URLs, use different strategies based on base URL format
                                    if (this.currentLocation.href.startsWith("http://") || this.currentLocation.href.startsWith("https://")) {
                                        // Base URL is absolute, use URL constructor
                                        const currentUrl = new URL(this.currentLocation.href);
                                        const resolvedUrl = new URL(origHref, currentUrl);
                                        hrefToCheck = resolvedUrl.href;
                                    } else {
                                        // Base URL is relative, use path operations
                                        hrefToCheck = path.join(path.dirname(this.currentLocation.href), origHref);
                                    }
                                }

                                const link = this.pub.readingOrder.findWithHref(hrefToCheck);
                                if (link) {
                                    this.goLink(link, false, () => { });
                                } else {
                                    console.warn(`Internal link not found in readingOrder: ${hrefToCheck}`);
                                    this.listeners.handleLocator(new Link({
                                        href: origHref,
                                    }).locator);
                                }
                            } catch (error) {
                                console.warn(`Couldn't resolve internal link for ${origHref}: ${error}`);
                                this.listeners.handleLocator(new Link({
                                    href: origHref,
                                }).locator);
                            }
                        }
                    } else console.log("Clicked on", element);
                } else {
                    const handled = key === "click" ? this.listeners.click(edata) : this.listeners.tap(edata);
                    if(handled) break;
                }
                break;
            case "scroll":
                this.listeners.scroll(data as number);
                break;
            case "zoom":
                this.listeners.zoom(data as number);
                break;
            case "progress":
                this.syncLocation(data as ProgressionRange);
                break;
            case "content_protection":
                const activity = data as SuspiciousActivityEvent;
                this.listeners.contentProtection(activity.type, activity);
                break;
            case "context_menu":
                this.listeners.contextMenu(data as ContextMenuEvent);
                break;
            case "keyboard_peripherals":
                this.listeners.peripheral(data as KeyboardEventData);
                break;
            case "log":
                console.log(this.framePool.currentFrames[0]?.source?.split("/")[3], ...(data as any[]));
                break;
            default:
                this.listeners.customEvent(key, data);
                break;
        }
    }

    private determineModules(): ModuleName[] {
        let modules = Array.from(ModuleLibrary.keys()) as ModuleName[];

        // For WebPub, use the predefined WebPubModules array and filter
        return modules.filter((m) => WebPubModules.includes(m));
    }

    private attachListener() {
        if (this.framePool.currentFrames[0]?.msg) {
            this.framePool.currentFrames[0].msg.listener = (key: CommsEventKey | ManagerEventKey, value: unknown) => {
                this.eventListener(key, value);
            };
        }
    }

    private async apply() {
        await this.framePool.update(this.pub, this.currentLocation, this.determineModules());

        this.attachListener();

        const idx = this.pub.readingOrder.findIndexWithHref(this.currentLocation.href);
        if (idx < 0)
            throw Error("Link for " + this.currentLocation.href + " not found!");
    }

    public async destroy() {
        if (this._suspiciousActivityListener) {
            window.removeEventListener(NAVIGATOR_SUSPICIOUS_ACTIVITY_EVENT, this._suspiciousActivityListener);
        }
        if (this._keyboardPeripheralListener) {
            window.removeEventListener(NAVIGATOR_KEYBOARD_PERIPHERAL_EVENT, this._keyboardPeripheralListener);
        }
        this._navigatorProtector?.destroy();
        this._keyboardPeripheralsManager?.destroy();
        await this.framePool?.destroy();
    }

    private async changeResource(relative: number): Promise<boolean> {
        if (relative === 0) return false;

        const curr = this.pub.readingOrder.findIndexWithHref(this.currentLocation.href);
        const i = Math.max(
            0,
            Math.min(this.pub.readingOrder.items.length - 1, curr + relative)
        );
        if (i === curr) {
            return false;
        }
        this.currentIndex = i;
        this.currentLocation = this.createCurrentLocator();
        await this.apply();
        return true;
    }

    private updateViewport(progression: ProgressionRange) {
        this.webViewport.readingOrder = [];
        this.webViewport.progressions.clear();
        this.webViewport.positions = null;

        // Use the current position's href
        if (this.currentLocation) {
            this.webViewport.readingOrder.push(this.currentLocation.href);
            this.webViewport.progressions.set(this.currentLocation.href, progression);

            if (this.currentLocation.locations?.position !== undefined) {
                this.webViewport.positions = [this.currentLocation.locations.position];
                // WebPub doesn't have lastLocationInView like EPUB, so no second position
            }
        }
    }

    private async syncLocation(iframeProgress: ProgressionRange): Promise<void> {
        const progression = iframeProgress;
        if (this.currentLocation) {
            this.currentLocation = this.currentLocation.copyWithLocations({
                progression: progression.start
            });
        }

        this.updateViewport(progression);
        this.listeners.positionChanged(this.currentLocation);
        await this.framePool.update(this.pub, this.currentLocation, this.determineModules());
    }

    goBackward(_animated: boolean, cb: (ok: boolean) => void): void {
        this.changeResource(-1).then((success) => {
            cb(success);
        });
    }

    goForward(_animated: boolean, cb: (ok: boolean) => void): void {
        this.changeResource(1).then((success) => {
            cb(success);
        });
    }

    get currentLocator(): Locator {
        return this.currentLocation;
    }

    get viewport(): VisualNavigatorViewport {
        return this.webViewport;
    }

    get isScrollStart(): boolean {
        const firstHref = this.viewport.readingOrder[0];
        const progression = this.viewport.progressions.get(firstHref);
        return progression?.start === 0;
    }

    get isScrollEnd(): boolean {
        const lastHref = this.viewport.readingOrder[this.viewport.readingOrder.length - 1];
        const progression = this.viewport.progressions.get(lastHref);
        return progression?.end === 1;
    }

    get canGoBackward(): boolean {
        const firstResource = this.pub.readingOrder.items[0]?.href;
        return !(this.viewport.progressions.has(firstResource) && this.viewport.progressions.get(firstResource)?.start === 0);
    }

    get canGoForward(): boolean {
        const lastResource = this.pub.readingOrder.items[this.pub.readingOrder.items.length - 1]?.href;
        return !(this.viewport.progressions.has(lastResource) && this.viewport.progressions.get(lastResource)?.end === 1);
    }

    get readingProgression(): ReadingProgression {
        return this.pub.metadata.effectiveReadingProgression;
    }

    get publication(): Publication {
        return this.pub;
    }

    private async loadLocator(locator: Locator, cb: (ok: boolean) => void) {
        let done = false;
        let cssSelector = (typeof locator.locations.getCssSelector === "function") && locator.locations.getCssSelector();
        if(locator.text?.highlight) {
            done = await new Promise<boolean>((res, _) => {
                // Attempt to go to a highlighted piece of text in the resource
                this.framePool.currentFrames[0]!.msg!.send(
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
                this.framePool.currentFrames[0]!.msg!.send(
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
        const hid = (typeof locator.locations.htmlId === "function") && locator.locations.htmlId();
        if(hid)
            done = await new Promise<boolean>((res, _) => {
                // Attempt to go to an HTML ID in the resource
                this.framePool.currentFrames[0]!.msg!.send("go_id", hid, (ok) => res(ok));
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
                this.framePool.currentFrames[0]!.msg!.send("go_progression", progression, (ok) => res(ok));
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

         // Update currentIndex to point to the found link
        const index = this.pub.readingOrder.findIndexWithHref(href);
        if (index >= 0) {
            this.currentIndex = index;
        }

        this.currentLocation = this.createCurrentLocator();
        this.apply().then(() => this.loadLocator(locator, (ok) => cb(ok))).then(() => {
            // Now that we've gone to the right locator, we can attach the listeners.
            // Doing this only at this stage reduces janky UI with multiple locator updates.
            this.attachListener();
        });
    }

    public goLink(link: Link, animated: boolean, cb: (ok: boolean) => void): void {
        return this.go(link.locator, animated, cb);
    }

    // Specifics to WebPub
    // Util method
    private createCurrentLocator(): Locator {
        const readingOrder = this.pub.readingOrder;
        const currentLink = readingOrder.items[this.currentIndex];

        if (!currentLink) {
            throw new Error("No current resource available");
        }

        // Check if we're on the same resource
        const isSameResource = this.currentLocation && this.currentLocation.href === currentLink.href;

        // Preserve progression if staying on same resource, otherwise start from beginning
        const progression = isSameResource && this.currentLocation.locations.progression
            ? this.currentLocation.locations.progression
            : 0;

        return this.pub.manifest.locatorFromLink(currentLink) || new Locator({
            href: currentLink.href,
            type: currentLink.type || "text/html",
            locations: new LocatorLocations({
                fragments: [],
                progression: progression,
                position: this.currentIndex + 1
            })
        });
    }
}

export const ExperimentalWebPubNavigator = WebPubNavigator;
