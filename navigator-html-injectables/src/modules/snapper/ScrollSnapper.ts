import { Comms } from "../../comms";
import { AnchorObserver, helperCreateAnchorElements, helperRemoveAnchorElements } from '../../helpers/scrollSnapperHelper';
import { ModuleName } from "../ModuleLibrary";
import { Snapper } from "./Snapper";

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

    private reportProgress() {
        this.comms.send("progress", this.wnd.scrollY / this.doc().scrollHeight);
        console.log("reporting scrollsnapper progress", this.wnd.scrollY, this.doc().scrollHeight, this.wnd.scrollY / this.doc().scrollHeight)
    }

    mount(wnd: Window, comms: Comms): boolean {
        this.wnd = wnd;
        this.comms = comms;

        comms.register("go_progression", ScrollSnapper.moduleName, (data, ack) => {
            const position = data as number;
            if (position < 0 || position > 1) {
                comms.send("error", {
                    message: "go_progression must be given a position from 0.0 to 1.0"
                });
                ack(false);
                return;
            }
            this.doc().scrollTop = this.doc().scrollHeight * position;
            this.reportProgress();
            ack(true);
        })

        comms.register("go_start", ScrollSnapper.moduleName, (_, ack) => {
            if (this.doc().scrollTop === 0) return ack(false);
            this.doc().scrollTop = 0;
            this.reportProgress();
            ack(true);
        });

        comms.register("go_end", ScrollSnapper.moduleName, (_, ack) => {
            if (this.doc().scrollTop === 0) return ack(false);
            this.doc().scrollTop = 0;
            this.reportProgress();
            ack(true);
        })

        comms.register("go_prev", ScrollSnapper.moduleName, (_, ack) => {
            this.reportProgress();
            ack(false);
        });

        comms.register("go_next", ScrollSnapper.moduleName, (_, ack) => {
            this.reportProgress();
            ack(false);
        });

        comms.register("unfocus", ScrollSnapper.moduleName, (_, ack) => {
            ack(true);
        });

        comms.register("focus", ScrollSnapper.moduleName, (_, ack) => {
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
        comms.log("ScrollSnapper Unmounted");
        return true;
    }
}