import { Comms } from "../../comms";
import { Module } from "../Module";
import { ModuleName } from "../ModuleLibrary";

const SNAPPER_STYLE_ID = "readium-snapper-style";

export abstract class Snapper extends Module {
    static readonly moduleName: ModuleName = "snapper";

    private protected = false;

    buildStyles() {
        return `
        html, body {
            touch-action: manipulation;
            user-select: ${this.protected ? "none" : "auto"};
        }`;
    }

    mount(wnd: Window, comms: Comms): boolean {
        const d = wnd.document.createElement("style");
        d.dataset.readium = "true";
        d.id = SNAPPER_STYLE_ID;
        d.textContent = this.buildStyles();
        wnd.document.head.appendChild(d);

        comms.register("protect", Snapper.moduleName, (_, ack) => {
            this.protected = true;
            d.textContent = this.buildStyles();
            ack(true);
        });
        comms.register("unprotect", Snapper.moduleName, (_, ack) => {
            this.protected = false;
            d.textContent = this.buildStyles();
            ack(true);
        });

        comms.log("Snapper Mounted");
        return true;
    }

    unmount(wnd: Window, comms: Comms): boolean {
        wnd.document.getElementById(SNAPPER_STYLE_ID)?.remove();

        comms.log("Snapper Unmounted");
        return true;
    }
}