import { Comms } from "../../comms/comms";
import { Setup } from "./Setup";
import { setProperty } from "../../helpers/css";

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
        meta.setAttribute("name", "viewport");
        meta.setAttribute("id", VIEWPORT_META_TAG_ID);
        meta.setAttribute(
            "content",
            "width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, shrink-to-fit=no"
        );
        wnd.document.head.appendChild(meta);

        // Listen for resize/orientatiochange to update viewport width
        wnd.addEventListener("orientationchange", this.onViewportWidthChanged);
        wnd.addEventListener("resize", this.onViewportWidthChanged);
        this.onViewportWidthChanged({
            target: wnd
        } as any); // Cheat!

        console.log("ReflowableSetup Mounted");
        return true;
    }

    unmount(wnd: Window): boolean {
        wnd.document.head.querySelector(`#${VIEWPORT_META_TAG_ID}`)?.remove();
        wnd.removeEventListener("orientationchange", this.onViewportWidthChanged);

        console.log("ReflowableSetup Unmounted");
        return super.unmount(wnd);
    }
}