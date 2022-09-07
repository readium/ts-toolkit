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

    private pointerMoved = false;

    onPointUp(event: PointerEvent) {
        if(this.pointerMoved) {
            // If the pointer moved while tapping it's not a tap to consider
            this.pointerMoved = false;
            return;
        }

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

        this.pointerMoved = false;
    }
    private readonly onPointerUp = this.onPointUp.bind(this);

    onPointMove(event: PointerEvent) {
        if(event.movementY !== undefined && event.movementX !== undefined) {
            if(Math.abs(event.movementX) > 1 || Math.abs(event.movementY) > 1) {
                this.pointerMoved = true;
            }
            return;
        }

        this.pointerMoved = true;
    }
    private readonly onPointerMove = this.onPointMove.bind(this);

    onClick(event: MouseEvent) {
        // To prevent certain browser actions
        event.preventDefault(); // TODO when not to prevent?
    }
    private readonly onClicker = this.onClick.bind(this);

    mount(wnd: Window, comms: Comms): boolean {
        this.wnd = wnd;
        this.comms = comms;
        wnd.document.addEventListener("pointerup", this.onPointerUp);
        wnd.document.addEventListener("pointermove", this.onPointerMove);
        wnd.document.addEventListener("click", this.onClicker);

        comms.log("ReflowablePeripherals Mounted");
        return true;
    }

    unmount(wnd: Window, comms: Comms): boolean {
        wnd.document.removeEventListener("pointerup", this.onPointerUp);
        wnd.document.removeEventListener("pointermove", this.onPointerMove);
        wnd.document.removeEventListener("click", this.onClicker);

        comms.log("ReflowablePeripherals Unmounted");
        return true;
    }
}