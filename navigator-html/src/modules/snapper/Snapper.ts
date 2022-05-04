import { Comms } from "../../comms";
import { Module } from "../Module";

export abstract class Snapper extends Module {
    mount(wnd: Window, comms: Comms): boolean {
        console.log("Snapper Mounted");
        return true;
    }

    unmount(wnd: Window, comms: Comms): boolean {
        console.log("Snapper Unmounted");
        return true;
    }
}