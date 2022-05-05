import { Comms } from "../../comms";
import { Module } from "../Module";

export abstract class Snapper extends Module {
    mount(wnd: Window, comms: Comms): boolean {
        const bstyle = wnd.document.body.style;
        bstyle.userSelect = "none";

        console.log("Snapper Mounted");
        return true;
    }

    unmount(wnd: Window, comms: Comms): boolean {
        const bstyle = wnd.document.body.style;
        bstyle.removeProperty("user-select");

        console.log("Snapper Unmounted");
        return true;
    }
}