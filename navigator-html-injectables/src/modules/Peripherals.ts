import { Comms } from "../comms/comms";
import { Module } from "./Module";
import { ReadiumWindow, nearestInteractiveElement } from "../helpers/dom";

export interface FrameClickEvent {
    defaultPrevented: boolean;
    doNotDisturb: boolean;
    interactiveElement: string | undefined;
    cssSelector: string | undefined;
    targetElement: string;
    targetFrameSrc: string;
    x: number;
    y: number;
}

export interface BasicTextSelection {
    text: string;
    x: number;
    y: number;
    width: number;
    height: number;
    targetFrameSrc: string;
}

export class Peripherals extends Module {
    static readonly moduleName = "peripherals";
    private wnd!: ReadiumWindow;
    private comms!: Comms;

    private pointerMoved = false;

    onPointUp(event: PointerEvent) {
        const selection = this.wnd.getSelection();
        if (!!selection && selection.toString()?.length > 0) {
            const domRectList = selection.getRangeAt(0)?.getClientRects();
            // Sanity check to avoid sending empty selections
            if (!domRectList || domRectList.length === 0) {
                return;
            }
            const rect = domRectList[0];
            const textSelection = {
                text: selection.toString(),
                x: rect.x,
                y: rect.y,
                width: rect.width,
                height: rect.height,
                targetFrameSrc: this.wnd?.location?.href,
            }
            this.comms.send("text_selected", textSelection as BasicTextSelection);
        }
        if (this.pointerMoved) {
            // If the pointer moved while tapping it's not a tap to consider
            this.pointerMoved = false;
            return;
        }

        if(!selection?.isCollapsed)
            // There's an ongoing selection, the tap will dismiss it so we don't forward it.
            return;

        // if(handleDecorationClickEvent) // TODO handle clicking on decorators
        //     return;
        if(!event.isPrimary) return;

        const pixelRatio = this.wnd.devicePixelRatio;
        event.preventDefault(); // May have side-effects
        this.comms.send(event.pointerType === "touch" ? "tap" : "click", {
            defaultPrevented: event.defaultPrevented,
            x: event.clientX * pixelRatio,
            y: event.clientY * pixelRatio,
            targetFrameSrc: this.wnd.location.href,
            targetElement: (event.target as Element).outerHTML,
            interactiveElement: nearestInteractiveElement(event.target as Element)?.outerHTML,
            cssSelector: this.wnd._readium_cssSelectorGenerator.getCssSelector(event.target),
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

    onPointDown() {
        this.pointerMoved = false;
    }
    private readonly onPointerDown = this.onPointDown.bind(this);

    onContext(event: MouseEvent) {
        // If the context menu is triggered by a long press, we manage the event using the pointup event
        this.onPointUp(event as PointerEvent);
        this.pointerMoved = false;
    }
    private readonly onContextMenu = this.onContext.bind(this);

    onClick(event: MouseEvent) {
        event.preventDefault(); // To prevent certain browser actions. May have side-effects
        if(!event.isTrusted) {
            // Synthetic events (probably triggered by some JavaScript) are probably not going to
            // also send a `pointerup` event, so we have to compensate by doing so for them
            const synthEvent = new PointerEvent("pointerup", {
                isPrimary: true,
                pointerType: "mouse", // Not really a better choice than this
                clientX: event.clientX,
                clientY: event.clientY,
            });
            // Override properties we cannot set in the constructor
            Object.defineProperty(synthEvent, 'target', {writable: false, value: event.target});
            Object.defineProperty(synthEvent, 'defaultPrevented', {writable: false, value: event.defaultPrevented });
            // Trigger `pointerup` event
            this.onPointUp(synthEvent);
        }
    }
    private readonly onClicker = this.onClick.bind(this);

    mount(wnd: ReadiumWindow, comms: Comms): boolean {
        this.wnd = wnd;
        this.comms = comms;
        wnd.document.addEventListener("pointerdown", this.onPointerDown);
        wnd.document.addEventListener("pointerup", this.onPointerUp);
        wnd.document.addEventListener("contextmenu", this.onContextMenu);
        wnd.document.addEventListener("pointermove", this.onPointerMove);
        wnd.document.addEventListener("click", this.onClicker);

        comms.log("Peripherals Mounted");
        return true;
    }

    unmount(wnd: ReadiumWindow, comms: Comms): boolean {
        wnd.document.removeEventListener("pointerdown", this.onPointerDown);
        wnd.document.removeEventListener("pointerup", this.onPointerUp);
        wnd.document.removeEventListener("contextmenu", this.onContextMenu);
        wnd.document.removeEventListener("pointermove", this.onPointerMove);
        wnd.document.removeEventListener("click", this.onClicker);

        comms.log("Peripherals Unmounted");
        return true;
    }
}