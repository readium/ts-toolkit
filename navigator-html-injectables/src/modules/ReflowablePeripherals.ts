import { Comms } from "../comms/comms";
import { Module } from "./Module";
import nearestInteractiveElement from "../helpers/nearestInteractiveElement";

export interface FrameClickEvent {
    defaultPrevented: boolean;
    interactiveElement: string | undefined;
    targetElement: string;
    x: number;
    y: number;
}

export class ReflowablePeripherals extends Module {
    static readonly moduleName = "reflowable_peripherals";
    private wnd!: Window;
    private comms!: Comms;

    onClick(event: MouseEvent) {
        if(!this.wnd.getSelection()?.isCollapsed)
            // There's an ongoing selection, the tap will dismiss it so we don't forward it.
            return;

        const pixelRatio = this.wnd.devicePixelRatio;
        const clickEvent: FrameClickEvent = {
            defaultPrevented: event.defaultPrevented,
            x: event.clientX * pixelRatio,
            y: event.clientY * pixelRatio,
            targetElement: (event.target as Element).outerHTML,
            interactiveElement: nearestInteractiveElement(event.target as Element)?.outerHTML
        }

        // if(handleDecorationClickEvent) TODO
        //     return;

        event.preventDefault(); // TODO when not to prevent?

        this.comms.send("click", clickEvent);
    }
    private readonly onClicker = this.onClick.bind(this);

    mount(wnd: Window, comms: Comms): boolean {
        this.wnd = wnd;
        this.comms = comms;
        wnd.document.addEventListener("click", this.onClicker);

        comms.log("ReflowablePeripherals Mounted");
        return true;
    }

    unmount(wnd: Window, comms: Comms): boolean {
        wnd.document.removeEventListener("click", this.onClicker);

        comms.log("ReflowablePeripherals Unmounted");
        return true;
    }
}