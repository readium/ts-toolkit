import { Loader, ModuleName } from "@readium/navigator-html-injectables/src";
import { FrameComms } from "./FrameComms";


export default class FrameManager {
    private frame: HTMLIFrameElement;
    private loader: Loader | undefined;
    public readonly source: string;
    private comms: FrameComms | undefined;

    private currModules: ModuleName[] = [];

    constructor(source: string) {
        this.frame = document.createElement("iframe");
        this.frame.classList.add("readium-navigator-iframe");
        this.frame.style.visibility = "hidden";
        this.frame.style.opacity = "0";
        this.frame.style.position = "absolute";
        this.frame.style.pointerEvents = "none";
        this.frame.style.transition = "visibility 0s, opacity 0.1s linear";
        this.source = source;
    }

    async load(modules: ModuleName[]): Promise<Window> {
        return new Promise((res, rej) => {
            if(this.loader) {
                // Check if currently loaded modules are equal
                if(this.currModules.sort().join("|") === modules.sort().join("|")) {
                    try { res(this.frame.contentWindow!); } catch (error) {};
                    return;
                }
                this.loader.destroy();
                this.loader = new Loader(this.frame.contentWindow!);
                this.currModules = modules;
                try { res(this.frame.contentWindow!); } catch (error) {}
            }
            this.frame.onload = () => {
                const wnd = this.frame.contentWindow!;
                this.loader = new Loader(wnd, modules);
                this.currModules = modules;
                try { res(wnd); } catch (error) {}
            };
            this.frame.onerror = (err) => {
                try { rej(err); } catch (error) {}
            }
            this.frame.src = this.source;
        });
    }

    destroy() {
        this.hide();
        this.loader?.destroy();
        this.frame.remove(); // TODO this makes it unusable, should it?
    }

    hide() {
        this.frame.style.visibility = "hidden";
        this.frame.style.opacity = "0";
        this.frame.style.pointerEvents = "none";
        this.comms?.send("unfocus", undefined);
        this.comms?.halt();
    }

    show() {
        if(this.comms) this.comms.resume();
        else this.comms = new FrameComms(this.frame.contentWindow!, this.source);
        this.comms?.send("focus", undefined);
        this.frame.style.removeProperty("visibility");
        this.frame.style.removeProperty("opacity");
        this.frame.style.removeProperty("pointer-events");
    }

    get iframe() {
        return this.frame;
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