import { Comms } from "../comms/comms.ts";
import { Module } from "./Module.ts";
import { ReadiumWindow, nearestInteractiveElement } from "../helpers/dom.ts";
import { BulkCopyProtector, BulkCopyProtectionOptions } from "../protection/BulkCopyProtector.ts";
import { SelectionAnalyzer, SelectionAnalyzerOptions } from "../protection/SelectionAnalyzer.ts";
import {
    KeyboardPeripheral
} from "../protection/index.ts";
import { SuspiciousActivityType } from "../comms/index.ts";
import { BULK_COPY_CONFIG, SELECTION_ANALYZER_CONFIG } from "../protection/config.ts";
import {
    KeyCombinationManager,
    ActivityEventDispatcher,
    KeyboardPeripheralEvent
} from "../protection/KeyCombinationManager.ts";
import { SuspiciousScrollingEvent } from "./snapper/ScrollSnapper.ts";
import { SuspiciousSnappingEvent } from "./snapper/ColumnSnapper.ts";

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

export interface BaseSuspiciousActivityEvent {
    type: SuspiciousActivityType;
    timestamp: number;
    targetFrameSrc: string;
}

// Common interface for all keyboard-related events
export interface KeyboardEventData {
    key: string;
    code: string;
    keyCode: number;
    ctrlKey: boolean;
    altKey: boolean;
    shiftKey: boolean;
    metaKey: boolean;
}

// Base interface for keyboard peripheral events
export interface BaseKeyboardPeripheralEvent {
    type: string;
    timestamp: number;
    targetFrameSrc: string;
    selectedText?: Omit<BasicTextSelection, "targetFrameSrc">;
}

export interface DeveloperToolsEvent extends BaseSuspiciousActivityEvent, KeyboardEventData {
    type: "developer_tools";
}

export interface SelectAllEvent extends BaseSuspiciousActivityEvent, KeyboardEventData {
    type: "select_all";
}

export interface PrintEvent extends BaseSuspiciousActivityEvent, KeyboardEventData {
    type: "print";
}

export interface SaveEvent extends BaseSuspiciousActivityEvent, KeyboardEventData {
    type: "save";
}

export interface BulkCopyEvent extends BaseSuspiciousActivityEvent {
    type: "bulk_copy";
    clipboardTypes: readonly string[];
    selectedText?: Omit<BasicTextSelection, "targetFrameSrc">;
    selectionLength?: number;
}

export interface SuspiciousSelectionEvent extends BaseSuspiciousActivityEvent {
    type: "suspicious_selection";
    selectionLength: number;
    selectedText: Omit<BasicTextSelection, "targetFrameSrc">;
    eventType: string;
}

export interface DragDetectedEvent extends BaseSuspiciousActivityEvent {
    type: "drag_detected";
    dataTransferTypes: readonly string[];
}

export interface DropDetectedEvent extends BaseSuspiciousActivityEvent {
    type: "drop_detected";
    dataTransferTypes: readonly string[];
    fileCount: number;
}

export interface ContextMenuEvent extends Omit<BaseSuspiciousActivityEvent, "type"> {
    clientX: number;
    clientY: number;
    selectedText?: Omit<BasicTextSelection, "targetFrameSrc">;
}

export type SuspiciousActivityEvent =
    | DeveloperToolsEvent
    | SelectAllEvent
    | BulkCopyEvent
    | SuspiciousSelectionEvent
    | DragDetectedEvent
    | DropDetectedEvent
    | PrintEvent
    | SaveEvent
    | SuspiciousScrollingEvent
    | SuspiciousSnappingEvent
    | KeyboardPeripheralEvent;

export interface ContentProtectionConfig {
    monitorSelection?: boolean | SelectionAnalyzerOptions;
    protectCopy?: boolean | Omit<BulkCopyProtectionOptions, "enabled">;
    disableContextMenu?: boolean;
    disableDragAndDrop?: boolean;
    disableSelectAll?: boolean;
    disableSave?: boolean;
    monitorDevTools?: boolean;
    monitorScrollingExperimental?: boolean;
}

export class Peripherals extends Module {
    static readonly moduleName = "peripherals";
    private wnd!: ReadiumWindow;
    private comms!: Comms;
    private configApplied = false; // Track if config has been applied

    // State management
    private cleanupCallbacks: (() => void)[] = [];
    private pointerMoved = false;

    // Feature flags
    private isContextMenuEnabled = false;
    private isDragAndDropEnabled = false;
    private isSelectionMonitoringEnabled = false;
    private isBulkCopyProtectionEnabled = false;

    // Selection analysis
    private selectionAnalyzer: SelectionAnalyzer | null = null;
    private currentSelection: string | null = null;

    // Bulk copy protection
    private bulkCopyProtector: BulkCopyProtector | null = null;

    // Key combination manager
    private keyManager = new KeyCombinationManager();

    private addContextMenuPrevention(): void {
        if (this.isContextMenuEnabled || !this.wnd) return;
        this.wnd.document.addEventListener("contextmenu", this.onContext);
        this.isContextMenuEnabled = true;
    }

    private removeContextMenuPrevention(): void {
        if (!this.isContextMenuEnabled || !this.wnd) return;
        this.wnd.document.removeEventListener("contextmenu", this.onContext);
        this.isContextMenuEnabled = false;
    }

    private addDragAndDropPrevention(): void {
        if (this.isDragAndDropEnabled || !this.wnd) return;
        this.wnd.document.addEventListener("dragstart", this.onDragStart);
        this.wnd.document.addEventListener("dragover", this.onDragOver);
        this.wnd.document.addEventListener("drop", this.onDrop);
        this.isDragAndDropEnabled = true;
    }

    private removeDragAndDropPrevention(): void {
        if (!this.isDragAndDropEnabled || !this.wnd) return;
        this.wnd.document.removeEventListener("dragstart", this.onDragStart);
        this.wnd.document.removeEventListener("dragover", this.onDragOver);
        this.wnd.document.removeEventListener("drop", this.onDrop);
        this.isDragAndDropEnabled = false;
    }

    private keyDownHandler: ((event: KeyboardEvent) => void) | null = null;

    private enableKeyboardPeripherals(shortcuts: KeyboardPeripheral[] = []): void {
        // Clear any existing state
        this.disableKeyboardPeripherals();

        // Create activity event dispatcher
        const dispatcher: ActivityEventDispatcher = (activityEvent) => {
            this.comms?.send("keyboard_peripherals", activityEvent);
        };

        // Create unified handler using centralized KeyCombinationManager
        this.keyDownHandler = this.keyManager.createUnifiedHandler(this.wnd.location.href, shortcuts, dispatcher, this.wnd);

        // Add the event listener
        if (this.wnd) {
            this.wnd.document.addEventListener("keydown", this.keyDownHandler, {
                capture: true
            });
        }
    }

    private disableKeyboardPeripherals(): void {
        if (this.wnd && this.keyDownHandler) {
            this.wnd.document.removeEventListener("keydown", this.keyDownHandler, {
                capture: true
            });
            this.keyDownHandler = null;
        }
    }

    private addBulkCopyProtection(options: Partial<BulkCopyProtectionOptions> = {}): void {
        if (this.isBulkCopyProtectionEnabled || !this.wnd) return;

        const defaultOptions = BULK_COPY_CONFIG;

        const finalOptions = options ? { ...defaultOptions, ...options } : defaultOptions;

        this.bulkCopyProtector = new BulkCopyProtector(this.wnd, finalOptions);
        this.wnd.document.addEventListener("copy", this.preventBulkCopy, true);
        this.wnd.document.addEventListener("cut", this.preventBulkCopy, true);
        this.isBulkCopyProtectionEnabled = true;
    }

    private removeBulkCopyProtection(): void {
        if (!this.isBulkCopyProtectionEnabled || !this.wnd) return;

        this.wnd.document.removeEventListener("copy", this.preventBulkCopy, true);
        this.wnd.document.removeEventListener("cut", this.preventBulkCopy, true);
        this.bulkCopyProtector?.destroy();
        this.bulkCopyProtector = null;
        this.isBulkCopyProtectionEnabled = false;
    }

    private preventBulkCopy = (event: ClipboardEvent) => {
        if (!this.isBulkCopyProtectionEnabled || !this.bulkCopyProtector) {
            return true;
        }

        if (!this.bulkCopyProtector.shouldAllowCopy(event)) {
            event.preventDefault();

            const selection = this.wnd.getSelection();
            const selectedText = selection?.toString() || '';
            const domRectList = selectedText ? selection?.getRangeAt(0)?.getClientRects() : null;
            const rect = domRectList?.[0];

            const activityEvent: BulkCopyEvent = {
                type: "bulk_copy",
                timestamp: Date.now(),
                clipboardTypes: event.clipboardData?.types ? [...event.clipboardData.types] : [],
                selectedText: rect ? {
                    text: selectedText,
                    x: rect.x,
                    y: rect.y,
                    width: rect.width,
                    height: rect.height
                } : undefined,
                selectionLength: selectedText.length,
                targetFrameSrc: this.wnd.location.href

            };
            this.comms?.send("content_protection", activityEvent);
            return false;
        }
        return true;
    };

    private handleSelection = (event?: Event) => {
        if (!this.isSelectionMonitoringEnabled || !this.wnd || !this.selectionAnalyzer) {
            return;
        }

        const selection = this.wnd.getSelection();
        if (selection) {
            this.currentSelection = selection.toString();
            const isSuspicious = this.selectionAnalyzer.analyze(selection);

            if (isSuspicious && this.currentSelection) {
                const selection = this.wnd.getSelection();
                const selectedText = selection?.toString() || '';
                const domRectList = (selectedText && selection?.rangeCount) ? selection.getRangeAt(0)?.getClientRects() : null;
                const rect = domRectList?.[0];

                const activityEvent: SuspiciousSelectionEvent = {
                    type: "suspicious_selection",
                    timestamp: Date.now(),
                    selectionLength: selectedText.length,
                        selectedText: {
                        text: selectedText,
                        x: rect?.x ?? 0,
                        y: rect?.y ?? 0,
                        width: rect?.width ?? 0,
                        height: rect?.height ?? 0
                    },
                    eventType: event?.type || "selectionchange",
                    targetFrameSrc: this.wnd.location.href
                };
                this.comms?.send("content_protection", activityEvent);
            }
        } else {
            this.currentSelection = null;
        }
    };

    private addSelectionMonitoring(options?: SelectionAnalyzerOptions): void {
        if (this.isSelectionMonitoringEnabled || !this.wnd) return;

        // Use provided options or fall back to default config
        const analyzerOptions = options || SELECTION_ANALYZER_CONFIG;
        this.selectionAnalyzer = new SelectionAnalyzer(analyzerOptions);
        this.wnd.document.addEventListener("selectionchange", this.handleSelection);
        this.isSelectionMonitoringEnabled = true;
    }

    private removeSelectionMonitoring(): void {
        if (!this.isSelectionMonitoringEnabled || !this.wnd) {
            return;
        }

        this.wnd.document.removeEventListener("selectionchange", this.handleSelection);
        this.selectionAnalyzer?.clear();
        this.selectionAnalyzer = null;
        this.isSelectionMonitoringEnabled = false;
    }

    private onDragOver = (event: DragEvent) => {
        if (this.isDragAndDropEnabled) {
            event.preventDefault();
            event.stopPropagation();
        }
    };

    private onDragStart = (event: DragEvent) => {
        if (this.isDragAndDropEnabled) {
            // Drag and drop protection is enabled - prevent it
            event.preventDefault();
            const activityEvent: DragDetectedEvent = {
                type: "drag_detected",
                timestamp: Date.now(),
                dataTransferTypes: event.dataTransfer?.types ? [...event.dataTransfer.types] : [],
                targetFrameSrc: this.wnd.location.href
            };
            this.comms?.send("content_protection", activityEvent);
            return false;
        } else {
            return true;
        }
    };

    private onDrop = (event: DragEvent) => {
        if (this.isDragAndDropEnabled) {
            // Drag and drop protection is enabled - prevent it
            event.preventDefault();
            const dataTransfer = event.dataTransfer;
            const activityEvent: DropDetectedEvent = {
                type: "drop_detected",
                timestamp: Date.now(),
                dataTransferTypes: dataTransfer?.types ? [...dataTransfer.types] : [],
                fileCount: dataTransfer?.files?.length || 0,
                targetFrameSrc: this.wnd.location.href
            };
            this.comms?.send("content_protection", activityEvent);
            return false;
        } else {
            return true;
        }
    };

    private onContext = (event: MouseEvent) => {
        if (this.isContextMenuEnabled) {
            // Context menu protection is enabled - prevent it
            event.preventDefault();
            const selection = this.wnd.getSelection();
            const selectedText = selection?.toString() || '';
            const domRectList = (selectedText && selection?.rangeCount) ? selection.getRangeAt(0)?.getClientRects() : null;
            const rect = domRectList?.[0];

            const activityEvent: ContextMenuEvent = {
                timestamp: Date.now(),
                clientX: event.clientX,
                clientY: event.clientY,
                ...(rect && {
                    selectedText: {
                        text: selectedText,
                        x: rect.x,
                        y: rect.y,
                        width: rect.width,
                        height: rect.height
                    }
                }),
                targetFrameSrc: this.wnd.location.href
            };
            this.comms?.send("context_menu", activityEvent);
        }
    };

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
                targetFrameSrc: this.wnd?.location?.href
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
            cssSelector: this.wnd._readium_cssSelectorGenerator.getCssSelector(event.target as Element),
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
            Object.defineProperty(synthEvent, "target", {writable: false, value: event.target});
            Object.defineProperty(synthEvent, "defaultPrevented", {writable: false, value: event.defaultPrevented });
            // Trigger `pointerup` event
            this.onPointUp(synthEvent);
        }
    }
    private readonly onClicker = this.onClick.bind(this);

    private registerProtectionHandlers() {
        // Single handler for all content protection features
        this.comms?.register("peripherals_protection", Peripherals.moduleName, (data: unknown, ack) => {
            const config = data as ContentProtectionConfig;

            // Apply config only on first call, then ignore subsequent calls (immutable)
            if (!this.configApplied) {
                this.configApplied = true;

                // Selection monitoring with optional configuration
                if (config.monitorSelection) {
                    const options = typeof config.monitorSelection === "boolean"
                        ? undefined
                        : config.monitorSelection;
                    this.addSelectionMonitoring(options);
                    this.comms?.log("Selection monitoring enabled");
                }

                // Copy
                if (typeof config.protectCopy === "object") {
                    // Limited copying with custom thresholds
                    this.addBulkCopyProtection({
                        enabled: true,
                        ...config.protectCopy
                    });
                    this.comms?.log("Copy protection enabled (limited)");
                } else if (config.protectCopy === true) {
                    // Block all copying
                    this.addBulkCopyProtection({
                        enabled: true,
                        maxSelectionPercent: 0,
                        minThreshold: 0,
                        absoluteMaxChars: 0
                    });
                    this.comms?.log("Copy protection enabled");
                }

                // Context menu
                if (config.disableContextMenu) {
                    this.addContextMenuPrevention();
                    this.comms?.log("Context menu protection enabled");
                }

                // Drag and drop
                if (config.disableDragAndDrop) {
                    this.addDragAndDropPrevention();
                    this.comms?.log("Drag and drop protection enabled");
                }
            }

            ack(true);
        });

        // Separate handler for keyboard peripherals
        this.comms?.register("keyboard_peripherals", Peripherals.moduleName, (data: unknown, ack) => {
            const keyboardPeripherals = data as KeyboardPeripheral[];

            if (keyboardPeripherals && keyboardPeripherals.length > 0) {
                this.enableKeyboardPeripherals(keyboardPeripherals);
                this.comms?.log(`Keyboard peripherals enabled: ${keyboardPeripherals.map(p => p.type).join(", ")}`);
            }

            ack(true);
        });
    }

    mount(wnd: ReadiumWindow, comms: Comms): boolean {
        this.wnd = wnd;
        this.comms = comms;

        // Register protection handlers
        this.registerProtectionHandlers();

        // Core event listeners (always active)
        wnd.document.addEventListener("pointerdown", this.onPointerDown);
        wnd.document.addEventListener("pointerup", this.onPointerUp);
        wnd.document.addEventListener("pointermove", this.onPointerMove);
        wnd.document.addEventListener("click", this.onClicker);

        comms.log("Peripherals Mounted");
        return true;
    }

    unmount(wnd: ReadiumWindow, comms: Comms): boolean {
        // Clean up optional features
        this.removeBulkCopyProtection();
        this.removeSelectionMonitoring();
        this.removeContextMenuPrevention();
        this.removeDragAndDropPrevention();
        this.disableKeyboardPeripherals();

        // Clean up event listeners
        this.cleanupCallbacks.forEach(cleanup => cleanup());
        this.cleanupCallbacks = [];

        // Remove core event listeners
        wnd.document.removeEventListener("pointerdown", this.onPointerDown);
        wnd.document.removeEventListener("pointerup", this.onPointerUp);
        wnd.document.removeEventListener("pointermove", this.onPointerMove);
        wnd.document.removeEventListener("click", this.onClicker);

        // Unregister all handlers
        comms.unregisterAll(Peripherals.moduleName);

        // Reset config applied flag for fresh instances
        this.configApplied = false;

        comms.log("Peripherals Unmounted");
        return true;
    }
}
