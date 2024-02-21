import { Comms } from "../../comms/comms";
import { ReadiumWindow } from "../../helpers/dom";
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

    protected unblock(wnd: ReadiumWindow) {
        wnd._readium_blockEvents = false;
        while(wnd._readium_blockedEvents?.length > 0) {
            const x = wnd._readium_blockedEvents.shift()!;
            switch(x[0]) {
                case 0:
                    Reflect.apply(x[1], x[2], x[3]);
                    break;
                case 1:
                    const ev = x[1];
                    wnd.removeEventListener(ev.type, wnd._readium_eventBlocker, true);
                    const evt = new Event(ev.type, {
                        bubbles: ev.bubbles,
                        cancelable: ev.cancelable
                    });
                    if(ev.currentTarget) ev.currentTarget.dispatchEvent(evt)
                    else wnd.dispatchEvent(evt);
                    break;
            }
        }
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
        wnd.removeEventListener("error", this.wndOnErr);
        comms.log("Setup Unmounted");
        return true;
    }
}