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

    onPoint(event: PointerEvent) {
        if(!this.wnd.getSelection()?.isCollapsed)
            // There's an ongoing selection, the tap will dismiss it so we don't forward it.
            return;

        // if(handleDecorationClickEvent) TODO
        //     return;
        if(!event.isPrimary) return;

        const pixelRatio = this.wnd.devicePixelRatio;
        event.preventDefault(); // TODO when not to prevent?
        this.comms.send(event.pointerType === "touch" ? "tap" : "click", {
            defaultPrevented: event.defaultPrevented,
            x: event.clientX * pixelRatio,
            y: event.clientY * pixelRatio,
            targetElement: (event.target as Element).outerHTML,
            interactiveElement: nearestInteractiveElement(event.target as Element)?.outerHTML
        } as FrameClickEvent);
    }
    private readonly onPointer = this.onPoint.bind(this);

    onClick(event: MouseEvent) {
        // To prevent certain browser actions
        event.preventDefault(); // TODO when not to prevent?
    }
    private readonly onClicker = this.onClick.bind(this);

    mount(wnd: Window, comms: Comms): boolean {
        this.wnd = wnd;
        this.comms = comms;
        wnd.document.addEventListener("pointerup", this.onPointer);
        wnd.document.addEventListener("click", this.onClicker);

        comms.log("ReflowablePeripherals Mounted");
        return true;
    }

    unmount(wnd: Window, comms: Comms): boolean {
        wnd.document.removeEventListener("pointerup", this.onPointer);
        wnd.document.removeEventListener("click", this.onClicker);

        comms.log("ReflowablePeripherals Unmounted");
        return true;
    }
}