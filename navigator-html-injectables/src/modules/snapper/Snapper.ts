import { Comms } from "../../comms";
import { Module } from "../Module";
import { ModuleName } from "../ModuleLibrary";

export abstract class Snapper extends Module {
    static readonly moduleName: ModuleName = "snapper";

    mount(wnd: Window, comms: Comms): boolean {
        const bstyle = wnd.document.body.style;
        comms.register("protect", Snapper.moduleName, (_, ack) => {
            bstyle.userSelect = "none";
            ack(true);
        });
        comms.register("unprotect", Snapper.moduleName, (_, ack) => {
            bstyle.userSelect = "auto";
            ack(true);
        });

        comms.log("Snapper Mounted");
        return true;
    }

    unmount(wnd: Window, comms: Comms): boolean {
        const bstyle = wnd.document.body.style;
        bstyle.removeProperty("user-select");

        comms.log("Snapper Unmounted");
        return true;
    }
}