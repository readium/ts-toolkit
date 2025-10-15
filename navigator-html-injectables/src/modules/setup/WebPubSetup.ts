import { Comms } from "../../comms/comms";
import { ReadiumWindow } from "../../helpers/dom";
import { Module } from "../Module";

export class WebPubSetup extends Module {
    static readonly moduleName = "webpub_setup";

    private comms!: Comms;

    wndOnErr(event: ErrorEvent) {
        this.comms?.send("error", {
            message: event.message,
            filename: event.filename,
            lineno: event.lineno,
            colno: event.colno
        });
    }

    mount(wnd: ReadiumWindow, comms: Comms): boolean {
        this.comms = comms;

        // Track all window errors
        wnd.addEventListener(
            "error",
            this.wndOnErr,
            false
        );

        // Handle activate message to prevent timeout warnings
        comms.register("activate", WebPubSetup.moduleName, (_, ack) => {
            ack(true);
        });

        comms.log("WebPubSetup Mounted");
        return true;
    }

    unmount(wnd: ReadiumWindow, comms: Comms): boolean {
        wnd.removeEventListener("error", this.wndOnErr);

        comms.log("WebPubSetup Unmounted");
        return true;
    }
}
