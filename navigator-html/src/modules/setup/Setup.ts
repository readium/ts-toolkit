import { Comms } from "../../comms/comms";
import { removeProperty, setProperty } from "../../helpers/css";
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
        console.log("Setup Mounted");

        // Add listener
        this.comms = comms;
        wnd.addEventListener(
            "error",
            this.wndOnErr,
            false
        );

        comms.register("set_property", "setup", (data: unknown) => {
            const kv = data as string[];
            setProperty(wnd, kv[0], kv[1]);
        })
        comms.register("remove_property", "setup", (data: unknown) => {
            removeProperty(wnd, data as string);
        })

        return true;
    }

    unmount(wnd: Window, comms: Comms): boolean {
        comms.unregister("set_property", "setup");
        comms.unregister("remove_property", "setup");
        wnd.removeEventListener("error", this.wndOnErr);
        console.log("Setup Unmounted");
        return true;
    }
}