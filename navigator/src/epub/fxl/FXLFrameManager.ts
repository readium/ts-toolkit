import { Loader, ModuleName } from "@readium/navigator-html-injectables/src";
import { Page, ReadingProgression } from "@readium/shared/src";
import { FrameComms } from "../frame/FrameComms";

export default class FXLFrameManager {
    private frame: HTMLIFrameElement;
    private loader: Loader | undefined;
    public source: string;
    private comms: FrameComms | undefined;

    private currModules: ModuleName[] = [];

    // NEW
    public wrapper: HTMLDivElement;
    public debugHref: string;
    private loadPromise: Promise<Window> | undefined;

    constructor(direction: ReadingProgression, debugHref: string) {
        this.debugHref = debugHref;
        this.frame = document.createElement("iframe");
        this.frame.classList.add("readium-navigator-iframe");
        this.frame.style.visibility = "hidden";
        this.frame.style.opacity = "0";
        this.frame.style.position = "absolute";
        this.frame.style.pointerEvents = "none";
        this.frame.style.transition = "visibility 0s, opacity 0.1s linear";
        this.frame.style.transformOrigin = "0 0";
        this.frame.style.transform = "scale(1)";
        this.frame.style.background = "#fff";
        this.source = "about:blank";

        // NEW
        this.wrapper = document.createElement("div");
        this.wrapper.style.position = "relative";
        this.wrapper.style.float = this.wrapper.style.cssFloat = direction === ReadingProgression.rtl ? "right" : "left";

        this.wrapper.appendChild(this.frame);
    }

    async load(modules: ModuleName[], source: string): Promise<Window> {
        if(this.source === source && this.loadPromise && this.loaded) {
            if([...this.currModules].sort().join("|") === [...modules].sort().join("|")) {
                // console.log("return already load promise", this.debugHref);
                return this.loadPromise;
            }
        }
        if(this.loaded && this.source !== source) {
            this.window.stop();
        }
        this.source = source;
        this.loadPromise = new Promise((res, rej) => {
            // console.log("promise load", this.debugHref, this.loader, this.loaded);
            if(this.loader && this.loaded) {
                const wnd = this.frame.contentWindow!;
                // Check if currently loaded modules are equal
                if([...this.currModules].sort().join("|") === [...modules].sort().join("|")) {
                    // console.log("shortcut resolve", this.debugHref);
                    try { res(wnd); } catch (error) { };
                    return;
                }
                // TODO
                this.comms?.halt();
                this.loader.destroy();
                this.loader = new Loader(wnd, modules);
                this.currModules = modules;
                this.comms = undefined;
                // console.log("complete resolve", this.debugHref);
                try { res(wnd); } catch (error) {}
                return;
            }
            this.frame.addEventListener("load", () => {
                const wnd = this.frame.contentWindow!;
                this.loader = new Loader(wnd, modules);
                this.currModules = modules;
                // console.log("loaded resolve", this.debugHref);
                try { res(wnd); } catch (error) {};
            }, { once: true });
            this.frame.addEventListener("error", (e) => {
                try { rej(e.error); } catch (error) {};
            }, { once: true });
            this.frame.src = this.source;
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
        //console.log("update!", this.debugHref, page);
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
        }

        this.frame.style.removeProperty("visibility");
        this.frame.style.removeProperty("opacity");
        this.frame.style.removeProperty("pointer-events");
    }

    async destroy() {
        // console.log("destroy!", this.debugHref);
        await this.hide();
        this.loader?.destroy();
        this.wrapper.remove();
    }

    async unload() {
        if(!this.loaded) return;
        // console.log("unload", this.debugHref);
        this.frame.style.visibility = "hidden";
        this.frame.style.opacity = "0";
        this.frame.style.pointerEvents = "none";
        this.comms?.halt();
        this.loader?.destroy();
        this.comms = undefined;
        this.frame.blur();
        return new Promise<void>((res, rej) => {
            this.frame.addEventListener("load", () => {
                try { res(); } catch (error) {};
            }, { once: true });
            this.frame.addEventListener("error", (e) => {
                try { rej(e.error); } catch (error) {};
            }, { once: true });
            this.frame.src = "about:blank";
        });
    }

    async hide(): Promise<void> {
        if(this.frame.parentElement) {
            if(this.comms === undefined) return;
            return new Promise((res, _) => {
                this.comms?.send("unfocus", undefined, (ok: boolean) => {
                    this.comms?.halt();
                    res();
                });
            });
        } else
            this.comms?.halt();
    }

    async show(page: Page): Promise<void> {
        if(!this.frame.parentElement) {
            console.warn("Trying to show frame that is not attached to the DOM");
            return;
        }
        // console.log("SHOW", this.debugHref, this.comms?.ready);
        this.update(page);
        if(this.comms) this.comms.resume();
        else this.comms = new FrameComms(this.frame.contentWindow!, this.source);
        return new Promise((res, _) => {
            // console.log("SEND FOCUS", this.debugHref, this.comms, this.source);
            this.comms?.send("focus", undefined, (ok: boolean) => {
                // console.log("RESOLVE!", this.debugHref);
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

    get loaded() {
        return this.frame.src !== "about:blank";
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