import { Comms } from "../../comms/comms";
import { Setup } from "./Setup";
import { removeProperty, setProperty } from "../../helpers/css";

const FIXED_STYLE_ID = "readium-fixed-style";

export class FixedSetup extends Setup {
    static readonly moduleName = "fixed_setup";

    mount(wnd: Window, comms: Comms): boolean {
        if(!super.mount(wnd, comms)) return false;

        const style = wnd.document.createElement("style");
        style.id = FIXED_STYLE_ID;
        style.textContent = `
        html, body {
            overflow: hidden;
            text-size-adjust: none;
            -ms-text-size-adjust: none;
            -webkit-text-size-adjust: none;
            -moz-text-size-adjust: none;
        }`;
        wnd.document.head.appendChild(style);

        comms.register("set_property", "setup", (data, ack) => {
            const kv = data as string[];
            setProperty(wnd, kv[0], kv[1]);
            ack(true);
        })
        comms.register("remove_property", "setup", (data, ack) => {
            removeProperty(wnd, data as string);
            ack(true);
        })

        comms.register("go_progression", FixedSetup.moduleName, (data, ack) => {
            ack(true);
        });

        comms.register("go_start", FixedSetup.moduleName, (_, ack) => {
            ack(true);
        });

        comms.register("go_end", FixedSetup.moduleName, (_, ack) => {
            ack(true);
        })

        comms.register("go_prev", FixedSetup.moduleName, (_, ack) => {
            ack(false);
        });

        comms.register("go_next", FixedSetup.moduleName, (_, ack) => {
            ack(false);
        });

        comms.register("unfocus", FixedSetup.moduleName, (_, ack) => {
            ack(true);
        });

        comms.register("focus", FixedSetup.moduleName, (_, ack) => {
            ack(true);
        });

        comms.log("FixedSetup Mounted");
        return true;
    }

    unmount(wnd: Window, comms: Comms): boolean {
        comms.unregisterAll(FixedSetup.moduleName);

        wnd.document.getElementById(FIXED_STYLE_ID)?.remove();

        comms.log("FixedSetup Unmounted");
        return super.unmount(wnd, comms);
    }
}