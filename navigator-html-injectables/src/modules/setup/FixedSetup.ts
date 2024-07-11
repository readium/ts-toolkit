import { Comms } from "../../comms/comms";
import { Setup } from "./Setup";
import { removeProperty, setProperty } from "../../helpers/css";
import { ModuleName } from "../ModuleLibrary";
import { ReadiumWindow } from "../../helpers/dom";

const FIXED_STYLE_ID = "readium-fixed-style";

export class FixedSetup extends Setup {
    static readonly moduleName: ModuleName = "fixed_setup";

    mount(wnd: Window, comms: Comms): boolean {
        if(!super.mount(wnd, comms)) return false;

        const style = wnd.document.createElement("style");
        style.id = FIXED_STYLE_ID;
        style.dataset.readium = "true";
        style.textContent = `
        html, body {
            text-size-adjust: none;
            -ms-text-size-adjust: none;
            -webkit-text-size-adjust: none;
            -moz-text-size-adjust: none;

            /* Fight Safari pinches */
            touch-action: none !important;
            min-height: 100%;

            /*cursor: var() TODO*/
        }`;
        wnd.document.head.appendChild(style);

        comms.register("set_property", FixedSetup.moduleName, (data, ack) => {
            const kv = data as string[];
            setProperty(wnd, kv[0], kv[1]);
            ack(true);
        })
        comms.register("remove_property", FixedSetup.moduleName, (data, ack) => {
            removeProperty(wnd, data as string);
            ack(true);
        })

        comms.register("first_visible_locator", FixedSetup.moduleName, (_, ack) => ack(false))

        comms.register([
            "focus", "unfocus", "go_next", "go_prev",
            "go_id", "go_end", "go_start", "go_text",
            "go_progression"
        ], FixedSetup.moduleName, (_, ack) => ack(true));

        comms.register("activate", FixedSetup.moduleName, (_, ack) => {
            this.unblock(wnd as ReadiumWindow);
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