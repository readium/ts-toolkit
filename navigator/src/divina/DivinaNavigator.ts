import { Layout, Link, Locator, Publication, ReadingProgression } from "@readium/shared";
import {
    ContextMenuEvent,
    FrameClickEvent,
    SuspiciousActivityEvent
} from "@readium/navigator-html-injectables";

import {
    IContentProtectionConfig,
    IKeyboardPeripheralsConfig,
    KeyboardPeripheralEventData,
    VisualNavigator,
    VisualNavigatorViewport
} from "../Navigator.ts";
import { Configurable, ConfigurableSettings } from "../preferences/Configurable.ts";
import { getContentWidth } from "../helpers/dimensions.ts";
import { NAVIGATOR_SUSPICIOUS_ACTIVITY_EVENT } from "../protection/NavigatorProtector.ts";
import { KeyboardPeripherals, NAVIGATOR_KEYBOARD_PERIPHERAL_EVENT } from "../peripherals/KeyboardPeripherals.ts";
import { KeyboardConditionBridge } from "../peripherals/KeyboardConditionBridge.ts";

import { DivinaSpreader } from "./DivinaSpreader.ts";
import { DivinaPageManager } from "./DivinaPageManager.ts";
import { DivinaPagedPresenter } from "./DivinaPagedPresenter.ts";
import { DivinaScrolledPresenter } from "./DivinaScrolledPresenter.ts";
import { DivinaPointerEvent } from "./DivinaPeripherals.ts";
import { isTypedOMSupported } from "../epub/fxl/FXLPeripherals.ts";
import { DivinaNavigatorProtector } from "./protection/DivinaNavigatorProtector.ts";
import { DivinaDefaults, IDivinaDefaults } from "./preferences/DivinaDefaults.ts";
import { DivinaPreferences, IDivinaPreferences } from "./preferences/DivinaPreferences.ts";
import { DivinaSettings } from "./preferences/DivinaSettings.ts";
import { DivinaPreferencesEditor } from "./preferences/DivinaPreferencesEditor.ts";

export interface DivinaNavigatorConfiguration {
    preferences: IDivinaPreferences;
    defaults: IDivinaDefaults;
    contentProtection?: IContentProtectionConfig;
    keyboardPeripherals?: IKeyboardPeripheralsConfig;
}

export interface DivinaNavigatorListeners {
    positionChanged: (locator: Locator) => void;
    tap: (e: FrameClickEvent) => boolean; // Return true to prevent handling here
    click: (e: FrameClickEvent) => boolean; // Return true to prevent handling here
    zoom: (scale: number) => void;
    miscPointer: (amount: number) => void;
    scroll: (delta: number) => void;
    customEvent: (key: string, data: unknown) => void;
    handleLocator: (locator: Locator) => boolean; // Return true to prevent handling here
    contentProtection: (type: string, data: SuspiciousActivityEvent) => void;
    contextMenu: (data: ContextMenuEvent) => void;
    peripheral: (data: KeyboardPeripheralEventData) => void;
}

const defaultListeners = (listeners: Partial<DivinaNavigatorListeners>): DivinaNavigatorListeners => ({
    positionChanged: listeners.positionChanged || (() => {}),
    tap: listeners.tap || (() => false),
    click: listeners.click || (() => false),
    zoom: listeners.zoom || (() => {}),
    miscPointer: listeners.miscPointer || (() => {}),
    scroll: listeners.scroll || (() => {}),
    customEvent: listeners.customEvent || (() => {}),
    handleLocator: listeners.handleLocator || (() => false),
    contentProtection: listeners.contentProtection || (() => {}),
    contextMenu: listeners.contextMenu || (() => {}),
    peripheral: listeners.peripheral || (() => {}),
});

/**
 * Navigator for Divina (visual narrative) publications: bitmap pages rendered
 * as <img> elements with blob sources, in either a horizontal paged view with
 * synthetic spreads (comics/manga) or a continuous vertical scroll (webtoons).
 */
export class DivinaNavigator extends VisualNavigator implements Configurable<ConfigurableSettings, DivinaPreferences> {
    private readonly pub: Publication;
    private readonly container: HTMLElement;
    private readonly listeners: DivinaNavigatorListeners;
    private positions!: Locator[];
    private currentLocation!: Locator;
    private _destroyed = false;
    private _isNavigating = false;

    private _preferences: DivinaPreferences;
    private _defaults: DivinaDefaults;
    private _settings: DivinaSettings;
    private _preferencesEditor: DivinaPreferencesEditor | null = null;

    private readonly spreader: DivinaSpreader;
    private readonly pool: Map<number, DivinaPageManager> = new Map();
    private pagedPresenter: DivinaPagedPresenter | null = null;
    private scrolledPresenter: DivinaScrolledPresenter | null = null;

    private readonly _contentProtection: IContentProtectionConfig;
    private readonly _keyboardPeripherals: IKeyboardPeripheralsConfig;
    private readonly _navigatorProtector: DivinaNavigatorProtector | null = null;
    private _keyboardPeripheralsManager: KeyboardPeripherals | null = null;
    private readonly _keyboardConditionBridge: KeyboardConditionBridge | null = null;
    private readonly _suspiciousActivityListener: ((event: Event) => void) | null = null;
    private readonly _keyboardPeripheralListener: ((event: Event) => void) | null = null;

    private resizeObserver: ResizeObserver;

    constructor(
        container: HTMLElement,
        pub: Publication,
        listeners: Partial<DivinaNavigatorListeners>,
        positions: Locator[] = [],
        initialPosition: Locator | undefined = undefined,
        configuration: DivinaNavigatorConfiguration = { preferences: {}, defaults: {} }
    ) {
        super();
        this.pub = pub;
        this.container = container;
        this.listeners = defaultListeners(listeners);
        this.currentLocation = initialPosition!;
        if (positions.length)
            this.positions = positions;

        this._preferences = new DivinaPreferences(configuration.preferences);
        this._defaults = new DivinaDefaults(configuration.defaults);
        this._settings = new DivinaSettings(this._preferences, this._defaults, this.manifestScrolled);

        this.spreader = new DivinaSpreader(pub);

        this._contentProtection = configuration.contentProtection || {};
        this._keyboardPeripherals = this.mergeKeyboardPeripherals(
            this._contentProtection,
            configuration.keyboardPeripherals || []
        );

        // Initialize navigator protection if any protection is configured.
        // Unlike the iframe-based navigators, copy and drag-and-drop protection
        // also runs host-side here, since the content is in the host DOM.
        if (this._contentProtection.disableContextMenu ||
            this._contentProtection.checkAutomation ||
            this._contentProtection.checkIFrameEmbedding ||
            this._contentProtection.monitorDevTools ||
            this._contentProtection.protectPrinting?.disable ||
            this._contentProtection.disableDragAndDrop ||
            this._contentProtection.protectCopy) {
            this._navigatorProtector = new DivinaNavigatorProtector(this._contentProtection);

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

        // Initialize keyboard peripherals separately (works independently of protection).
        // Unlike the iframe-based navigators (whose frame managers bridge conditions
        // into the injected modules), divina handles keys host-side, so observable
        // conditions are resolved here by rebuilding the manager on change.
        if (this._keyboardPeripherals.length > 0) {
            this._keyboardConditionBridge = new KeyboardConditionBridge(
                this._keyboardPeripherals,
                (serializable) => {
                    this._keyboardPeripheralsManager?.destroy();
                    this._keyboardPeripheralsManager = serializable.length > 0
                        ? new KeyboardPeripherals({ keyboardPeripherals: serializable })
                        : null;
                }
            );
            this._keyboardConditionBridge.setup();

            this._keyboardPeripheralListener = (event: Event) => {
                const activity = (event as CustomEvent).detail;
                this.listeners.peripheral(activity);
            };
            window.addEventListener(NAVIGATOR_KEYBOARD_PERIPHERAL_EVENT, this._keyboardPeripheralListener);
        }

        // Observe the container's parent, since we set the container's own width
        this.resizeObserver = new ResizeObserver(() => this.ownerWindow.requestAnimationFrame(() => this.resizeHandler()));
        this.resizeObserver.observe(this.container.parentElement || document.documentElement);
    }

    private get manifestScrolled(): boolean {
        return this.pub.metadata.effectiveLayout === Layout.scrolled;
    }

    get ownerWindow(): Window {
        return this.container.ownerDocument.defaultView || window;
    }

    get publication(): Publication {
        return this.pub;
    }

    get layout(): Layout {
        return this._settings.scrolled ? Layout.scrolled : Layout.fixed;
    }

    get readingProgression(): ReadingProgression {
        return this.pub.metadata.effectiveReadingProgression;
    }

    private get presenter(): DivinaPagedPresenter | DivinaScrolledPresenter | null {
        return this.pagedPresenter ?? this.scrolledPresenter;
    }

    public async load() {
        if (!this.positions?.length)
            this.positions = await this.pub.positionsFromManifest();
        if (this._destroyed) return;
        if (!this.positions?.length)
            this.positions = this.synthesizePositions();

        // Build the page pool
        const fetchBlob = async (link: Link, signal?: AbortSignal): Promise<Blob> => {
            const bytes = await this.pub.get(link).read(undefined, { signal });
            if(!bytes) throw new Error(`Empty resource: ${link.href}`);
            return new Blob([bytes as BlobPart], { type: link.mediaType.string });
        };
        const getQuality = () => this._settings.quality;
        this.spreader.pages.forEach((page) => {
            this.pool.set(page.index, new DivinaPageManager(page, fetchBlob, getQuality));
        });

        this.applyBackground();
        this.createPresenter();
        if (this._destroyed) return;
        this.resizeHandler();

        if(this.currentLocation === undefined)
            this.currentLocation = this.positions[0];
        else
            this.currentLocation = this.completeLocator(this.currentLocation);

        return new Promise<boolean>(res => {
            if (this._destroyed) return res(false);
            this.go(this.currentLocation, false, (ok) => res(ok));
        });
    }

    private synthesizePositions(): Locator[] {
        const n = this.pub.readingOrder.items.length;
        return this.pub.readingOrder.items.map((link, i) => link.locator.copyWithLocations({
            progression: 0,
            position: i + 1,
            totalProgression: n > 0 ? i / n : 0
        }));
    }

    private createPresenter() {
        if(this._settings.scrolled) {
            this.scrolledPresenter = new DivinaScrolledPresenter(
                this.container, this.spreader, this.pool, this._settings.stripWidth
            );
            this.scrolledPresenter.listener = (key, data) => {
                switch (key) {
                    case "scroll":
                        this.listeners.scroll(data as number);
                        break;
                    case "position":
                        this.updateLocationFromScroll(data as number);
                        break;
                    case "tap":
                    case "click":
                        this.handlePointer(key, data as DivinaPointerEvent);
                        break;
                }
            };
        } else {
            this.pagedPresenter = new DivinaPagedPresenter(
                this.container, this.pub, this.spreader, this.pool, this._settings.spreads
            );
            this.pagedPresenter.listener = (key, data) => {
                switch (key) {
                    case "no_more":
                        this.changeSpread(1);
                        break;
                    case "no_less":
                        this.changeSpread(-1);
                        break;
                    case "zoom":
                        this.listeners.zoom(data as number);
                        break;
                    case "tap":
                    case "click":
                        this.handlePointer(key, data as DivinaPointerEvent);
                        break;
                }
            };
        }
    }

    private async destroyPresenter() {
        if(this.pagedPresenter) {
            await this.pagedPresenter.destroy();
            this.pagedPresenter = null;
        }
        if(this.scrolledPresenter) {
            await this.scrolledPresenter.destroy();
            this.scrolledPresenter = null;
        }
    }

    private handlePointer(key: "tap" | "click", e: DivinaPointerEvent) {
        const edata: FrameClickEvent = {
            defaultPrevented: false,
            doNotDisturb: e.doNotDisturb,
            interactiveElement: undefined,
            cssSelector: undefined,
            targetElement: "",
            targetFrameSrc: "",
            x: e.x,
            y: e.y
        };
        const handled = key === "click" ? this.listeners.click(edata) : this.listeners.tap(edata);
        if(handled || e.doNotDisturb) return;

        const dpr = window.devicePixelRatio || 1;
        if(this._settings.scrolled) {
            // Vertical zones: top quarter goes back, bottom quarter advances
            const oneQuarter = (this.container.clientHeight * dpr) / 4;
            if (e.y >= oneQuarter && e.y <= oneQuarter * 3) this.listeners.miscPointer(1);
            else if (e.y < oneQuarter) this.goBackward(true, () => {});
            else this.goForward(true, () => {});
        } else {
            // Horizontal zones: quarter edges flip pages, middle is UI
            const oneQuarter = (this.container.clientWidth * dpr) / 4;
            if (e.x >= oneQuarter && e.x <= oneQuarter * 3) this.listeners.miscPointer(1);
            else if (e.x < oneQuarter) this.goLeft(false, () => {});
            else this.goRight(false, () => {});
        }
    }

    /** Paged mode: move by one spread and report the new position */
    private changeSpread(relative: number): boolean {
        const p = this.pagedPresenter;
        if(!p) return false;
        const moved = relative > 0 ? p.next() : p.prev();
        if(!moved) return false;
        this.setLocationToIndex(p.currentIndex);
        p.update();
        this.listeners.positionChanged(this.currentLocation);
        return true;
    }

    private setLocationToIndex(index: number) {
        const link = this.pub.readingOrder.items[index];
        if(!link) return;
        const match = this.positions.find(pos => pos.href === link.href);
        this.currentLocation = match ?? this.synthesizePositions()[index];
    }

    /** Scrolled mode: debounced position reports from the scroll handler */
    private updateLocationFromScroll(index: number) {
        const p = this.scrolledPresenter;
        if(!p) return;
        this.setLocationToIndex(index);
        const n = this.pub.readingOrder.items.length;
        const progression = p.currentPageProgression;
        this.currentLocation = this.currentLocation.copyWithLocations({
            progression,
            totalProgression: n > 0 ? Math.min((index + progression) / n, 1) : 0
        });
        this.listeners.positionChanged(this.currentLocation);
    }

    private applyBackground() {
        const background = this._settings.backgroundColor;
        if(background) {
            this.container.style.background = background;
            // color-scheme and scrollbar-color inherit into the scroller, so
            // the scrollbar blends with the page background: the track matches
            // it exactly and the thumb is a translucent contrast color
            const dark = this.isDarkColor(background);
            if(dark === null) {
                this.container.style.removeProperty("color-scheme");
                this.container.style.removeProperty("scrollbar-color");
            } else {
                this.container.style.colorScheme = dark ? "dark" : "light";
                this.container.style.scrollbarColor =
                    `${dark ? "rgba(255, 255, 255, 0.3)" : "rgba(0, 0, 0, 0.3)"} ${background}`;
            }
        } else {
            this.container.style.removeProperty("background");
            this.container.style.removeProperty("color-scheme");
            this.container.style.removeProperty("scrollbar-color");
        }
    }

    /** Whether a CSS color is dark, via computed-style normalization; null if unparseable */
    private isDarkColor(color: string): boolean | null {
        const doc = this.container.ownerDocument;
        const probe = doc.createElement("div");
        probe.style.display = "none";
        probe.style.color = color;
        doc.body.appendChild(probe);
        const rgb = (doc.defaultView || window).getComputedStyle(probe).color;
        probe.remove();
        const m = rgb.match(/rgba?\(\s*(\d+)[,\s]+(\d+)[,\s]+(\d+)/);
        if(!m) return null;
        const luminance = (0.2126 * +m[1] + 0.7152 * +m[2] + 0.0722 * +m[3]) / 255;
        return luminance < 0.45;
    }

    resizeHandler() {
        const parentEl = this.container.parentElement || document.documentElement;
        // Floor to device pixels: a fractional container width shifts the
        // whole spine to fractional positions (hairline gaps at the gutter)
        const dpr = window.devicePixelRatio || 1;
        const width = Math.floor((getContentWidth(parentEl) - this._settings.constraint) * dpr) / dpr;
        if(isTypedOMSupported()) {
            this.container.attributeStyleMap.set("width", CSS.px(width));
        } else {
            this.container.style.width = `${width}px`;
        }
        this.pagedPresenter?.resizeHandler();
        this.scrolledPresenter?.resizeHandler();
    }

    // === Navigation ===

    private completeLocator(locator: Locator): Locator {
        if(!locator.href) {
            let fellback = false;
            if(typeof locator.locations.position === "number") {
                const match = this.positions.find(p => p.locations.position === locator.locations.position);
                if (match) {
                    locator = match.copyWithLocations(locator.locations);
                    fellback = true;
                }
            }
            if(!fellback && typeof locator.locations?.totalProgression === "number") {
                const targetProgression = locator.locations.totalProgression;
                let closestIdx = 0;
                let closestDist = Infinity;
                for (let i = 0; i < this.positions.length; i++) {
                    const pos = this.positions[i];
                    const posProg = pos.locations.totalProgression ?? (i / this.positions.length);
                    const dist = Math.abs(posProg - targetProgression);
                    if (dist < closestDist) {
                        closestDist = dist;
                        closestIdx = i;
                    }
                }
                locator = this.positions[closestIdx].copyWithLocations(locator.locations);
            }
        }
        return locator;
    }

    public go(locator: Locator, animated: boolean, cb: (ok: boolean) => void): void {
        locator = this.completeLocator(locator);
        const href = locator.href?.split("#")[0];
        const index = href ? this.pub.readingOrder.findIndexWithHref(href) : -1;
        if(index < 0) {
            return cb(this.listeners.handleLocator(locator));
        }

        if(this._isNavigating) { cb(false); return; }
        this._isNavigating = true;

        try {
            if(this.scrolledPresenter) {
                const progression = locator.locations?.progression || 0;
                this.scrolledPresenter.goToItem(index, animated, progression);
                this.scrolledPresenter.update();
            } else if(this.pagedPresenter) {
                this.pagedPresenter.goToItem(index, animated);
                this.pagedPresenter.update();
            }
            this.setLocationToIndex(this.pagedPresenter ? this.pagedPresenter.currentIndex : index);
            this.listeners.positionChanged(this.currentLocation);
            cb(true);
        } finally {
            this._isNavigating = false;
        }
    }

    public goLink(link: Link, animated: boolean, cb: (ok: boolean) => void): void {
        return this.go(link.locator, animated, cb);
    }

    public goForward(animated: boolean, cb: (ok: boolean) => void): void {
        if(this.scrolledPresenter) {
            cb(this.scrolledPresenter.next(animated));
            return;
        }
        cb(this.changeSpread(1));
    }

    public goBackward(animated: boolean, cb: (ok: boolean) => void): void {
        if(this.scrolledPresenter) {
            cb(this.scrolledPresenter.prev(animated));
            return;
        }
        cb(this.changeSpread(-1));
    }

    // === Zoom (paged mode only) ===

    public zoomIn() {
        this.pagedPresenter?.peripherals.zoomIn();
    }

    public zoomOut() {
        this.pagedPresenter?.peripherals.zoomOut();
    }

    public zoomReset() {
        this.pagedPresenter?.peripherals.resetZoom();
    }

    get currentLocator(): Locator {
        return this.currentLocation;
    }

    get viewport(): VisualNavigatorViewport {
        return this.presenter?.viewport ?? { readingOrder: [], progressions: new Map(), positions: null };
    }

    get isScrollStart(): boolean {
        const firstHref = this.viewport.readingOrder[0];
        const progression = firstHref ? this.viewport.progressions.get(firstHref) : undefined;
        return progression?.start === 0;
    }

    get isScrollEnd(): boolean {
        const lastHref = this.viewport.readingOrder[this.viewport.readingOrder.length - 1];
        const progression = lastHref ? this.viewport.progressions.get(lastHref) : undefined;
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

    // === Preferences ===

    public get settings(): Readonly<DivinaSettings> {
        return Object.freeze({ ...this._settings });
    }

    public get preferencesEditor(): DivinaPreferencesEditor {
        if (this._preferencesEditor === null) {
            this._preferencesEditor = new DivinaPreferencesEditor(this._preferences, this.settings, this.pub.metadata);
        }
        return this._preferencesEditor;
    }

    private _applying: Promise<void> = Promise.resolve();

    public async submitPreferences(preferences: DivinaPreferences) {
        this._preferences = this._preferences.merging(preferences) as DivinaPreferences;
        // Serialize applications: a concurrent scrolled-mode flip would
        // otherwise interleave across the async presenter rebuild
        this._applying = this._applying.then(() => this.applyPreferences());
        await this._applying;
    }

    private async applyPreferences() {
        const oldSettings = this._settings;
        this._settings = new DivinaSettings(this._preferences, this._defaults, this.manifestScrolled);

        if (this._preferencesEditor !== null) {
            this._preferencesEditor = new DivinaPreferencesEditor(this._preferences, this.settings, this.pub.metadata);
        }

        if (oldSettings.backgroundColor !== this._settings.backgroundColor) {
            this.applyBackground();
        }
        if (oldSettings.constraint !== this._settings.constraint) {
            this.resizeHandler();
        }

        if (oldSettings.scrolled !== this._settings.scrolled) {
            // The new mode is picked up by load() if it hasn't run yet
            if (!this.presenter) return;
            // Rebuild the presentation in the other mode, retaining the position
            const locator = this.currentLocation;
            await this.destroyPresenter();
            if (this._destroyed) return;
            this.createPresenter();
            this.resizeHandler();
            this.go(locator, false, () => {});
            return;
        }

        if (oldSettings.spreads !== this._settings.spreads) {
            this.pagedPresenter?.setSpreads(this._settings.spreads);
        }
        if (oldSettings.stripWidth !== this._settings.stripWidth) {
            this.scrolledPresenter?.applyStripWidth(this._settings.stripWidth);
        }
        if (oldSettings.quality !== this._settings.quality) {
            // Re-pick variants: drop everything and reload the current window
            this.pool.forEach(pm => pm.unload());
            this.pagedPresenter?.update();
            this.scrolledPresenter?.update();
        }
    }

    public async destroy() {
        // Flag synchronously so an in-flight load() bails
        this._destroyed = true;
        if (this._suspiciousActivityListener) {
            window.removeEventListener(NAVIGATOR_SUSPICIOUS_ACTIVITY_EVENT, this._suspiciousActivityListener);
        }
        if (this._keyboardPeripheralListener) {
            window.removeEventListener(NAVIGATOR_KEYBOARD_PERIPHERAL_EVENT, this._keyboardPeripheralListener);
        }
        this._navigatorProtector?.destroy();
        this._keyboardConditionBridge?.destroy();
        this._keyboardPeripheralsManager?.destroy();
        this.resizeObserver.disconnect();
        await this.destroyPresenter();
        this.pool.forEach(pm => pm.destroy());
        this.pool.clear();
        Array.from(this.container.childNodes).forEach(v => {
            if(v.nodeType === Node.ELEMENT_NODE || v.nodeType === Node.TEXT_NODE) v.remove();
        });
    }
}
