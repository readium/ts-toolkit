import { Comms } from "../../comms/comms";
import { ReadiumWindow } from "../../helpers/dom";
import { Module } from "../Module";
import { getProperties, removeProperty, setProperty, updateProperties } from "../../helpers/css";

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

        // Handle property updates (like ReflowableSetup)
        comms.register("get_properties", WebPubSetup.moduleName, (_, ack) => {
            getProperties(wnd);
            ack(true);
        });
        comms.register("update_properties", WebPubSetup.moduleName, (data, ack) => {
            updateProperties(wnd, data as { [key: string]: string });
            ack(true);
        });
        comms.register("set_property", WebPubSetup.moduleName, (data, ack) => {
            const kv = data as string[];
            setProperty(wnd, kv[0], kv[1]);
            ack(true);
        });
        comms.register("remove_property", WebPubSetup.moduleName, (data, ack) => {
            removeProperty(wnd, data as string);
            ack(true);
        });

        comms.register("activate", WebPubSetup.moduleName, (_, ack) => {
            ack(true);
        });

        comms.log("WebPubSetup Mounted");
        return true;
    }

    unmount(wnd: ReadiumWindow, comms: Comms): boolean {
        comms.unregisterAll(WebPubSetup.moduleName);
        wnd.removeEventListener("error", this.wndOnErr);

        comms.log("WebPubSetup Unmounted");
        return true;
    }
}