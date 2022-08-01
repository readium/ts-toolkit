import { Comms } from "../../comms/comms";
import { Module } from "../Module";

export abstract class Setup extends Module {
    private comms!: Comms;

    wndOnErr(event: ErrorEvent) {
        this.comms?.send("error", {
            message: event.message,
            filename: event.filename,
            lineno: event.lineno,
            colno: event.colno
        });
    }

    mount(wnd: Window, comms: Comms): boolean {
        comms.log("Setup Mounted");

        // Add listener
        this.comms = comms;
        wnd.addEventListener(
            "error",
            this.wndOnErr,
            false
        );

        return true;
    }

    unmount(wnd: Window, comms: Comms): boolean {
        comms.unregister("set_property", "setup");
        comms.unregister("remove_property", "setup");
        wnd.removeEventListener("error", this.wndOnErr);
        comms.log("Setup Unmounted");
        return true;
    }
}