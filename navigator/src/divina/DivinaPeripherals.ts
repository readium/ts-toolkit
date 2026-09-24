import { FXLCoordinator, Point } from "../epub/fxl/FXLCoordinator.ts";
import { isTypedOMSupported, PanTracker, PinchTracker } from "../epub/fxl/FXLPeripherals.ts";

const MAX_SCALE = 6; // 6x zoom
const MIN_SCALE = 1.02;
const ZOOM_STEP = 0.5; // Zoom in/out increment (keyboard)
const ZOOM_OVERSCROLL_THRESHOLD = 50;
const CLICK_SLOP = 5; // px of movement below which a pointer interaction is a click/tap
const WHEEL_COOLDOWN = 200; // ms of wheel quiet before a new gesture can turn a page
const DOUBLE_TAP_WINDOW = 300; // ms between taps to count as a double tap
const DOUBLE_TAP_SLOP = 60; // px between taps to count as a double tap

export type DivinaManagerEventKey = "no_more" | "no_less" | "zoom" | "tap" | "click";

export interface DivinaPointerEvent {
    x: number; // relative to the book element, multiplied by devicePixelRatio
    y: number;
    clientX: number;
    clientY: number;
    doNotDisturb: boolean;
}

/**
 * The narrow surface of DivinaPagedPresenter that the peripherals interact with.
 * Mirrors what FXLPeripherals uses from FXLFramePoolManager.
 */
export interface DivinaPagedManager {
    readonly spineElement: HTMLDivElement;
    readonly bookElement: HTMLDivElement;
    readonly width: number;
    readonly height: number;
    readonly perPage: number;
    readonly rtl: boolean;
    readonly threshold: number;
    readonly length: number; // Total slot count in the current mode
    readonly currentSlide: number;
    readonly currentBounds: DOMRect;
    listener(key: DivinaManagerEventKey, data: unknown): void;
    updateBookStyle(initial?: boolean): void;
    updateSpineStyle(animate: boolean, fast?: boolean): void;
    slideToCurrent(enableTransition?: boolean, fast?: boolean): void;
    deselect(): void;
}

/**
 * Input handling for the paged Divina presenter. Ported from FXLPeripherals
 * (touch pan/pinch-zoom/swipe state machines) with additions for content that
 * lives in the host DOM instead of iframes: click/tap synthesis, mouse wheel
 * page turning (one page per wheel burst, xbreader/bibi-like), ctrl+wheel and
 * double-click zoom.
 */
export class DivinaPeripherals {
    private readonly manager: DivinaPagedManager;
    private readonly coordinator: FXLCoordinator;

    public dragState = 0;
    private minimumMoved = false;
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
        target: { X: 0, Y: 0 },
        touchN: 0,
        startTranslate: { X: 0, Y: 0 }
    };

    // Scale
    private _scale = 1;
    public get scale() {
        return this._scale;
    }
    private scaleDebouncer = 0;
    public set scale(value: number) {
        if(isNaN(value)) value = 1;
        window.clearTimeout(this.scaleDebouncer);
        this.scaleDebouncer = window.setTimeout(() => {
            if(this.dragState === 0) {
                if(this.scale < MIN_SCALE) {
                    this.pan.translateX = 0;
                    this.pan.translateY = 0;
                    this.clearPan();
                    this.manager.updateBookStyle();
                }
            }
            this.manager.listener("zoom", value);
        }, 100);
        this._scale = value;
    }

    private frameBounds: DOMRect | null = null;
    private destroyed = false;

    // Mouse click tracking
    private mouseDown: Point | null = null;
    private clickTimer = 0;
    private lastTouchEnd = 0;

    // Tap tracking (double-tap detection)
    private tapTimer = 0;
    private lastTapTime = 0;
    private lastTapX = 0;
    private lastTapY = 0;

    // Wheel gesture state (one page turn per burst)
    private wheelHot = false;
    private wheelLastDir = 0;
    private wheelLastMag = 0;
    private wheelDecelCount = 0;
    private wheelLastEvent = 0;
    private wheelCooldownTimer = 0;

    constructor(manager: DivinaPagedManager) {
        this.manager = manager;
        this.coordinator = new FXLCoordinator();
        this.observe(this.manager.spineElement);
        this.manager.bookElement.addEventListener("wheel", this.bwheelHandler, { passive: false });
    }

    private readonly btouchstartHandler = this.touchstartHandler.bind(this);
    private readonly btouchendHandler = this.touchendHandler.bind(this);
    private readonly btouchmoveHandler = this.touchmoveHandler.bind(this);
    private readonly bdblclickHandler = this.dblclickHandler.bind(this);
    private readonly bmousedownHandler = this.mousedownHandler.bind(this);
    private readonly bmouseupHandler = this.mouseupHandler.bind(this);
    private readonly bmousemoveHandler = this.mousemoveHandler.bind(this);
    private readonly bwheelHandler = this.wheelHandler.bind(this);

    observe(item: EventTarget) {
        item.addEventListener("touchstart", this.btouchstartHandler as EventListener);
        item.addEventListener("touchend", this.btouchendHandler as EventListener);
        item.addEventListener("touchmove", this.btouchmoveHandler as EventListener, {
            passive: true
        });
        item.addEventListener("dblclick", this.bdblclickHandler as EventListener, {
            passive: true
        });
        item.addEventListener("mousedown", this.bmousedownHandler as EventListener);
        item.addEventListener("mouseup", this.bmouseupHandler as EventListener);
        item.addEventListener("mousemove", this.bmousemoveHandler as EventListener);
    }

    unobserve(item: EventTarget) {
        item.removeEventListener("touchstart", this.btouchstartHandler as EventListener);
        item.removeEventListener("touchend", this.btouchendHandler as EventListener);
        item.removeEventListener("touchmove", this.btouchmoveHandler as EventListener);
        item.removeEventListener("dblclick", this.bdblclickHandler as EventListener);
        item.removeEventListener("mousedown", this.bmousedownHandler as EventListener);
        item.removeEventListener("mouseup", this.bmouseupHandler as EventListener);
        item.removeEventListener("mousemove", this.bmousemoveHandler as EventListener);
    }

    destroy() {
        this.destroyed = true;
        this.unobserve(this.manager.spineElement);
        this.manager.bookElement.removeEventListener("wheel", this.bwheelHandler);
        window.clearTimeout(this.scaleDebouncer);
        window.clearTimeout(this.wheelCooldownTimer);
        window.clearTimeout(this.clickTimer);
        window.clearTimeout(this.tapTimer);
        cancelAnimationFrame(this.moveFrame);
    }

    private clearPan() {
        this.pan.letItGo = false;
        this.pan.touchID = 0;
        this.pan.endX = 0;
        this.pan.overscrollX = 0;
        this.pan.overscrollY = 0;
    }

    public clearPinch() {
        this.pinch = {
            startDistance: 0,
            startScale: this.pinch.startScale,
            target: { X: 0, Y: 0 },
            touchN: 0,
            startTranslate: { X: 0, Y: 0 }
        };
    }

    public get isScaled() {
        return this.scale > 1;
    }

    public resetZoom() {
        this.scale = 1;
        this.pan.translateX = 0;
        this.pan.translateY = 0;
        this.manager.updateBookStyle();
    }

    private emitPointer(key: "tap" | "click", clientX: number, clientY: number) {
        const rect = this.manager.bookElement.getBoundingClientRect();
        const dpr = window.devicePixelRatio || 1;
        const data: DivinaPointerEvent = {
            x: (clientX - rect.left) * dpr,
            y: (clientY - rect.top) * dpr,
            clientX,
            clientY,
            doNotDisturb: this.pan.touchID > 0 || this.dragState > 0
        };
        this.manager.listener(key, data);
    }

    /**
     * touchstart event handler (ported from FXLPeripherals)
     */
    touchstartHandler(e: TouchEvent) {
        const ignoreSlider = ["TEXTAREA", "OPTION", "INPUT", "SELECT"].indexOf((e.target as Element).nodeName) !== -1;
        if (ignoreSlider)
            return;

        e.stopPropagation();
        this.frameBounds = this.manager.currentBounds;
        this.coordinator.refreshOuterPixels(this.frameBounds);

        switch (e.touches.length) {
            case 3:
                return;
            case 2: {
                // Pinch
                e.preventDefault();
                this.pinch.startDistance = this.coordinator.getTouchDistance(e);
                const st2 = this.startTouch(e);
                this.pan.startX = st2.X;
                this.pan.startY = st2.Y;

                this.dragState = 2;
                this.manager.updateBookStyle(true);
                if(!this.isScaled) {
                    this.pinch.target = { X: 0, Y: 0 };
                    this.pinch.startScale = this.scale;
                } else {
                    this.pinch.target.X -= this.pan.translateX * (this.pinch.startScale / this.scale);
                    this.pinch.target.Y -= this.pan.translateY * (this.pinch.startScale / this.scale);
                    this.pinch.target = { X: 0, Y: 0 };
                    this.pinch.startScale = 1 / this.scale;
                }
                this.pinch.startTranslate = { X: this.pan.translateX, Y: this.pan.translateY };
                return;
            }
            // @ts-ignore
            case 1:
                this.pan.touchID = e.touches[0].identifier;
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
            X: (center.X - this.manager.width / 2) - this.pan.translateX * this.scale + this.manager.width / 2,
            Y: (center.Y - this.manager.height / 2) - this.pan.translateY * this.scale + this.manager.height / 2
        };
    }

    /**
     * touchend event handler (ported from FXLPeripherals, adds tap synthesis)
     */
    touchendHandler(e: TouchEvent) {
        e.stopPropagation();

        if(!e.touches || e.touches.length === 0) {
            const wasPinch = this.pinch.touchN > 0;
            if ((this.pan.endX && !this.isScaled)) {
                if(this.pinch.touchN) {
                    this.pan.endX = this.pan.startX;
                }
                this.updateAfterDrag();
            } else if(!this.pinch.touchN && Math.abs(this.pan.overscrollX) > ZOOM_OVERSCROLL_THRESHOLD && Math.abs(this.pan.overscrollY) < ZOOM_OVERSCROLL_THRESHOLD / 2) {
                // Panned past the limits on the horizontal axis while zoomed in;
                // simulates dragging while not scaled.
                this.pan.startX = 0;
                this.pan.endX = -this.pan.overscrollX;
                this.updateAfterDrag();
            } else if(!this.minimumMoved && !wasPinch && e.changedTouches?.length === 1) {
                // Stationary single-finger touch: it's a tap. Suppress the
                // compatibility mouse events and clear the drag state before
                // emitting, so the tap isn't flagged as an in-progress drag.
                if(e.cancelable) e.preventDefault();
                this.lastTouchEnd = performance.now();
                this.dragState = 0;
                this.clearPan();
                const { clientX, clientY } = e.changedTouches[0];
                const now = performance.now();
                if(now - this.lastTapTime < DOUBLE_TAP_WINDOW &&
                    Math.abs(clientX - this.lastTapX) + Math.abs(clientY - this.lastTapY) < DOUBLE_TAP_SLOP) {
                    // Double tap: cancel the pending single-tap action and toggle zoom
                    window.clearTimeout(this.tapTimer);
                    this.lastTapTime = 0;
                    this.toggleZoom(clientX, clientY);
                } else {
                    this.lastTapTime = now;
                    this.lastTapX = clientX;
                    this.lastTapY = clientY;
                    // Delay so a double tap (zoom) can cancel the single-tap action
                    window.clearTimeout(this.tapTimer);
                    this.tapTimer = window.setTimeout(() => this.emitPointer("tap", clientX, clientY), DOUBLE_TAP_WINDOW);
                }
            }
            this.dragState = 0;
            this.minimumMoved = false;
            this.clearPinch();
        } else if(e.touches.length === 1) {
            // Back to only one touch from 2+
            this.dragState = 1;
            if(e.touches[0].identifier !== this.pan.touchID) {
                this.pan.touchID = e.touches[0].identifier;
            }
            const st = this.startTouch(e);
            this.pan.startX = st.X;
            this.pan.startY = st.Y;
        }
        window.setTimeout(() => {
            if(this.destroyed) return;
            this.manager.updateBookStyle(true);
            if(this.dragState === 0) {
                if(this.scale < MIN_SCALE) {
                    this.pan.translateX = 0;
                    this.pan.translateY = 0;
                }
                this.clearPan();
            }
            this.manager.updateBookStyle(true);
        }, 50);
    }

    private moveFrame = 0;

    // Reused typed transform for the per-frame drag write: allocating fresh
    // CSSTransformValue/CSSTranslate objects per write is slower than string
    // parsing; mutating a persistent one is faster than both
    private dragTranslate: CSSTranslate | null = null;
    private dragTransform: CSSTransformValue | null = null;

    /**
     * touchmove event handler (ported from FXLPeripherals)
     */
    touchmoveHandler(e: TouchEvent) {
        e.stopPropagation();
        const coords = this.coordinator.getBibiEventCoord(e);

        if ((Math.abs(this.pan.startY - coords.Y) + Math.abs(this.pan.startX - coords.X)) > CLICK_SLOP) {
            if(!this.minimumMoved) {
                this.manager.deselect();
                this.minimumMoved = true;
            }
            if(this.dragState < 1) this.dragState = 1;
        }

        const currentDistance = this.coordinator?.getTouchDistance(e);

        let updateBook = false;

        const oldScale = this.scale;
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

        if ((this.dragState > 0 && this.isScaled) || this.dragState > 1) {
            if(this.dragState === 1) {
                const center = {
                    X: coords.X - this.manager.width / 2,
                    Y: coords.Y - this.manager.height / 2
                };
                this.pan.translateX = (center.X - (this.pan.startX - this.manager.width / 2)) * 1 / this.scale;
                this.pan.translateY = (center.Y - (this.pan.startY - this.manager.height / 2)) * 1 / this.scale;
            } else if(this.dragState === 2) {
                const center = this.coordinator.getTouchCenter(e)!;
                center.X -= this.manager.width / 2;
                center.Y -= this.manager.height / 2;

                let ptx = -center.X / oldScale;
                ptx += center.X / this.scale;
                this.pinch.target.X += ptx;
                center.X += this.pinch.target.X * this.scale / this.pinch.startScale;

                let pty = -center.Y / oldScale;
                pty += center.Y / this.scale;
                this.pinch.target.Y += pty;
                center.Y += this.pinch.target.Y * this.scale / this.pinch.startScale;

                this.pan.translateX = (center.X - (this.pan.startX - this.manager.width / 2)) * 1 / this.scale;
                this.pan.translateY = (center.Y - (this.pan.startY - this.manager.height / 2)) * 1 / this.scale;
            }

            const maxEdgeX = this.frameBounds!.width / 6;
            const maxEdgeY = this.frameBounds!.height / 6;

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
        }

        if(updateBook) {
            this.manager.updateBookStyle();
            return;
        }

        if (this.dragState > 0 && this.pan.letItGo) {
            this.pan.endX = coords.X;

            const currentSlide = this.manager.currentSlide;
            const currentOffset = currentSlide * (this.manager.width / this.manager.perPage);
            const dragOffset = (this.pan.endX - this.pan.startX);
            const offset = this.manager.rtl ? currentOffset + dragOffset : currentOffset - dragOffset;
            // Snap the translation to device pixels: at fractional offsets the
            // spread gutter is rasterized with a hairline gap between the pages
            const dpr = window.devicePixelRatio || 1;
            const snapped = Math.round((this.manager.rtl ? 1 : -1) * offset * dpr) / dpr;

            cancelAnimationFrame(this.moveFrame);
            this.moveFrame = requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    if(this.destroyed) return;
                    if(isTypedOMSupported()) {
                        if(!this.dragTransform) {
                            this.dragTranslate = new CSSTranslate(CSS.px(0), CSS.px(0), CSS.px(0));
                            this.dragTransform = new CSSTransformValue([this.dragTranslate]);
                        }
                        (this.dragTranslate!.x as CSSUnitValue).value = snapped;
                        this.manager.spineElement.attributeStyleMap.set("transform", this.dragTransform);
                    } else {
                        this.manager.spineElement.style.transform = `translate3d(${snapped}px, 0, 0)`;
                    }
                })
            });
        }
    }

    /**
     * Double click/tap: toggle zoom between 1x and 2x, centered on the point.
     */
    toggleZoom(clientX: number, clientY: number) {
        if(this.isScaled) {
            this.resetZoom();
            return;
        }
        const rect = this.manager.bookElement.getBoundingClientRect();
        const x = clientX - rect.left;
        const y = clientY - rect.top;
        this.frameBounds = this.manager.currentBounds;
        const maxEdgeX = this.frameBounds.width / 6;
        const maxEdgeY = this.frameBounds.height / 6;
        this.scale = 2;
        this.pan.translateX = Math.max(-maxEdgeX, Math.min(maxEdgeX, this.manager.width / 2 - x));
        this.pan.translateY = Math.max(-maxEdgeY, Math.min(maxEdgeY, this.manager.height / 2 - y));
        this.manager.updateBookStyle();
    }

    /** Zoom in/out by a keyboard step, clamped to [1, MAX_SCALE] */
    zoomBy(delta: number) {
        let newScale = this.scale + delta;
        if(newScale >= MAX_SCALE) newScale = MAX_SCALE;
        if(newScale <= MIN_SCALE) newScale = 1;
        this.scale = newScale;
        if(newScale === 1) {
            this.pan.translateX = 0;
            this.pan.translateY = 0;
        }
        this.manager.updateBookStyle();
    }

    zoomIn() { this.zoomBy(ZOOM_STEP); }
    zoomOut() { this.zoomBy(-ZOOM_STEP); }

    dblclickHandler(e: MouseEvent) {
        window.clearTimeout(this.clickTimer); // Cancel the pending single-click action
        this.toggleZoom(e.clientX, e.clientY);
    }

    private addTouch(e: any) {
        e.touches = [{
            pageX: e.pageX,
            pageY: e.pageY
        }];
    }

    mousedownHandler(e: MouseEvent) {
        this.mouseDown = { X: e.clientX, Y: e.clientY };
        if (this.isScaled) {
            this.addTouch(e as any);
            this.touchstartHandler(e as any);
        }
    }

    mouseupHandler(e: MouseEvent) {
        const down = this.mouseDown;
        this.mouseDown = null;
        if (this.isScaled) {
            this.touchendHandler(e as any);
        }
        // Ignore compatibility mouse events synthesized after a touch tap,
        // and the second mouseup of a double click (it belongs to dblclick)
        if (performance.now() - this.lastTouchEnd < 700 || e.detail > 1) return;
        if (down && e.button === 0 &&
            Math.abs(e.clientX - down.X) + Math.abs(e.clientY - down.Y) <= CLICK_SLOP) {
            // Delay so a double click (zoom) can cancel the single-click action
            const { clientX, clientY } = e;
            window.clearTimeout(this.clickTimer);
            this.clickTimer = window.setTimeout(() => this.emitPointer("click", clientX, clientY), 250);
        }
    }

    mousemoveHandler(e: MouseEvent) {
        if (this.isScaled && e.buttons > 0) {
            e.preventDefault();
            this.addTouch(e as any);
            this.touchmoveHandler(e as any);
        }
    }

    /**
     * Wheel handler: ctrl+wheel zooms (trackpad pinch on Chrome), otherwise a
     * wheel burst turns exactly one page. A new page turn requires either
     * 200ms of quiet (fresh gesture), a direction reversal, or a re-acceleration
     * after a decelerating tail (deliberate consecutive flicks).
     */
    wheelHandler(e: WheelEvent) {
        e.preventDefault();

        if(e.ctrlKey) {
            // Pinch-zoom gesture (trackpads report it as ctrl+wheel)
            let newScale = this.scale * (1 - e.deltaY * 0.01);
            if(newScale >= MAX_SCALE) newScale = MAX_SCALE;
            if(newScale <= MIN_SCALE) newScale = 1;
            this.scale = newScale;
            this.manager.updateBookStyle();
            return;
        }

        const horizontal = Math.abs(e.deltaX) > Math.abs(e.deltaY);
        const delta = horizontal ? e.deltaX : e.deltaY;
        const mag = Math.abs(delta);
        if(mag < 1) return;
        // Horizontal wheel follows the visual direction (RTL flips);
        // vertical wheel down always advances.
        let dir = Math.sign(delta);
        if(horizontal && this.manager.rtl) dir = -dir;

        const now = performance.now();
        const quiet = now - this.wheelLastEvent;
        this.wheelLastEvent = now;

        let gesture: "start" | "reverse" | "serial" | null = null;
        if(quiet > WHEEL_COOLDOWN) gesture = "start";
        else if(this.wheelLastDir !== 0 && dir !== this.wheelLastDir) gesture = "reverse";
        else if(this.wheelDecelCount >= 3 && mag > this.wheelLastMag * 1.5) gesture = "serial";

        this.wheelDecelCount = mag <= this.wheelLastMag ? this.wheelDecelCount + 1 : 0;
        this.wheelLastMag = mag;
        this.wheelLastDir = dir;

        if(gesture !== null && (!this.wheelHot || gesture === "reverse" || gesture === "serial")) {
            this.wheelHot = true;
            if(gesture === "serial" || gesture === "reverse") this.wheelDecelCount = 0;
            this.manager.listener(dir > 0 ? "no_more" : "no_less", undefined);
        }

        window.clearTimeout(this.wheelCooldownTimer);
        this.wheelCooldownTimer = window.setTimeout(() => {
            this.wheelHot = false;
            this.wheelLastDir = 0;
            this.wheelLastMag = 0;
            this.wheelDecelCount = 0;
        }, WHEEL_COOLDOWN);
    }

    /**
     * Recalculate drag/swipe event and reposition the frame of the slider
     */
    private updateAfterDrag() {
        const movement = (this.manager.rtl ? -1 : 1) * (this.pan.endX - this.pan.startX);
        const movementDistance = Math.abs(movement);

        if (movement > 0 && movementDistance > this.manager.threshold && this.manager.length > this.manager.perPage) {
            this.manager.listener("no_less", undefined);
        } else if (movement < 0 && movementDistance > this.manager.threshold && this.manager.length > this.manager.perPage) {
            this.manager.listener("no_more", undefined);
        }
        this.manager.slideToCurrent(true, true);
    }
}
