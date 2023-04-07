import FXLCoordinator, { Point } from "./FXLCoordinator";
import FramePoolManager from "./FXLFramePoolManager";

export interface DragTracker {
    startX: number;
    endX: number;
    startY: number;
    letItGo: boolean;
    preventClick: boolean;
    transformX: number;
    transformY: number;
}

export interface PinchTracker {
    startDistance: number;
    startOffset: Point | null;
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

    private pointerDown: boolean;
    private drag: DragTracker;
    private pinch: PinchTracker;
    private isDragging: boolean;
    private isPinching: boolean;
    zoomer: Zoomer = {
        scale: 1,
        translate: {
            X: 0,
            Y: 0
        }
    };

    constructor(manager: FramePoolManager) {
        this.manager = manager;
        this.coordinator = new FXLCoordinator();
        this.attachEvents();
    }

    private readonly btouchstartHandler = this.touchstartHandler.bind(this);
    private readonly btouchendHandler = this.touchendHandler.bind(this);
    private readonly btouchmoveHandler = this.touchmoveHandler.bind(this);

    /**
     * Attaches listeners to required events.
     */
    attachEvents() {
        this.manager.spineElement.addEventListener("touchstart", this.btouchstartHandler);
        this.manager.spineElement.addEventListener("touchend", this.btouchendHandler, {
            passive: true
        });
        this.manager.spineElement.addEventListener("touchmove", this.btouchmoveHandler, {
            passive: true
        });

        // Keep track pointer hold and dragging distance
        this.pointerDown = false;
        this.drag = {
            startX: 0,
            endX: 0,
            startY: 0,
            letItGo: false,
            preventClick: false,
            transformX: 0,
            transformY: 0
        };

        this.pinch = {
            startDistance: 0,
            startOffset: null,
            touchN: 0
        };
    }

    /**
     * Clear drag after touchend and mouseup event
     */
    private clearDrag() {
        this.drag = {
            startX: 0,
            endX: 0,
            startY: 0,
            letItGo: false,
            preventClick: this.drag.preventClick,
            transformX: 0,
            transformY: 0
        };
        this.isDragging = false;
        this.isPinching = false;

        this.pinch = {
            startDistance: 0,
            startOffset: null,
            touchN: 0
        };
    }

    observe(item: EventTarget) {
        item.addEventListener("touchstart", this.btouchstartHandler);
        item.addEventListener("touchend", this.btouchendHandler, {
            passive: true
        });
        item.addEventListener("touchmove", this.btouchmoveHandler, {
            passive: true
        });
    }

    /**
     * touchstart event handler
     */
    touchstartHandler(e: TouchEvent) {
        // Prevent dragging / swiping on inputs, selects and textareas
        const ignoreSlider = ["TEXTAREA", "OPTION", "INPUT", "SELECT"].indexOf((e.target as Element).nodeName) !== -1;
        if (ignoreSlider)
            return;

        e.stopPropagation();

        switch (e.touches.length) {
            case 3:
                // this.ui.toggle();
                return;
            case 2: {
                // Pinch
                e.preventDefault();
                this.clearDrag();
                if(this.pointerDown)
                    this.pinch.startOffset = {
                        X: this.zoomer.translate.X && this.zoomer.scale > 1 ? this.zoomer.translate.X : e.touches[0].pageX,
                        Y: this.zoomer.translate.Y && this.zoomer.scale > 1 ? this.zoomer.translate.Y : e.touches[0].pageY
                    };
                else
                    this.pinch.startOffset = this.coordinator.getTouchCenter(e);
                this.pinch.startDistance = this.coordinator.getTouchDistance(e);
                
                this.isPinching = true;
                this.pointerDown = true;
                return;
            }
        }

        this.manager.updateSpineStyle(false);
        this.pointerDown = true;
        this.drag.startX = e.touches[0].screenX;
        this.drag.startY = e.touches[0].screenY;
        /*if (this.slider.zoomer) {
            this.drag.transformX = this.slider.zoomer.translate.X;
            this.drag.transformY = this.slider.zoomer.translate.Y;
        }*/
    }

    /**
     * touchend event handler
     */
    touchendHandler(e: TouchEvent) {
        e.stopPropagation();
        this.pointerDown = false;
        //this.slider.updateProperties(true);

        if (this.drag.endX) {
            this.updateAfterDrag();
        }
        window.setTimeout(() => {
            this.clearDrag();
        }, 50);
    }

    private moveFrame = 0;

    /**
     * touchmove event handler
     */
    touchmoveHandler(e: TouchEvent) {
        e.stopPropagation();

        if ((Math.abs(this.drag.startY - e.touches[0].screenY) + Math.abs(this.drag.startX - e.touches[0].screenX)) > 5 && this.pointerDown)
            this.isDragging = true;

        /*const currentDistance = this.coordinator?.getTouchDistance(e);
        if(this.isPinching && currentDistance) {
            this.pinch.touchN++;
            if(this.pinch.touchN < 4) return;
            let newScale = currentDistance / this.pinch.startDistance * this.slider.zoomer.scale;
            if(newScale >= MAX_SCALE)
                newScale = MAX_SCALE;
            if(newScale <= 1.1)
                newScale = 1;
            const center = this.coordinator.getTouchCenter(e);
            this.slider.zoomer = {
                scale: newScale,
                translate: {
                    X: this.pinch.startOffset.X,
                    Y: this.pinch.startOffset.Y
                }
            };
            this.pinch.startDistance = currentDistance;
            return;
        }*/

        if (this.drag.letItGo === false) {
            this.drag.letItGo = Math.abs(this.drag.startY - e.touches[0].screenY) < Math.abs(this.drag.startX - e.touches[0].screenX);
        }

        /*if (this.isScaled && this.pointerDown) {
            const BibiEvent = this.coordinator.getBibiEvent(e);
            this.slider.zoomer.translate = {
                X: this.drag.transformX - (BibiEvent.Coord.X - this.drag.startX),
                Y: this.drag.transformY - (BibiEvent.Coord.Y - this.drag.startY)
            };

            if (this.slider.zoomer.translate.X < 0)
                this.slider.zoomer.translate.X = 0;
            if (this.slider.zoomer.translate.Y < 0)
                this.slider.zoomer.translate.Y = 0;

            if (this.slider.zoomer.translate.X > this.slider.width)
                this.slider.zoomer.translate.X = this.slider.width; 
            if (this.slider.zoomer.translate.Y > this.slider.height)
                this.slider.zoomer.translate.Y = this.slider.height;

            return;
        }

        if(this.slider.ttb) {
            this.ui.mousing = false;
            return;
        }*/

        if (this.pointerDown && this.drag.letItGo) {
            this.drag.endX = e.touches[0].screenX;
            // this.manager.updateSpineStyle(false);

            const currentSlide = this.manager.currentSlide;
            const currentOffset = currentSlide * (this.manager.width / this.manager.perPage);
            const dragOffset = (this.drag.endX - this.drag.startX);
            const offset = this.manager.rtl ? currentOffset + dragOffset : currentOffset - dragOffset;

            cancelAnimationFrame(this.moveFrame);
            this.moveFrame = requestAnimationFrame(() => {
                this.manager.spineElement.style.transform = `translate3d(${(this.manager.rtl ? 1 : -1) * offset}px, 0, 0)`;
            });
        }
    }

    /**
     * Recalculate drag/swipe event and reposition the frame of a slider
     */
    private updateAfterDrag() {
        const movement = (this.manager.rtl ? -1 : 1) * (this.drag.endX - this.drag.startX);
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