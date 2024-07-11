import { Comms } from "../../comms/comms";
import { Setup } from "./Setup";
import { removeProperty, setProperty } from "../../helpers/css";
import { ReadiumWindow } from "../../helpers/dom";

const VIEWPORT_META_TAG_ID = "readium-viewport";

export class ReflowableSetup extends Setup {
    static readonly moduleName = "reflowable_setup";

    onViewportWidthChanged(event: Event) {
        const wnd = event.target as Window;
        // const pageWidth = wnd.innerWidth / wnd.devicePixelRatio;
        setProperty(wnd, "--RS__viewportWidth", `calc(${wnd.innerWidth}px / ${wnd.devicePixelRatio})`);
    }

    mount(wnd: Window, comms: Comms): boolean {
        if(!super.mount(wnd, comms)) return false;

        // Add viewport tag
        const meta = wnd.document.createElement("meta");
        meta.dataset.readium = "true";
        meta.setAttribute("name", "viewport");
        meta.setAttribute("id", VIEWPORT_META_TAG_ID);
        meta.setAttribute(
            "content",
            "width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, shrink-to-fit=no"
        );
        wnd.document.head.appendChild(meta);

        // Listen for resize/orientationchange to update viewport width
        wnd.addEventListener("orientationchange", this.onViewportWidthChanged);
        wnd.addEventListener("resize", this.onViewportWidthChanged);
        this.onViewportWidthChanged({
            target: wnd
        } as any); // Cheat!

        comms.register("set_property", ReflowableSetup.moduleName, (data, ack) => {
            const kv = data as string[];
            setProperty(wnd, kv[0], kv[1]);
            ack(true);
        });
        comms.register("remove_property", ReflowableSetup.moduleName, (data, ack) => {
            removeProperty(wnd, data as string);
            ack(true);
        });

        comms.register("activate", ReflowableSetup.moduleName, (_, ack) => {
            this.unblock(wnd as ReadiumWindow);
            ack(true);
        });

        comms.log("ReflowableSetup Mounted");
        return true;
    }

    unmount(wnd: Window, comms: Comms): boolean {
        comms.unregisterAll(ReflowableSetup.moduleName);
        wnd.document.head.querySelector(`#${VIEWPORT_META_TAG_ID}`)?.remove();
        wnd.removeEventListener("orientationchange", this.onViewportWidthChanged);

        comms.log("ReflowableSetup Unmounted");
        return super.unmount(wnd, comms);
    }
}