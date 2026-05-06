import { Loader, ModuleName } from "@readium/navigator-html-injectables";
import { FrameComms } from "./FrameComms.ts";
import type { ReadiumWindow } from "../../../../navigator-html-injectables/types/src/helpers/dom";
import { sML } from "../../helpers/index.ts";
import type { IContentProtectionConfig, IKeyboardPeripheralsConfig } from "../../Navigator.ts";
import { KeyboardConditionBridge } from "../../peripherals/KeyboardConditionBridge.ts";


export class FrameManager {
    private frame: HTMLIFrameElement;
    private loader: Loader | undefined;
    public readonly source: string;
    private comms: FrameComms | undefined;
    private hidden: boolean = true;
    private destroyed: boolean = false;
    private readonly contentProtectionConfig: IContentProtectionConfig;
    private readonly keyboardPeripheralsConfig: IKeyboardPeripheralsConfig;
    private conditionBridge?: KeyboardConditionBridge;
    private currModules: ModuleName[] = [];

    constructor(
        source: string,
        contentProtectionConfig: IContentProtectionConfig = {},
        keyboardPeripheralsConfig: IKeyboardPeripheralsConfig = []
    ) {
        this.frame = document.createElement("iframe");
        this.frame.sandbox.value = "allow-same-origin allow-scripts";
        this.frame.classList.add("readium-navigator-iframe");
        this.frame.style.visibility = "hidden";
        this.frame.style.setProperty("aria-hidden", "true");
        this.frame.style.opacity = "0";
        this.frame.style.position = "absolute";
        this.frame.style.pointerEvents = "none";
        this.frame.style.transition = "visibility 0s, opacity 0.1s linear";
        this.source = source;

        // Use the provided content protection config directly without overriding defaults
        this.contentProtectionConfig = { ...contentProtectionConfig };
        this.keyboardPeripheralsConfig = [...keyboardPeripheralsConfig];

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
                this.loader = new Loader(wnd as ReadiumWindow, modules);
                this.currModules = modules;
                this.comms = undefined;
                try { res(wnd); } catch (error) {}
                return;
            }
            this.frame.onload = () => {
                const wnd = this.frame.contentWindow!;
                this.loader = new Loader(wnd as ReadiumWindow, modules);
                this.currModules = modules;
                try { res(wnd); } catch (error) {}
            };
            this.frame.onerror = (err) => {
                try { rej(err); } catch (error) {}
            }
            this.frame.contentWindow!.location.replace(this.source);
        });
    }

    private applyContentProtection() {
        if (!this.comms) this.comms!.resume();

        // Send content protection config
        this.comms!.send("peripherals_protection", this.contentProtectionConfig);

        // Send keyboard peripherals, filtered through condition bridge
        if (this.keyboardPeripheralsConfig && this.keyboardPeripheralsConfig.length > 0) {
            this.conditionBridge?.destroy();
            this.conditionBridge = new KeyboardConditionBridge(
                this.keyboardPeripheralsConfig,
                (serializable) => {
                    if (serializable.length > 0)
                        this.comms!.send("keyboard_peripherals", serializable);
                }
            );
            this.conditionBridge.setup();
        }

        // Apply scroll protection
        if (this.contentProtectionConfig.monitorScrollingExperimental) {
            this.comms!.send("scroll_protection", {});
        }

        // Apply print protection if configured
        if (this.contentProtectionConfig.protectPrinting?.disable) {
            this.comms!.send("print_protection", this.contentProtectionConfig.protectPrinting);
        }
    }

    async destroy() {
        this.conditionBridge?.destroy();
        await this.hide();
        this.loader?.destroy();
        this.frame.remove();
        this.destroyed = true;
    }

    async hide(): Promise<void> {
        if(this.destroyed) return;
        this.frame.style.visibility = "hidden";
        this.frame.style.setProperty("aria-hidden", "true");
        this.frame.style.opacity = "0";
        this.frame.style.pointerEvents = "none";
        this.hidden = true;
        if(this.frame.parentElement) {
            if(this.comms === undefined || !this.comms.ready) return;
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
        if(this.destroyed) throw Error("Trying to show frame when it doesn't exist");
        if(!this.frame.parentElement) throw Error("Trying to show frame that is not attached to the DOM");
        if(this.comms) this.comms.resume();
        else this.comms = new FrameComms(this.frame.contentWindow!, this.source);
        return new Promise((res, _) => {
            this.comms?.send("activate", undefined, () => {
                this.comms?.send("focus", undefined, () => {
                    // Apply content protection synchronously
                    this.applyContentProtection();

                    const remove = () => {
                        this.frame.style.removeProperty("visibility");
                        this.frame.style.removeProperty("aria-hidden");
                        this.frame.style.removeProperty("opacity");
                        this.frame.style.removeProperty("pointer-events");
                        this.hidden = false;

                        if (sML.UA.WebKit) {
                            this.comms?.send("force_webkit_recalc", undefined);
                        }

                        res();
                    }
                    if(atProgress !== undefined) {
                        this.comms?.send("go_progression", atProgress, remove);
                    } else {
                        remove();
                    }
                });
            });
        });
    }

    setCSSProperties(properties: { [key: string]: string }) {
        if(this.destroyed || !this.frame.contentWindow) return;

        // We need to resume and halt postMessage to update the properties
        // if the frame is hidden since it’s been halted in hide()
        if (this.hidden) {
            if (this.comms) this.comms?.resume();
            else this.comms = new FrameComms(this.frame.contentWindow!, this.source);
        }
        this.comms?.send("update_properties", properties);
        if (this.hidden) this.comms?.halt();
    }

    get iframe() {
        if(this.destroyed) throw Error("Trying to use frame when it doesn't exist");
        return this.frame;
    }

    get realSize() {
        if(this.destroyed) throw Error("Trying to use frame client rect when it doesn't exist");
        return this.frame.getBoundingClientRect();
    }

    get isDestroyed() {
        return this.destroyed;
    }

    get window() {
        if(this.destroyed || !this.frame.contentWindow) throw Error("Trying to use frame window when it doesn't exist");
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
