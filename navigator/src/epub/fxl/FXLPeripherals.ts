import FXLCoordinator, { Point } from "./FXLCoordinator";
import FramePoolManager from "./FXLFramePoolManager";

const MAX_SCALE = 6; // 6x zoom
const MIN_SCALE = 1.02;
const ZOOM_OVERSCROLL_THRESHOLD = 50;

export interface PanTracker {
    startX: number;
    endX: number;
    overscrollX: number;
    overscrollY: number;
    startY: number;
    letItGo: boolean;
    preventClick: boolean;
    translateX: number;
    translateY: number;
    touchID: number;
}

export interface PinchTracker {
    startDistance: number;
    startScale: number;
    target: Point;
    startTranslate: Point;
    touchN: number;
}

export interface Zoomer {
    scale: number;
    translate: {
        X: number;
        Y: number;
    };
}

export default class FXLPeripherals {

    private readonly manager: FramePoolManager;
    private readonly coordinator: FXLCoordinator;

    public dragState = 0;
    public pan: PanTracker = {
        startX: 0,
        endX: 0,
        startY: 0,
        overscrollX: 0,
        overscrollY: 0,
        letItGo: false,
        preventClick: false,
        translateX: 0,
        translateY: 0,
        touchID: 0
    };
    private pinch: PinchTracker = {
        startDistance: 0,
        startScale: 0,
        target: {X: 0, Y: 0},
        touchN: 0,
        startTranslate: {X: 0, Y: 0}
    };
    scale = 1;

    private frameBounds: DOMRect | null = null;

    private debugDOM = {
        show: false,
        pinchTarget: document.createElement("div"),
        touch1: document.createElement("div"),
        touch2: document.createElement("div"),
        center: document.createElement("div"),
        stats: document.createElement("div"),
    };

    constructor(manager: FramePoolManager, debug=true) {
        this.manager = manager;
        this.coordinator = new FXLCoordinator();
        this.attachEvents();

        if(debug) {
            this.debugDOM.show = true;
            this.debugDOM.pinchTarget.style.zIndex =this.debugDOM.stats.style.zIndex = this.debugDOM.center.style.zIndex = this.debugDOM.touch1.style.zIndex = this.debugDOM.touch2.style.zIndex = "100000";
            this.debugDOM.pinchTarget.style.position = this.debugDOM.stats.style.position = this.debugDOM.center.style.position = this.debugDOM.touch1.style.position = this.debugDOM.touch2.style.position = "absolute";
            this.debugDOM.pinchTarget.style.borderRadius = this.debugDOM.center.style.borderRadius = this.debugDOM.touch1.style.borderRadius = this.debugDOM.touch2.style.borderRadius = "50%";
            this.debugDOM.pinchTarget.style.pointerEvents = this.debugDOM.stats.style.pointerEvents = this.debugDOM.center.style.pointerEvents = this.debugDOM.touch1.style.pointerEvents = this.debugDOM.touch2.style.pointerEvents = "none";
            this.debugDOM.pinchTarget.style.display = this.debugDOM.center.style.display = this.debugDOM.touch1.style.display = this.debugDOM.touch2.style.display = "none";
            this.debugDOM.pinchTarget.style.paddingTop = this.debugDOM.center.style.paddingTop = "10px";
            this.debugDOM.pinchTarget.style.width = this.debugDOM.pinchTarget.style.height = this.debugDOM.center.style.width = this.debugDOM.center.style.height = "10px";
            this.debugDOM.pinchTarget.style.backgroundColor = "green";
            this.debugDOM.center.style.backgroundColor = "red";
            this.debugDOM.touch1.style.backgroundColor = this.debugDOM.touch2.style.backgroundColor = "blue";
            this.debugDOM.touch1.style.height = this.debugDOM.touch2.style.height = "20px";
            this.debugDOM.touch1.style.width = this.debugDOM.touch2.style.width = "20px";
            this.debugDOM.touch1.style.paddingTop = this.debugDOM.touch2.style.paddingTop = "20px";
            this.debugDOM.touch1.textContent = "1";
            this.debugDOM.touch2.textContent = "2";
            this.debugDOM.stats.style.padding = "20px";
            this.debugDOM.stats.style.backgroundColor = "rgba(0,0,0,0.5)";
            this.debugDOM.stats.style.color = "white";
            this.debugDOM.stats.textContent = "[stats]";
            document.body.appendChild(this.debugDOM.stats);
            document.body.appendChild(this.debugDOM.center);
            document.body.appendChild(this.debugDOM.touch1);
            document.body.appendChild(this.debugDOM.touch2);
            document.body.appendChild(this.debugDOM.pinchTarget);
        }
    }

    private readonly btouchstartHandler = this.touchstartHandler.bind(this);
    private readonly btouchendHandler = this.touchendHandler.bind(this);
    private readonly btouchmoveHandler = this.touchmoveHandler.bind(this);
    private readonly bdblclickHandler = this.dblclickHandler.bind(this);
    private readonly bclickHandler = this.clickHandler.bind(this);

    /**
     * Attaches listeners to required events.
     */
    attachEvents() {
        this.observe(this.manager.spineElement);

        // Keep track pointer hold and dragging distance
        this.pan = {
            startX: 0,
            startY: 0,
            endX: 0,
            overscrollX: 0,
            overscrollY: 0,
            letItGo: false,
            preventClick: false,
            translateX: 0,
            translateY: 0,
            touchID: 0,
        };

        this.pinch = {
            startDistance: 0,
            startScale: 0,
            target: {X: 0, Y: 0},
            startTranslate: {X: 0, Y: 0},
            touchN: 0
        };
    }

    /**
     * Clear drag after touchend and mouseup event
     */
    private clearPan() {
        this.pan.letItGo = false;
        this.pan.touchID = 0;
        this.pan.endX = 0;
        this.pan.overscrollX = 0;
        this.pan.overscrollY = 0;
    }

    private clearPinch() {
        this.pinch = {
            startDistance: 0,
            startScale: this.pinch.startScale,
            target: {X: 0, Y: 0},
            touchN: 0,
            startTranslate: {X: 0, Y: 0}
        };
    }

    observe(item: EventTarget) {
        item.addEventListener("touchstart", this.btouchstartHandler as EventListener);
        item.addEventListener("touchend", this.btouchendHandler as EventListener);
        item.addEventListener("touchmove", this.btouchmoveHandler as EventListener, {
            passive: true
        });
        item.addEventListener("dblclick", this.bdblclickHandler as EventListener, {
            passive: true
        });
        // item.addEventListener("click", this.bclickHandler as EventListener);
    }

    clickHandler(e: MouseEvent) {
        // e.preventDefault();
    }

    /**
     * touchstart event handler
     */
    touchstartHandler(e: TouchEvent) {
        console.log("TARGET", e.target);
        // Prevent dragging / swiping on inputs, selects and textareas
        const ignoreSlider = ["TEXTAREA", "OPTION", "INPUT", "SELECT"].indexOf((e.target as Element).nodeName) !== -1;
        if (ignoreSlider)
            return;

        e.stopPropagation();
        this.frameBounds = this.manager.currentBounds;
        this.coordinator.refreshOuterPixels(this.frameBounds);

        switch (e.touches.length) {
            case 3:
                // this.ui.toggle();
                return;
            case 2: {
                // Pinch
                e.preventDefault();
                this.pinch.startDistance = this.coordinator.getTouchDistance(e);

                // Reverse translate
                // Z = TX + (CX - SX) * 1 / ZS
                // CX = ZS * Z - ZS * TX + SX
                /*const cx = this.scale * this.pan.translateX - this.scale * this.pan.translateX + this.pan.startX;
                const cy = this.scale * this.pan.translateY - this.scale * this.pan.translateY + this.pan.startY;
                this.pan.startX += center!.X - cx;
                this.pan.startY += center!.Y - cy;
                this.pan.startX = center!.X;
                this.pan.startY = center!.Y;*/
                //this.pan.translateX = -1* (center!.X - this.manager.width / 2);
                //this.pan.translateY = -1* (center!.Y - this.manager.height / 2);
                const st = this.startTouch(e);
                this.pan.startX = st.X;
                this.pan.startY = st.Y;

                this.dragState = 2;
                this.manager.updateBookStyle(true);
                if(!this.isScaled) {
                    this.pinch.target = {X: 0, Y: 0};
                    this.pinch.startScale = this.scale;
                } else {
                    //console.log(this.pinch.target)
                    //console.log(this.pinch.startScale, this.scale, this.pinch.startTranslate);
                    this.pinch.target.X -= this.pan.translateX * (this.pinch.startScale / this.scale);
                    this.pinch.target.Y -= this.pan.translateY * (this.pinch.startScale / this.scale);
                    //console.log(this.pinch.target)
                    this.pinch.target = {X: 0, Y: 0};
                    //console.log(this.pinch.startScale, "VS", 1 / this.scale);
                    this.pinch.startScale = 1 / this.scale;
                }
                /*this.pinch.target = this.startTouch(e);
                this.pinch.target.X -= this.manager.width / 2;
                this.pinch.target.Y -= this.manager.height / 2;*/
                this.pinch.startTranslate = {X: this.pan.translateX, Y: this.pan.translateY};

                if(this.debugDOM.show) {
                    this.debugDOM.touch2.style.display = "";
                    this.debugDOM.center.style.display = "";
                    this.debugDOM.pinchTarget.style.display = "";
                    //this.debugDOM.pinchTarget.style.top = `${this.pinch.target.Y-5}px`;
                    //this.debugDOM.pinchTarget.style.left = `${this.pinch.target.X-5}px`;
                    //this.debugDOM.pinchTarget.innerText = `${this.pinch.target.X},${this.pinch.target.Y}`;
                }
                return;
            }
            case 1:
                this.pan.touchID = e.touches[0].identifier;
                if(this.debugDOM.show) this.debugDOM.touch1.style.display = "";
                // Fallthrough on purpose
            default:
                if(this.dragState < 1) this.dragState = 1;
                this.manager.updateBookStyle(true);
        }
        this.manager.updateSpineStyle(false);
        const st = this.startTouch(e);
        this.pan.startX = st.X;
        this.pan.startY = st.Y;
    }

    private startTouch(e: TouchEvent): Point {
        const center = this.coordinator.getTouchCenter(e) || this.coordinator.getBibiEventCoord(e);
        return {
            // SX = CX - Z * SC + MW / 2
            X: (center.X - this.manager.width / 2) - this.pan.translateX * this.scale + this.manager.width / 2,
            Y: (center.Y - this.manager.height / 2) - this.pan.translateY * this.scale + this.manager.height / 2
        };
    }

    /**
     * touchend event handler
     */
    touchendHandler(e: TouchEvent) {
        e.stopPropagation();

        if(e.touches.length === 0) {
            if ((this.pan.endX && !this.isScaled)) {
                if(this.pinch.touchN) {
                    this.pan.endX = this.pan.startX;
                }
                // Only possibly go to another page if:
                // - Moved horizontally sufficiently
                // - Not currently scale
                // - Not ending a pinch gesture
                this.updateAfterDrag();
            } else if(!this.pinch.touchN && Math.abs(this.pan.overscrollX) > ZOOM_OVERSCROLL_THRESHOLD && Math.abs(this.pan.overscrollY) < ZOOM_OVERSCROLL_THRESHOLD / 2) {
                // Panned past the limits on the horizontal axis while zoomed in.
                // This simulates dragging while not scaled.
                this.pan.startX = 0;
                this.pan.endX = -this.pan.overscrollX;
                this.updateAfterDrag();
            }
            this.dragState = 0;
            this.clearPinch();
            if(this.debugDOM.show) {
                this.debugDOM.center.style.display = "none";
                this.debugDOM.touch1.style.display = "none";
                this.debugDOM.touch2.style.display = "none";
            }
        } else if(e.touches.length === 1) {
            // Back to only one touch from 2+
            this.dragState = 1;
            if(e.touches[0].identifier !== this.pan.touchID) {
                this.pan.touchID = e.touches[0].identifier;
            }

            if(this.debugDOM.show) {
                this.debugDOM.center.style.display = "none";
                this.debugDOM.touch2.style.display = "none";
                this.debugDOM.pinchTarget.style.display = "none";
            }

            // Reverse translate
            // Z = TX + (CX - SX) * 1 / ZS
            // CX = ZS * Z - ZS * TX + SX
            /*const cx = this.scale * this.pan.translateX - this.scale * this.pan.translateX + this.pan.startX;
            const cy = this.scale * this.pan.translateY - this.scale * this.pan.translateY + this.pan.startY;
            this.pan.startX += coords.X - cx;
            this.pan.startY += coords.Y - cy;*/
            const st = this.startTouch(e);
            this.pan.startX = st.X;
            this.pan.startY = st.Y;
        }
        window.setTimeout(() => {
            // TODO
            this.manager.updateBookStyle(true);
            if(this.dragState === 0) {
                if(this.scale < MIN_SCALE) {
                    this.pan.translateX = 0;
                    this.pan.translateY = 0;
                } else {
                    /*const maxEdgeX = this.frameBounds!.width / 2 - this.manager!.width / 2 * 1 / this.scale;
                    const maxEdgeY = this.frameBounds!.height / 2 - this.manager!.height / 2 * 1 / this.scale;
                    if(this.frameBounds!.width * this.scale > this.manager!.width) this.pan.translateX = Math.max(-maxEdgeX, Math.min(maxEdgeX, this.pan.translateX));
                    if(this.frameBounds!.height * this.scale > this.manager!.height) this.pan.translateY = Math.max(-maxEdgeY, Math.min(maxEdgeY, this.pan.translateY));*/
                }
                this.clearPan();
            }
            this.manager.updateBookStyle(true);
        }, 50);
    }

    private moveFrame = 0;

    /**
     * touchmove event handler
     */
    touchmoveHandler(e: TouchEvent) {
        e.stopPropagation();
        const coords = this.coordinator.getBibiEventCoord(e);

        if ((Math.abs(this.pan.startY - coords.Y) + Math.abs(this.pan.startX - coords.X)) > 5 && this.dragState < 1)
            this.dragState = 1;

        const currentDistance = this.coordinator?.getTouchDistance(e);

        let updateBook = false;

        const oldScale = this.scale;
        const oldDistance = this.pinch.startDistance;
        if(this.dragState === 2 && currentDistance) {
            this.pinch.touchN++;
            if(this.pinch.touchN < 4) return;
            let newScale = currentDistance / this.pinch.startDistance * this.scale;
            if(newScale >= MAX_SCALE)
                newScale = MAX_SCALE;
            if(newScale <= MIN_SCALE)
                newScale = 1;
            this.scale = newScale;
            this.pinch.startDistance = currentDistance;
            updateBook = true;
        }

        if (this.pan.letItGo === false) {
            this.pan.letItGo = Math.abs(this.pan.startY - coords.Y) < Math.abs(this.pan.startX - coords.X);
        }

        if(this.debugDOM.show) {
            this.debugDOM.touch1.style.top = `${coords.Y-10}px`;
            this.debugDOM.touch1.style.left = `${coords.X-10}px`;
            this.debugDOM.touch1.innerText = `${coords.X.toFixed(2)},${coords.Y.toFixed(2)}`;
        }

        if ((this.dragState > 0 && this.isScaled) || this.dragState > 1) {
            if(this.dragState === 1) {
                const center = {
                    X: coords.X - this.manager.width / 2,
                    Y: coords.Y - this.manager.height / 2
                };
                // Z = (CX - (SX - MW / 2)) * 1 / SC
                this.pan.translateX = (center.X - (this.pan.startX - this.manager.width / 2)) * 1 / this.scale;
                this.pan.translateY = (center.Y - (this.pan.startY - this.manager.height / 2)) * 1 / this.scale;
                //console.log("#1", this.pan.translateY, "<- (", center.Y, "-", this.pan.startY, ") * 1 /", this.scale);
            } else if(this.dragState === 2) {
                const center = this.coordinator.getTouchCenter(e)!;
                if(this.debugDOM.show) {
                    this.debugDOM.center.style.top = `${center.Y-5}px`;
                    this.debugDOM.center.style.left = `${center.X-5}px`;
                    this.debugDOM.center.innerText = `${center.X.toFixed(2)},${center.Y.toFixed(2)}`;

                    const coords = this.coordinator.getBibiEventCoord(e, 1);
                    this.debugDOM.touch2.style.top = `${coords.Y-10}px`;
                    this.debugDOM.touch2.style.left = `${coords.X-10}px`;
                    this.debugDOM.touch2.innerText = `${coords.X.toFixed(2)},${coords.Y.toFixed(2)}`;
                }

                center.X -= this.manager.width / 2;
                center.Y -= this.manager.height / 2;

                /*
                const pinchMultiplier = this.scale / this.pinch.startScale;
                center.X /= pinchMultiplier;
                center.Y /= pinchMultiplier;
                */
                //const pinchMultiplier = this.scale / this.pinch.startScale;

                let ptx = -center.X / oldScale;
                ptx += center.X / this.scale;
                //ptx += (this.pan.translateX - this.pinch.startTranslate.X) * pinchMultiplier; // Pan align
                this.pinch.target.X += ptx;
                center.X += this.pinch.target.X * this.scale / this.pinch.startScale;

                let pty = -center.Y / oldScale;
                pty += center.Y / this.scale;
                //pty += (this.pan.translateY - this.pinch.startTranslate.Y) * pinchMultiplier; // Pan align
                this.pinch.target.Y += pty;
                center.Y += this.pinch.target.Y * this.scale / this.pinch.startScale;

                // Z = (CX - (SX - MW / 2)) * 1 / SC
                let translateX = (center.X - (this.pan.startX - this.manager.width / 2)) * 1 / this.scale;
                let translateY = (center.Y - (this.pan.startY - this.manager.height / 2)) * 1 / this.scale;

                //

                this.pan.translateX = translateX;
                this.pan.translateY = translateY;
                // console.log("#2", this.pan.translateY, "<- (", center.Y, "-", this.pan.startY, ") * 1 /", this.scale);

                //(this.pinch.target.X - this.manager.width / 2) - this.pan.translateX * this.scale + this.manager.width / 2
                ///(center.Y - this.manager.height / 2) - this.pan.translateY * this.scale + this.manager.height / 2

                if(this.debugDOM.show) {
                    this.debugDOM.pinchTarget.style.left = `${this.pinch.target.X * this.scale / this.pinch.startScale-5+this.manager.width / 2}px`;
                    this.debugDOM.pinchTarget.style.top = `${this.pinch.target.Y * this.scale / this.pinch.startScale-5+this.manager.height / 2}px`;
                    this.debugDOM.pinchTarget.innerText = `${(this.pinch.target.X * this.scale / this.pinch.startScale).toFixed(2)},${(this.pinch.target.Y * this.scale / this.pinch.startScale).toFixed(2)}`;
                }
            }

            const maxEdgeX = this.frameBounds!.width / 2;
            const maxEdgeY = this.frameBounds!.height / 2;

            if (this.pan.translateX < -maxEdgeX) {
                this.pan.overscrollX = -(maxEdgeX + this.pan.translateX);
                this.pan.translateX = -maxEdgeX;
            }
            if (this.pan.translateY < -maxEdgeY) {
                this.pan.overscrollY = -(maxEdgeY + this.pan.translateY);
                this.pan.translateY = -maxEdgeY;
            }

            if (this.pan.translateX > maxEdgeX) {
                this.pan.overscrollX = maxEdgeX - this.pan.translateX;
                this.pan.translateX = maxEdgeX;
            }
            if (this.pan.translateY > maxEdgeY) {
                this.pan.overscrollY = maxEdgeY - this.pan.translateY;
                this.pan.translateY = maxEdgeY;
            }

            updateBook = true;

            if(this.debugDOM.show)
                this.debugDOM.stats.innerText =
                    `TX: ${this.pan.translateX.toFixed(2)}\nTY: ${this.pan.translateY.toFixed(2)}\nZoom: ${this.scale.toFixed(2)}\nOverscroll: ${this.pan.overscrollX.toFixed(2)},${this.pan.overscrollY.toFixed(2)}`;
        }

        if(updateBook) {
            this.manager.updateBookStyle();
            return;
        }

        /*if(this.slider.ttb) {
            this.ui.mousing = false;
            return;
        }*/

        if (this.dragState > 0 && this.pan.letItGo) {
            this.pan.endX = coords.X;
            // this.manager.updateSpineStyle(false);

            const currentSlide = this.manager.currentSlide;
            const currentOffset = currentSlide * (this.manager.width / this.manager.perPage);
            const dragOffset = (this.pan.endX - this.pan.startX);
            const offset = this.manager.rtl ? currentOffset + dragOffset : currentOffset - dragOffset;

            cancelAnimationFrame(this.moveFrame);
            this.moveFrame = requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    this.manager.spineElement.style.transform = `translate3d(${(this.manager.rtl ? 1 : -1) * offset}px, 0, 0)`;
                })
            });
        }
    }

    private dtimer: number;
    private pdblclick: boolean;
    private disableDblClick: boolean;
    dblclickHandler(e: MouseEvent) {
        clearTimeout(this.dtimer);
        this.pdblclick = true;
        this.dtimer = window.setTimeout(() => this.pdblclick = false, 200);

        if(this.disableDblClick) return;

        
        if(this.isScaled) this.scale = 1;

        // TODO smarter
        /*const ev = this.coordinator.getBibiEvent(e);
        this.scale = this.isScaled ? 1 : 2;
        if (this.isScaled)
            this.pan.translate = {
                X: ev.Coord.X / 2,
                Y: ev.Coord.Y / 2
            };
        this.manager.updateBookStyle();*/
    }

    public get isScaled() {
        return this.scale > 1;
    }

    /**
     * Recalculate drag/swipe event and reposition the frame of a slider
     */
    private updateAfterDrag() {
        const movement = (this.manager.rtl ? -1 : 1) * (this.pan.endX - this.pan.startX);
        const movementDistance = Math.abs(movement);

        if (movement > 0 && movementDistance > this.manager.threshold && this.manager.slength > this.manager.perPage) {
            this.manager.listener("no_less", undefined);
        } else if (movement < 0 && movementDistance > this.manager.threshold && this.manager.slength > this.manager.perPage) {
            this.manager.listener("no_more", undefined);
        }
        // this.ui.toggle(false);
        this.manager.slideToCurrent(true, true); // slideToNegativeClone || slideToPositiveClone
    }
}