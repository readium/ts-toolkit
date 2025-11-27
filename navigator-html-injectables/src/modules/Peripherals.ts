import { SuspiciousActivityEvent } from "../types/protection";
import { Comms } from "../comms/comms";
import { Module } from "./Module";
import { ReadiumWindow, nearestInteractiveElement } from "../helpers/dom";
import { keyManager } from "../helpers/KeyCombinationManager";
import { BulkCopyProtector, BulkCopyProtectionOptions } from "../helpers/BulkCopyProtector";
import { SelectionAnalyzer } from "../helpers/SelectionAnalyzer";

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

export interface ContentProtectionData {
    // Enable/disable selection monitoring
    selection?: { maxChars?: number } | false;
    
    // Enable/disable copy protection
    copy?: { maxSelectionPercent?: number; minThreshold?: number } | false;
    
    // Enable/disable context menu
    contextMenu?: boolean;
    
    // Enable/disable drag and drop
    dragAndDrop?: boolean;
    
    // Configure keyboard shortcuts
    keyboardShortcuts?: { 
        allowDevTools?: boolean; 
        allowSelectAll?: boolean; 
    } | false;
}

export class Peripherals extends Module {
    static readonly moduleName = "peripherals";
    private wnd!: ReadiumWindow;
    private comms!: Comms;

    // State management
    private cleanupCallbacks: (() => void)[] = [];
    private pointerMoved = false;
    
    // Feature flags
    private isContextMenuEnabled = false;
    private isDragAndDropEnabled = false;
    private isSelectionMonitoringEnabled = false;
    private isBulkCopyProtectionEnabled = true;
    
    // Selection analysis
    private selectionAnalyzer: SelectionAnalyzer | null = null;
    
    // Bulk copy protection
    private bulkCopyProtector: BulkCopyProtector | null = null;

    private enableContextMenu(): void {
        if (this.isContextMenuEnabled || !this.wnd) return;
        this.wnd.document.addEventListener("contextmenu", this.onContext);
        this.isContextMenuEnabled = true;
    }

    private disableContextMenu(): void {
        if (!this.isContextMenuEnabled || !this.wnd) return;
        this.wnd.document.removeEventListener("contextmenu", this.onContext);
        this.isContextMenuEnabled = false;
    }

    private enableDragAndDrop(): void {
        if (this.isDragAndDropEnabled || !this.wnd) return;
        this.wnd.document.addEventListener("dragstart", this.onDragStart);
        this.wnd.document.addEventListener("drop", this.onDrop);
        this.isDragAndDropEnabled = true;
    }

    private disableDragAndDrop(): void {
        if (!this.isDragAndDropEnabled || !this.wnd) return;
        this.wnd.document.removeEventListener("dragstart", this.onDragStart);
        this.wnd.document.removeEventListener("drop", this.onDrop);
        this.isDragAndDropEnabled = false;
    }

    private enableKeyboardShortcuts(features: {
        devTools?: boolean;
        selectAll?: boolean;
    } = {}): void {
        // Clear any existing state
        keyManager.detach();
        this.cleanupCallbacks = [];
        
        // Developer tools detection (Cmd+Option+I, Cmd+Option+J, Cmd+Option+U, F12, etc.)
        if (features.devTools !== false) {
            const devToolsCombos = [
                { key: "i", meta: true, alt: true },
                { key: "j", meta: true, alt: true },
                { key: "u", meta: true, alt: true },
                { key: "F12" },
                { key: "F12", shift: true },
                { key: "F12", ctrl: true, shift: true },
                { key: "F12", meta: true, alt: true },
            ];

            // Register developer tools key combinations
            const unregisterDevTools = keyManager.subscribeCombinations(
                devToolsCombos,
                (event) => this.onDeveloperToolsAttempt(event)
            );
            this.cleanupCallbacks.push(unregisterDevTools);
        }

        // Select All shortcut
        if (features.selectAll) {
            const selectAllCombos = [
                { key: "a", meta: true },    // Cmd+A on Mac
                { key: "a", ctrl: true }     // Ctrl+A on Windows/Linux
            ];
            const unregisterSelectAll = keyManager.subscribeCombinations(
                selectAllCombos,
                (event) => this.onSelectAll(event)
            );
            this.cleanupCallbacks.push(unregisterSelectAll);
        }

        // Attach the key manager to the document
        if (this.wnd) {
            keyManager.attach(this.wnd.document);
        }
    }
    
    private disableKeyboardShortcuts(): void {
        keyManager.detach();
        this.cleanupCallbacks = [];
    }

    private enableBulkCopyProtection(options: Partial<BulkCopyProtectionOptions> = {}): void {
        if (this.isBulkCopyProtectionEnabled || !this.wnd) return;
        
        const defaultOptions = {
            enabled: true,
            maxSelectionPercent: 0.7,   // 70% of document
            absoluteMaxChars: 10000,    // Absolute max characters that can be selected
            minThreshold: 100,          // Minimum number of characters to start enforcing limits
            ...options
        };
        
        this.bulkCopyProtector = new BulkCopyProtector(this.wnd, defaultOptions);
        this.wnd.document.addEventListener("copy", this.preventBulkCopy, true);
        this.wnd.document.addEventListener("cut", this.preventBulkCopy, true);
        this.isBulkCopyProtectionEnabled = true;
    }

    private disableBulkCopyProtection(): void {
        if (!this.isBulkCopyProtectionEnabled || !this.wnd) return;
        
        this.wnd.document.removeEventListener("copy", this.preventBulkCopy, true);
        this.wnd.document.removeEventListener("cut", this.preventBulkCopy, true);
        this.bulkCopyProtector?.destroy();
        this.bulkCopyProtector = null;
        this.isBulkCopyProtectionEnabled = false;
    }

    private onDeveloperToolsAttempt(event: KeyboardEvent): void {
        event.preventDefault();
        event.stopPropagation();
        
        const activityEvent: SuspiciousActivityEvent = {
            type: "developer_tools_attempt",
            event: event,
            timestamp: Date.now()
        };
        
        this.comms?.send("suspicious_activity", activityEvent);
    }

    private onSelectAll(event: KeyboardEvent) {
        event.preventDefault();
        
        const selection = this.wnd.getSelection();
        if (selection) {
        //    const range = this.wnd.document.createRange();
        //    range.selectNodeContents(this.wnd.document.body);
            selection.removeAllRanges();
        //    selection.addRange(range);
        }
        
        const activityEvent: SuspiciousActivityEvent = {
            type: "select_all_attempt",
            event: event,
            timestamp: Date.now()
        };
        
        this.comms?.send("suspicious_activity", activityEvent);
        return false;
    }

    private preventBulkCopy = (event: ClipboardEvent) => {
        if (!this.isBulkCopyProtectionEnabled || !this.bulkCopyProtector) {
            return true;
        }
        
        if (!this.bulkCopyProtector.shouldAllowCopy(event)) {
            const activityEvent: SuspiciousActivityEvent = {
                type: "suspicious_copy",
                event: event,
                timestamp: Date.now()
            };
            this.comms?.send("suspicious_activity", activityEvent);
            return false;
        }
        return true;
    };

    private handleSelection = (event?: Event) => {
        if (!this.isSelectionMonitoringEnabled || !this.wnd || !this.selectionAnalyzer) {
            return;
        }
        
        const selection = this.wnd.getSelection();
        if (this.selectionAnalyzer.analyze(selection)) {
            const activityEvent: SuspiciousActivityEvent = {
                type: "suspicious_selection",
                event: event,
                timestamp: Date.now()
            };
            this.comms?.send("suspicious_activity", activityEvent);
        }
    };

    private enableSelectionMonitoring(): void {
        if (this.isSelectionMonitoringEnabled || !this.wnd) {
            return;
        }
        
        this.selectionAnalyzer = new SelectionAnalyzer();
        this.wnd.document.addEventListener("selectionchange", this.handleSelection);
        this.isSelectionMonitoringEnabled = true;
    }
    
    private disableSelectionMonitoring(): void {
        if (!this.isSelectionMonitoringEnabled || !this.wnd) {
            return;
        }
        
        this.wnd.document.removeEventListener("selectionchange", this.handleSelection);
        this.selectionAnalyzer?.clear();
        this.selectionAnalyzer = null;
        this.isSelectionMonitoringEnabled = false;
    }

    private onDragStart = (event: DragEvent) => {
        if (!this.isDragAndDropEnabled) {
            event.preventDefault();
            this.comms?.send("suspicious_activity", {
                type: "drag_detected",
                event: event,
                timestamp: Date.now()
            });
            return false;
        }
        return true;
    };

    private onDrop = (event: DragEvent) => {
        if (!this.isDragAndDropEnabled) {
            event.preventDefault();
            this.comms?.send("suspicious_activity", {
                type: "drop_detected",
                event: event,
                timestamp: Date.now()
            });
            return false;
        }
        return true;
    };

    private onContext = (event: MouseEvent) => {
        if (!this.isContextMenuEnabled) {
            event.preventDefault();
            this.comms?.send("suspicious_activity", {
                type: "context_menu",
                event: event,
                timestamp: Date.now()
            });
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

    private registerCommsHandlers() {
        // Remove all previous handlers
        this.comms?.unregisterAll(Peripherals.moduleName);

        // Single handler for all content protection features
        this.comms?.register("content_protect", Peripherals.moduleName, (data: unknown, ack) => {
            const contentData = data as ContentProtectionData;
            try {
                // Selection monitoring
                if ("selection" in contentData) {
                    if (contentData.selection === false) {
                        this.disableSelectionMonitoring();
                        this.comms?.log("Selection monitoring disabled");
                    } else {
                        this.enableSelectionMonitoring();
                        this.comms?.log("Selection monitoring enabled");
                    }
                }

                // Copy protection
                if ("copy" in contentData) {
                    if (contentData.copy === false) {
                        this.disableBulkCopyProtection();
                        this.comms?.log("Bulk copy protection disabled");
                    } else {
                        this.enableBulkCopyProtection(contentData.copy);
                        this.comms?.log("Bulk copy protection enabled");
                    }
                }

                // Context menu
                if (contentData.contextMenu !== undefined) {
                    if (contentData.contextMenu) {
                        this.enableContextMenu();
                        this.comms?.log("Context menu enabled");
                    } else {
                        this.disableContextMenu();
                        this.comms?.log("Context menu disabled");
                    }
                }

                // Drag and drop
                if (contentData.dragAndDrop !== undefined) {
                    if (contentData.dragAndDrop) {
                        this.enableDragAndDrop();
                        this.comms?.log("Drag and drop enabled");
                    } else {
                        this.disableDragAndDrop();
                        this.comms?.log("Drag and drop disabled");
                    }
                }

                // Keyboard shortcuts
                if ("keyboardShortcuts" in contentData) {
                    if (contentData.keyboardShortcuts === false) {
                        this.disableKeyboardShortcuts();
                        this.comms?.log("Keyboard shortcuts disabled");
                    } else {
                        this.enableKeyboardShortcuts({
                            devTools: contentData.keyboardShortcuts?.allowDevTools ?? true,
                            selectAll: contentData.keyboardShortcuts?.allowSelectAll ?? true
                        });
                        this.comms?.log("Keyboard shortcuts enabled");
                    }
                }

                ack(true);
            } catch (error) {
                console.error("Error in content protection:", error);
                ack(false);
            }
        });
    }

    mount(wnd: ReadiumWindow, comms: Comms): boolean {
        this.wnd = wnd;
        this.comms = comms;
        
        // Register comms handlers
        this.registerCommsHandlers();
        
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
        this.disableBulkCopyProtection();
        this.disableSelectionMonitoring();
        this.disableContextMenu();
        this.disableDragAndDrop();
        this.disableKeyboardShortcuts();
        
        // Clean up event listeners
        this.cleanupCallbacks.forEach(cleanup => cleanup());
        this.cleanupCallbacks = [];
        
        // Remove core event listeners
        wnd.document.removeEventListener("pointerdown", this.onPointerDown);
        wnd.document.removeEventListener("pointerup", this.onPointerUp);
        wnd.document.removeEventListener("pointermove", this.onPointerMove);
        wnd.document.removeEventListener("click", this.onClicker);
        
        // Unregister all comms handlers
        comms.unregisterAll(Peripherals.moduleName);

        comms.log("Peripherals Unmounted");
        return true;
    }
}