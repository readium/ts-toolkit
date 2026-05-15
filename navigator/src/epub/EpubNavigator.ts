import { Layout, Link, Locator, Profile, Publication, ReadingProgression } from "@readium/shared";
import { Configurable, ConfigurableSettings, LineLengths, ProgressionRange, VisualNavigator, VisualNavigatorViewport } from "../index.ts";
import { FramePoolManager } from "./frame/FramePoolManager.ts";
import { FXLFramePoolManager } from "./fxl/FXLFramePoolManager.ts";
import { CommsEventKey, ContextMenuEvent, FXLModules, ModuleLibrary, ModuleName, ReflowableModules, BasicTextSelection, FrameClickEvent, SuspiciousActivityEvent, KeyboardPeripheralEvent } from "@readium/navigator-html-injectables";
import * as path from "path-browserify";
import { FXLFrameManager } from "./fxl/FXLFrameManager.ts";
import { FrameManager } from "./frame/FrameManager.ts";
import { IEpubPreferences, EpubPreferences } from "./preferences/EpubPreferences.ts";
import { IEpubDefaults, EpubDefaults } from "./preferences/EpubDefaults.ts";
import { EpubSettings } from "./preferences/index.ts";
import { EpubPreferencesEditor } from "./preferences/EpubPreferencesEditor.ts";
import { ReadiumCSS } from "./css/ReadiumCSS.ts";
import { RSProperties, UserProperties } from "./css/Properties.ts";
import { getContentWidth } from "../helpers/dimensions.ts";
import { Injector } from "../injection/Injector.ts";
import { createReadiumEpubRules } from "../injection/epubInjectables.ts";
import { IInjectableRule, IInjectablesConfig } from "../injection/Injectable.ts";
import { IContentProtectionConfig, IKeyboardPeripheralsConfig, KeyboardPeripheralEventData } from "../Navigator.ts";
import { NavigatorProtector, NAVIGATOR_SUSPICIOUS_ACTIVITY_EVENT } from "../protection/NavigatorProtector.ts";
import { KeyboardPeripherals, NAVIGATOR_KEYBOARD_PERIPHERAL_EVENT } from "../peripherals/KeyboardPeripherals.ts";
import { getScriptMode } from "../helpers/scriptMode.ts";

export type ManagerEventKey = "zoom";

export interface EpubNavigatorConfiguration {
    preferences: IEpubPreferences;
    defaults: IEpubDefaults;
    injectables?: IInjectablesConfig;
    contentProtection?: IContentProtectionConfig;
    keyboardPeripherals?: IKeyboardPeripheralsConfig;
}

export interface EpubNavigatorListeners {
    frameLoaded: (wnd: Window) => void;
    positionChanged: (locator: Locator) => void;
    tap: (e: FrameClickEvent) => boolean; // Return true to prevent handling here
    click: (e: FrameClickEvent) => boolean;  // Return true to prevent handling here
    zoom: (scale: number) => void;
    miscPointer: (amount: number) => void;
    scroll: (delta: number) => void;
    customEvent: (key: string, data: unknown) => void;
    handleLocator: (locator: Locator) => boolean; // Return true to prevent handling here
    textSelected: (selection: BasicTextSelection) => void;
    contentProtection: (type: string, data: SuspiciousActivityEvent) => void;
    contextMenu: (data: ContextMenuEvent) => void;
    peripheral: (data: KeyboardPeripheralEventData) => void;
    // showToc: () => void;
}

const defaultListeners = (listeners: EpubNavigatorListeners): EpubNavigatorListeners => ({
    frameLoaded: listeners.frameLoaded || (() => {}),
    positionChanged: listeners.positionChanged || (() => {}),
    tap: listeners.tap || (() => false),
    click: listeners.click || (() => false),
    zoom: listeners.zoom || (() => {}),
    miscPointer: listeners.miscPointer || (() => {}),
    scroll: listeners.scroll || (() => {}),
    customEvent: listeners.customEvent || (() => {}),
    handleLocator: listeners.handleLocator || (() => false),
    textSelected: listeners.textSelected || (() => {}),
    contentProtection: listeners.contentProtection || (() => {}),
    contextMenu: listeners.contextMenu || (() => {}),
    peripheral: listeners.peripheral || (() => {}),
})

export class EpubNavigator extends VisualNavigator implements Configurable<ConfigurableSettings, EpubPreferences> {
    private readonly pub: Publication;
    private readonly container: HTMLElement;
    private readonly listeners: EpubNavigatorListeners;
    private framePool!: FramePoolManager | FXLFramePoolManager;
    private positions!: Locator[];
    private currentLocation!: Locator;
    private lastLocationInView: Locator | undefined;
    private currentProgression: ReadingProgression;
    private _layout: Layout;

    private _preferences: EpubPreferences;
    private _defaults: EpubDefaults;
    private _settings: EpubSettings;
    private _css: ReadiumCSS;
    private _preferencesEditor: EpubPreferencesEditor | null = null;
    private _injector: Injector | null = null;
    private readonly _readiumRulesPromise: Promise<IInjectableRule[]>;
    private readonly _injectablesConfig: IInjectablesConfig;
    private readonly _contentProtection: IContentProtectionConfig;
    private readonly _keyboardPeripherals: IKeyboardPeripheralsConfig;
    private readonly _navigatorProtector: NavigatorProtector | null = null;
    private readonly _keyboardPeripheralsManager: KeyboardPeripherals | null = null;
    private readonly _suspiciousActivityListener: ((event: Event) => void) | null = null;
    private readonly _keyboardPeripheralListener: ((event: Event) => void) | null = null;

    private resizeObserver: ResizeObserver;

    private reflowViewport: VisualNavigatorViewport = {
        readingOrder: [],
        progressions: new Map(),
        positions: null
    };

    constructor(container: HTMLElement, pub: Publication, listeners: EpubNavigatorListeners, positions: Locator[] = [], initialPosition: Locator | undefined = undefined, configuration: EpubNavigatorConfiguration = { preferences: {}, defaults: {} }) {
        super();
        this.pub = pub;
        this.container = container;
        this.listeners = defaultListeners(listeners);
        this.currentLocation = initialPosition!;
        if (positions.length)
            this.positions = positions;

        this._preferences = new EpubPreferences(configuration.preferences);
        this._defaults = new EpubDefaults(configuration.defaults);
        this._settings = new EpubSettings(this._preferences, this._defaults);
        // For CJK vertical, force --RS__disablePagination for the entire session.
        // ReadiumCSS.update() never sets noVerticalPagination, so this persists.
        const scriptMode = getScriptMode(pub.metadata);
        const isCJKHorizontal = scriptMode === 'cjk-horizontal';
        const isCJKVertical = scriptMode === 'cjk-vertical';
        const isMongolianVertical = scriptMode === 'mongolian-vertical';
        const isVertical = isCJKVertical || isMongolianVertical;
        const isCJK = isCJKHorizontal || isCJKVertical;
        this._css = new ReadiumCSS({
            rsProperties: new RSProperties({ noVerticalPagination: isVertical || undefined }),
            userProperties: new UserProperties({}),
            lineLengths: new LineLengths({
                optimalChars: this._settings.optimalLineLength,
                minChars: this._settings.minimalLineLength,
                maxChars: this._settings.maximalLineLength,
                padding: this._settings.scroll
                    ? (this._settings.scrollPaddingLeft || 0) + (this._settings.scrollPaddingRight || 0)
                    : (this._settings.pageGutter || 0) * 2,
                fontFace: this._settings.fontFamily,
                letterSpacing: this._settings.letterSpacing,
                wordSpacing: this._settings.wordSpacing,
                isCJK: isCJK,
            //    sample: this.pub.metadata.description
            }),
            container: container,
            constraint: this._settings.constraint,
            isCJKVertical: isVertical
        });

        this._layout = EpubNavigator.determineLayout(pub, !!this._settings.scroll);
        this.currentProgression = pub.metadata.effectiveReadingProgression;

        // Store user injectables config; Injector is created in load() once
        // the async CSS rules promise has resolved.
        this._injectablesConfig = configuration.injectables || { rules: [], allowedDomains: [] };
        // Start loading Readium CSS rules asynchronously. The promise is
        // awaited in load() before the Injector is created, ensuring the
        // correct script-mode stylesheets are ready before the first frame.
        this._readiumRulesPromise = createReadiumEpubRules(pub.metadata, pub.readingOrder.items);

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

        // We use a resizeObserver cos’ the container parent may not be the width of
        // the document/window e.g. app using a docking system with left and right panels.
        // If we observe this.container, that won’t obviously work since we set its width.
        this.resizeObserver = new ResizeObserver(() => this.ownerWindow.requestAnimationFrame(async () => await this.resizeHandler()));
        this.resizeObserver.observe(this.container.parentElement || document.documentElement);
    }

    public static determineLayout(pub: Publication, scroll?: boolean): Layout {
        const layout = pub.metadata.effectiveLayout;
        if(layout === Layout.fixed) return Layout.fixed;
        if(pub.metadata.otherMetadata && ("http://openmangaformat.org/schema/1.0#version" in pub.metadata.otherMetadata))
            return Layout.fixed; // It's fixed layout even though it lacks layout, although this should really be a divina
        if(pub.metadata?.conformsTo?.includes(Profile.DIVINA))
            // TODO: this is temporary until there's a divina reader in place
            return Layout.fixed;
        // TODO other logic to detect fixed layout publications

        if (layout === Layout.scrolled)
            return Layout.scrolled;

        // CJK/Mongolian vertical writing: force scroll mode so the
        // CJKVerticalSnapper is used and column-based pagination doesn't interfere.
        const sm = getScriptMode(pub.metadata);
        if (sm === 'cjk-vertical' || sm === 'mongolian-vertical')
            return Layout.scrolled;

        if (layout === Layout.reflowable && scroll)
            return Layout.scrolled;

        return Layout.reflowable;
    }

    public async load() {
        if (!this.positions?.length)
            this.positions = await this.pub.positionsFromManifest();

        // Build Injector now that async CSS loading has had time to resolve.
        // (Started in the constructor, so this typically resolves immediately.)
        if (!this._injector) {
            const readiumRules = await this._readiumRulesPromise;
            this._injector = new Injector({
                rules: [...readiumRules, ...this._injectablesConfig.rules],
                allowedDomains: this._injectablesConfig.allowedDomains
            });
        }

        if(this._layout === Layout.fixed) {
            this.framePool = new FXLFramePoolManager(
                this.container,
                this.positions,
                this.pub,
                this._injector,
                this._contentProtection,
                this._keyboardPeripherals
            );
            this.framePool.listener = (key: CommsEventKey | ManagerEventKey, data: unknown) => {
                this.eventListener(key, data);
            }
        } else {
            await this.updateCSS(false);
            const cssProperties = this.compileCSSProperties(this._css);
            this.framePool = new FramePoolManager(
                this.container,
                this.positions,
                cssProperties,
                this._injector,
                this._contentProtection,
                this._keyboardPeripherals
            );
        }

        if(this.currentLocation === undefined)
            this.currentLocation = this.positions[0];

        await this.resizeHandler();
        await this.apply();
    }

    public get settings(): Readonly<EpubSettings> {
        if (this._layout === Layout.fixed) {
            return Object.freeze({ ...this._settings });
        } else {
            // Given all the nasty issues moving auto-pagination to EpubSettings creates
            // Especially as it’s tied to ReadiumCSS in the first place and could be
            // problematic if you intend to use something else,
            // we return the properties with columnCount overridden
            const columnCount = this._css.userProperties.colCount || this._css.rsProperties.colCount || this._settings.columnCount;
            return Object.freeze({ ...this._settings, columnCount: columnCount });
        }
    }

    public get preferencesEditor() {
        if (this._preferencesEditor === null) {
            // Note: we pass this.settings instead of this._settings to ensure the columnCount is correct
            this._preferencesEditor = new EpubPreferencesEditor(this._preferences, this.settings, this.pub.metadata);
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
            // Note: we pass this.settings instead of this._settings to ensure the columnCount is correct
            this._preferencesEditor = new EpubPreferencesEditor(this._preferences, this.settings, this.pub.metadata);
        }

        if (this._layout === Layout.fixed) {
            this.handleFXLPrefs(oldSettings, this._settings);
        } else {
            await this.updateCSS(true);
        }
    }

    // TODO: fit, etc.
    private handleFXLPrefs(from: EpubSettings, to: EpubSettings) {
        if (from.columnCount !== to.columnCount) {
            (this.framePool as FXLFramePoolManager).setPerPage(to.columnCount);
        }
    }

    private async updateCSS(commit: boolean) {
        this._css.update(this._settings);

        if (commit) await this.commitCSS(this._css);
    };

    private compileCSSProperties(css: ReadiumCSS) {
        const properties: { [key: string]: string } = {};

        for (const [key, value] of Object.entries(css.rsProperties.toCSSProperties())) {
            properties[key] = value;
        }

        for (const [key, value] of Object.entries(css.userProperties.toCSSProperties())) {
            properties[key] = value;
        }

        return properties;
    }

    private async commitCSS(css: ReadiumCSS) {
        // framePool is only available after load() — guard against early calls
        // from the ResizeObserver which is registered in the constructor.
        if (!this.framePool) return;

        // Since we’re updating the CSS properties in injectables by removing
        // the existing properties that are not inside this object first,
        // then adding all from it, we don’t compare the previous properties here
        const properties = this.compileCSSProperties(css);

        (this.framePool as FramePoolManager).setCSSProperties(properties);

        if (
            this._css.userProperties.view === "paged" &&
            this._layout === Layout.scrolled
        ) {
            await this.setLayout(Layout.reflowable);
        } else if (
            this._css.userProperties.view === "scroll" &&
            (this._layout === Layout.reflowable)
        ) {
            await this.setLayout(Layout.scrolled);
        }

        this._css.setContainerWidth();
    }

    async resizeHandler() {
        // We check the parentElement cos we want to remove constraint from the container
        // and the container may not be the entire width of the document/window
        const parentEl = this.container.parentElement || document.documentElement;

        if (this._layout === Layout.fixed) {
            this.container.style.width = `${ getContentWidth(parentEl) - this._settings.constraint }px`;
            if (!this.framePool) return;
            (this.framePool as FXLFramePoolManager).resizeHandler();
        } else {
            // for reflow ReadiumCSS gets the width from columns + line-lengths
            // but we need to check whether colCount has changed to commit new CSS
            const oldColCount = this._css.userProperties.colCount;
            const oldLineLength = this._css.userProperties.lineLength;
            this._css.resizeHandler();
            if (
                this._css.userProperties.view !== "scroll" &&
                oldColCount !== this._css.userProperties.colCount ||
                oldLineLength !== this._css.userProperties.lineLength
            ) {
                await this.commitCSS(this._css);
            }
        }
    }

    get layout() {
        return this._layout;
    }

    get ownerWindow() {
        return this.container.ownerDocument.defaultView || window;
    }

    /**
     * Exposed to the public to compensate for lack of implemented readium conveniences
     * TODO remove when settings management is incorporated
     */
    public get _cframes(): (FXLFrameManager | FrameManager | undefined)[] {
        return (this.framePool?.currentFrames ?? []).filter(f => !(f instanceof FrameManager && f.isDestroyed));
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
                    if(this._layout === Layout.fixed && (this.framePool as FXLFramePoolManager).doNotDisturb)
                        edata.doNotDisturb = true;

                    if(this._layout === Layout.fixed
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
                const event = data as KeyboardPeripheralEvent;
                const parsedEvent: KeyboardPeripheralEventData = { ...event, interactiveElement: undefined };
                if (event.interactiveElement) {
                    parsedEvent.interactiveElement = new DOMParser().parseFromString(
                        event.interactiveElement,
                        "text/html"
                    ).body.children[0] as Element;
                }
                this.listeners.peripheral(parsedEvent);
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

        if(this._layout === Layout.fixed) {
            return modules.filter((m) => FXLModules.includes(m));
        } else modules = modules.filter((m) => ReflowableModules.includes(m));
        
        // CJK/Mongolian vertical: uses the X-axis snapper, never column or scroll snappers
        const mode = getScriptMode(this.pub.metadata);
        if (mode === 'cjk-vertical' || mode === 'mongolian-vertical') {
            return modules.filter((m) => m !== "column_snapper" && m !== "scroll_snapper");
        }

        // Horizontal vs. Vertical reading
        const all = modules as ModuleName[];
        if (this._layout === Layout.scrolled)
            modules = all.filter((m) => m !== "column_snapper" && m !== "cjk_vertical_snapper");
        else
            modules = all.filter((m) => m !== "scroll_snapper" && m !== "cjk_vertical_snapper");

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

        if(this._layout === Layout.fixed) {
            const p = this.framePool as FXLFramePoolManager;
            const old = p.viewport.positions![0];
            if(relative === 1) {
                if(!p.next(p.perPage)) return false;
            } else if(relative === -1) {
                if(!p.prev(p.perPage)) return false;
            } else
                throw Error("Invalid relative value for FXL");

            // Apply change
            const neW = p.viewport.positions![0]
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
            // On the initial forward walk each fresh iframe load fires
            // positionChanged via _pong; on back-then-forward to an
            // already-loaded frame no _pong fires, so dispatch explicitly here.
            // Redux dedupes the duplicate on the forward case.
            this.listeners.positionChanged(this.currentLocation);
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

    private findLastPositionInProgressionRange(positions: Locator[], range: ProgressionRange): Locator | undefined {
        const match = positions.findLastIndex((p) => {
            const pr = p.locations.progression;
            if (pr && pr > range.start && pr <= range.end) {
                return true;
            } else {
                return false;
            }
        });
        return match !== -1 ? positions[match] : undefined;
    }

    private findNearestPositions(fromProgression: ProgressionRange):  { first: Locator, last: Locator | undefined } {
        // TODO replace with locator service
        const potentialPositions = this.positions.filter(
            (p) => p.href === this.currentLocation.href
        );
        let first = this.currentLocation;
        let last = undefined;

        // Find the last locator whose progression is <= fromProgression.start.
        // potentialPositions is ordered by progression ascending (0 → 1).
        const idx = potentialPositions.findLastIndex((p) => {
            const pr = p.locations.progression ?? 0;
            return pr <= fromProgression.start;
        });

        if (idx !== -1) {
            first = potentialPositions[idx];
            const nextPositions = potentialPositions.slice(idx + 1);
            last = this.findLastPositionInProgressionRange(nextPositions, fromProgression);
        }

        return { first: first, last: last }
    }

    private updateViewport(progression: ProgressionRange) {
        this.reflowViewport.readingOrder = [];
        this.reflowViewport.progressions.clear();
        this.reflowViewport.positions = null;

        // Use the current position's href
        if (this.currentLocation) {
            this.reflowViewport.readingOrder.push(this.currentLocation.href);
            this.reflowViewport.progressions.set(this.currentLocation.href, progression);

            if (this.currentLocation.locations?.position !== undefined) {
                this.reflowViewport.positions = [this.currentLocation.locations.position];
                if (this.lastLocationInView?.locations?.position !== undefined) {
                    this.reflowViewport.positions.push(this.lastLocationInView.locations.position);
                }
            }
        }
    }

    private async syncLocation(iframeProgress: ProgressionRange) {
        const progression = iframeProgress;

        const nearestPositions = this.findNearestPositions(progression);

        this.currentLocation = nearestPositions.first.copyWithLocations({
            progression: progression.start
        });

        this.lastLocationInView = nearestPositions.last;
        this.updateViewport(progression);
        this.listeners.positionChanged(this.currentLocation);
        await this.framePool.update(this.pub, this.currentLocation, this.determineModules());
    }

    public goBackward(_: boolean, cb: (ok: boolean) => void): void {
        if(this._layout === Layout.fixed) {
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
        if(this._layout === Layout.fixed) {
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

    get viewport(): VisualNavigatorViewport {
        if (this._layout === Layout.fixed) {
            if (!this.framePool) return { readingOrder: [], progressions: new Map(), positions: null };
            return (this.framePool as FXLFramePoolManager).viewport;
        }
        return this.reflowViewport;
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

    // TODO: This is temporary until user settings are implemented.
    get readingProgression(): ReadingProgression {
        return this.currentProgression;
    }

    private async setLayout(layout: Layout) {
        if (this._layout === layout) return;
        this._layout = layout;
        await this.framePool.update(this.pub, this.currentLocator, this.determineModules(), true);
        this.attachListener();
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
        const hid = (typeof locator.locations.htmlId === "function") && locator.locations.htmlId();
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
