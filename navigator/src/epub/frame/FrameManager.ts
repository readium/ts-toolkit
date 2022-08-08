import { Loader, ModuleName } from "../../../../navigator-html/src";
import { FrameComms } from "./FrameComms";


export default class FrameManager {
    private frame: HTMLIFrameElement;
    private loader: Loader;
    public readonly source: string;
    private comms: FrameComms;

    private currModules: ModuleName[] = [];

    constructor(source: string) {
        this.frame = document.createElement("iframe");
        this.frame.classList.add("readium-navigator-iframe");
        this.frame.style.display = "none";
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
                const wnd = this.frame.contentWindow!
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
        this.comms?.destroy();
        this.frame.style.display = "none";
    }

    show() {
        this.comms = new FrameComms(this.frame.contentWindow!, this.source);
        this.frame.style.display = "";
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