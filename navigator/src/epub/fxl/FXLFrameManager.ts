import { Loader, ModuleName } from "@readium/navigator-html-injectables/src";
import { Page, ReadingProgression } from "@readium/shared/src/publication";
import { FrameComms } from "../frame/FrameComms";
import FXLPeripherals from "./FXLPeripherals";

export default class FXLFrameManager {
    private frame: HTMLIFrameElement;
    private loader: Loader | undefined;
    public source: string;
    private comms: FrameComms | undefined;
    private readonly peripherals: FXLPeripherals;

    private currModules: ModuleName[] = [];

    // NEW
    public wrapper: HTMLDivElement;
    public debugHref: string;
    private loadPromise: Promise<Window> | undefined;
    private showPromise: Promise<void> | undefined;

    constructor(peripherals: FXLPeripherals, direction: ReadingProgression, debugHref: string) {
        this.peripherals = peripherals;
        this.debugHref = debugHref;
        this.frame = document.createElement("iframe");
        this.frame.classList.add("readium-navigator-iframe");
        this.frame.classList.add("blank");
        this.frame.scrolling = "no";
        this.frame.style.visibility = "hidden";
        this.frame.style.display = "none";
        this.frame.style.position = "absolute";
        this.frame.style.pointerEvents = "none";
        this.frame.style.transformOrigin = "0 0";
        this.frame.style.transform = "scale(1)";
        this.frame.style.background = "#fff";
        this.frame.style.touchAction = "none";
        this.frame.dataset.originalHref = debugHref;
        this.source = "about:blank";

        // NEW
        this.wrapper = document.createElement("div");
        this.wrapper.style.position = "relative";
        this.wrapper.style.float = this.wrapper.style.cssFloat = direction === ReadingProgression.rtl ? "right" : "left";

        this.wrapper.appendChild(this.frame);
    }

    async load(modules: ModuleName[], source: string): Promise<Window> {
        if(this.source === source && this.loadPromise/* && this.loaded*/) {
            if([...this.currModules].sort().join("|") === [...modules].sort().join("|")) {
                return this.loadPromise;
            }
        }
        if(this.loaded && this.source !== source) {
            this.window.stop();
        }
        this.source = source;
        this.loadPromise = new Promise((res, rej) => {
            if(this.loader && this.loaded) {
                const wnd = this.frame.contentWindow!;
                // Check if currently loaded modules are equal
                if([...this.currModules].sort().join("|") === [...modules].sort().join("|")) {
                    try { res(wnd); this.loadPromise = undefined; } catch (error) { };
                    return;
                }
                // TODO
                this.comms?.halt();
                this.loader.destroy();
                this.loader = new Loader(wnd, modules);
                this.currModules = modules;
                this.comms = undefined;
                try { res(wnd); this.loadPromise = undefined; } catch (error) {}
                return;
            }
            this.frame.addEventListener("load", () => {
                const wnd = this.frame.contentWindow!;
                this.loader = new Loader(wnd, modules);
                this.currModules = modules;
                this.peripherals.observe(this.wrapper);
                this.peripherals.observe(wnd);
                try { res(wnd); } catch (error) {};
            }, { once: true });
            this.frame.addEventListener("error", (e) => {
                try { rej(e.error); this.loadPromise = undefined; } catch (error) {};
            }, { once: true });
            this.frame.style.removeProperty("display");
            this.frame.contentWindow!.location.replace(this.source);
        });
        return this.loadPromise;
    }

    // Parses the page size from the viewport meta tag of the loaded resource.
    loadPageSize(): { width: number, height: number } {
        const wnd = this.frame.contentWindow!;

        // Try to get the page size from the viewport meta tag
        const viewport = wnd.document.head.querySelector(
            "meta[name=viewport]"
        ) as HTMLMetaElement;
        if (viewport) {
            const regex = /(\w+) *= *([^\s,]+)/g;
            let match;
            let width = 0, height = 0;
            while ((match = regex.exec(viewport.content))) {
                if(match[1] === "width")
                    width = Number.parseFloat(match[2]);
                else if(match[1] === "height")
                    height = Number.parseFloat(match[2]);
            }
            if(width > 0 && height > 0)
                return { width, height };
        }

        // Otherwise get it from the size of the loaded content
        return {
            width: wnd.document.body.scrollWidth,
            height: wnd.document.body.scrollHeight
        }
    }

    update(page?: Page) {
        if(!this.loaded) return;
        const dimensions = this.loadPageSize();
        this.frame.style.height = `${dimensions.height}px`;
        this.frame.style.width = `${dimensions.width}px`;
        const ratio = Math.min(this.wrapper.clientWidth / dimensions.width, this.wrapper.clientHeight / dimensions.height);
        this.frame.style.transform = `scale(${ratio})`;
        const bcr = this.frame.getBoundingClientRect();
        const hdiff = this.wrapper.clientHeight - bcr.height;
        this.frame.style.top = `${hdiff / 2}px`;
        if(page === Page.left) {
            const wdiff = this.wrapper.clientWidth - bcr.width;
            this.frame.style.left = `${wdiff}px`;
        } else if(page === Page.center) {
            const wdiff = this.wrapper.clientWidth - bcr.width;
            this.frame.style.left = `${wdiff / 2}px`;
        } else {
            this.frame.style.left = "0px";
        }

        this.frame.style.removeProperty("visibility");
        this.frame.style.removeProperty("pointer-events");
        this.frame.classList.remove("blank");
        this.frame.classList.add("loaded");
    }

    async destroy() {
        await this.hide();
        this.loader?.destroy();
        this.wrapper.remove();
    }

    async unload() {
        if(!this.loaded) return;
        this.deselect();
        this.frame.style.visibility = "hidden";
        this.frame.style.pointerEvents = "none";
        this.frame.classList.add("blank");
        this.frame.classList.remove("loaded");
        this.comms?.halt();
        this.loader?.destroy();
        this.comms = undefined;
        this.frame.blur();
        return new Promise<void>((res, rej) => {
            this.frame.addEventListener("load", () => {
                try { this.showPromise = undefined; res(); } catch (error) {};
            }, { once: true });
            this.frame.addEventListener("error", (e) => {
                try { this.showPromise = undefined; rej(e.error); } catch (error) {};
            }, { once: true });
            this.source = "about:blank";
            this.frame.contentWindow!.location.replace("about:blank");
            this.frame.style.display = "none";
        });
    }

    deselect() {
        this.frame.contentWindow?.getSelection()?.removeAllRanges();
    }

    async hide(): Promise<void> {
        if(this.frame.parentElement) {
            this.deselect();
            if(this.comms === undefined) return;
            return new Promise((res, _) => {
                this.comms?.send("unfocus", undefined, (_: boolean) => {
                    this.comms?.halt();
                    this.showPromise = undefined;
                    res();
                });
            });
        } else
            this.comms?.halt();
    }

    private cachedPage: Page | undefined = undefined;
    async show(page: Page): Promise<void> {
        if(!this.frame.parentElement) {
            console.warn("Trying to show frame that is not attached to the DOM");
            return;
        }
        if(!this.loaded) {
            this.showPromise = undefined;
            return;
        }
        if(this.showPromise) {
            if(this.cachedPage !== page) {
                this.update(page); // TODO fix that this can theoretically happen before the page is fully loaded
                this.cachedPage = page;
            }
            return this.showPromise;
        };
        // this.update(page);
        this.cachedPage = page;
        if(this.comms) this.comms.resume();
        else this.comms = new FrameComms(this.frame.contentWindow!, this.source);
        this.showPromise = new Promise<void>((res, _) => {
            this.comms!.send("focus", undefined, (_: boolean) => {
                // this.showPromise = undefined; Don't do this
                this.update(this.cachedPage);
                res();
            });
        });
        return this.showPromise;
    }

    async activate(): Promise<void> {
        return new Promise<void>((res, _) => {
            if(!this.comms) return res(); // TODO: investigate when this is the case
            this.comms?.send("activate", undefined, () => {
                res();
            });
        });
    }

    get element() {
        return this.wrapper;
    }

    get iframe() {
        return this.frame;
    }

    get realSize() {
        return this.frame.getBoundingClientRect();
    }

    get loaded() {
        return this.frame.contentWindow && this.frame.contentWindow.location.href !== "about:blank";
    }

    set width(width: number) {
        const newWidth = `${width}%`;
        if(this.wrapper.style.width === newWidth) return;
        this.wrapper.style.width = newWidth;
    }

    set height(height: number) {
        const newHeight = `${height}px`;
        if(this.wrapper.style.height === newHeight) return;
        this.wrapper.style.height = newHeight;
    }

    get window() {
        if(!this.frame.contentWindow) throw Error("Trying to use frame window when it doesn't exist");
        return this.frame.contentWindow;
    }

    get atLeft() {
        return this.window.scrollX < 5;
    }

    get atRight() {
        return this.window.scrollX > this.window.document.scrollingElement!.scrollWidth - this.window.innerWidth - 5
    }

    get msg() {
        return this.comms;
    }

    get ldr() {
        return this.loader;
    }
}