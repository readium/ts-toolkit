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
                const wnd = this.frame.contentWindow!;
                // Check if currently loaded modules are equal
                if([...this.currModules].sort().join("|") === [...modules].sort().join("|")) {
                    try { res(wnd); } catch (error) {};
                    return;
                }
                this.comms?.halt();
                this.loader.destroy();
                this.loader = new Loader(wnd, modules);
                this.currModules = modules;
                this.comms = undefined;
                try { res(wnd); } catch (error) {}
                return;
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
            this.frame.contentWindow!.location.replace(this.source);
        });
    }

    async destroy() {
        await this.hide();
        this.loader?.destroy();
        this.frame.remove();
    }

    async hide(): Promise<void> {
        this.frame.style.visibility = "hidden";
        this.frame.style.opacity = "0";
        this.frame.style.pointerEvents = "none";
        if(this.frame.parentElement) {
            if(this.comms === undefined) return;
            return new Promise((res, _) => {
                this.comms?.send("unfocus", undefined, (_: boolean) => {
                    this.comms?.halt();
                    res();
                });
            });
        } else
            this.comms?.halt();
    }

    async show(atProgress?: number): Promise<void> {
        if(!this.frame.parentElement) {
            console.warn("Trying to show frame that is not attached to the DOM");
            return;
        }
        if(this.comms) this.comms.resume();
        else this.comms = new FrameComms(this.frame.contentWindow!, this.source);
        return new Promise((res, _) => {
            this.comms?.send("activate", undefined, () => {
                this.comms?.send("focus", undefined, () => {
                    const remove = () => {
                        this.frame.style.removeProperty("visibility");
                        this.frame.style.removeProperty("opacity");
                        this.frame.style.removeProperty("pointer-events");
                        res();
                    }
                    if(atProgress && atProgress > 0) {
                        this.comms?.send("go_progression", atProgress, remove);
                    } else {
                        remove();
                    }
                });
            });
        });
    }

    get iframe() {
        return this.frame;
    }

    get realSize() {
        return this.frame.getBoundingClientRect();
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