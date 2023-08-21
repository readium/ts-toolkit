import { Locator, LocatorText } from "@readium/shared/src";
import { Comms } from "../../comms";
import { ReadiumWindow, findFirstVisibleLocator } from "../../helpers/dom";
import { AnchorObserver, helperCreateAnchorElements, helperRemoveAnchorElements } from '../../helpers/scrollSnapperHelper';
import { ModuleName } from "../ModuleLibrary";
import { Snapper } from "./Snapper";
import { rangeFromLocator } from "../../helpers/locator";

const SCROLL_SNAPPER_STYLE_ID = "readium-scroll-snapper-style";

export class ScrollSnapper extends Snapper {
    static readonly moduleName: ModuleName = "scroll_snapper";
    private wnd!: Window;
    private comms!: Comms;

    private doc() {
        return this.wnd.document.scrollingElement as HTMLElement;
    }

    private createAnchorElements = () => {
        helperCreateAnchorElements(this.doc());
    }

    private removeAnchorElements = () => {
        helperRemoveAnchorElements(this.doc());
    }

    private createCustomElement = () => {
        customElements.get("anchor-observer") ||
            customElements.define("anchor-observer", AnchorObserver);
    }

    private reportProgress(progress: number) {
        this.comms.send("progress", progress);
    }

    mount(wnd: Window, comms: Comms): boolean {
        this.wnd = wnd;
        this.comms = comms;

        // Add styling to hide the scrollbar
        const style = wnd.document.createElement("style");
        style.dataset.readium = "true";
        style.id = SCROLL_SNAPPER_STYLE_ID;
        style.textContent = `
        * {
            scrollbar-width: none; /* for Firefox */
        }
        
        body::-webkit-scrollbar {
            display: none; /* for Chrome, Safari, and Opera */
        }
        `;
        wnd.document.head.appendChild(style);

        comms.register("go_progression", ScrollSnapper.moduleName, (data, ack) => {
            const position = data as number;

            if (position < 0 || position > 1) {
                comms.send("error", {
                    message: "go_progression must be given a position from 0.0 to 1.0"
                });
                ack(false);
                return;
            }

            this.wnd.requestAnimationFrame(() => {
              this.doc().scrollTop = this.doc().offsetHeight * position;
              this.reportProgress(position);
              ack(true);
          });
        });

        comms.register("go_id", ScrollSnapper.moduleName, (data, ack) => {
            const element = wnd.document.getElementById(data as string);
            if(!element) {
                ack(false);
                return;
            }
            this.wnd.requestAnimationFrame(() => {
                this.doc().scrollTop = element.getBoundingClientRect().top + wnd.scrollY - wnd.innerHeight / 2;
                this.reportProgress(this.doc().scrollTop / this.doc().offsetHeight);
                ack(true);
            });
        });

        comms.register("go_text", ScrollSnapper.moduleName, (data, ack) => {
            const text = LocatorText.deserialize(data);
            const r = rangeFromLocator(this.wnd.document, new Locator({
                href: wnd.location.href,
                type: "text/html",
                text
            }));
            if(!r) {
                ack(false);
                return;
            }
            this.wnd.requestAnimationFrame(() => {
                this.doc().scrollTop = r.getBoundingClientRect().top + wnd.scrollY - wnd.innerHeight / 2;
                this.reportProgress(this.doc().scrollTop / this.doc().offsetHeight);
                ack(true);
            });
        });

        comms.register("go_start", ScrollSnapper.moduleName, (_, ack) => {
            if (this.doc().scrollTop === 0) return ack(false);
            this.doc().scrollTop = 0;
            this.reportProgress(0);
            ack(true);
        });

        comms.register("go_end", ScrollSnapper.moduleName, (_, ack) => {
            if (this.doc().scrollTop === 0) return ack(false);
            this.doc().scrollTop = 0;
            this.reportProgress(0);
            ack(true);
        })

        comms.register("go_prev", ScrollSnapper.moduleName, (_, ack) => {
            ack(false);
        });

        comms.register("go_next", ScrollSnapper.moduleName, (_, ack) => {
            ack(false);
        });

        comms.register("unfocus", ScrollSnapper.moduleName, (_, ack) => {
            ack(true);
        });

        comms.register("focus", ScrollSnapper.moduleName, (_, ack) => {
            this.reportProgress(this.doc().scrollTop / this.doc().offsetHeight);
            ack(true);
        });

        comms.register("first_visible_locator", ScrollSnapper.moduleName, (_, ack) => {
            const locator = findFirstVisibleLocator(wnd as ReadiumWindow, true);
            this.comms.send("first_visible_locator", locator.serialize());
            ack(true);
        });

        comms.log("ScrollSnapper Mounted");
        this.createCustomElement();
        this.createAnchorElements();
        return true;
    }

    unmount(wnd: Window, comms: Comms): boolean {
        comms.unregisterAll(ScrollSnapper.moduleName);
        this.removeAnchorElements();
        wnd.document.getElementById(SCROLL_SNAPPER_STYLE_ID)?.remove();
        comms.log("ScrollSnapper Unmounted");
        return true;
    }
}