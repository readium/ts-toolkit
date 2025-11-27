import { Comms } from "../comms";
import { ReadiumWindow } from "../helpers/dom";
import { Module } from "./Module";
import { ModuleName } from "./ModuleLibrary";

/*
interface ScrollMetrics {
    velocity: number;
    direction: "up" | "down";
    timestamp: number;
    position: number;
}
*/

// Removed unused SelectionMetrics interface as it's not used in the implementation

export interface ProtectionOptions {
    // Print Protection
    disablePrinting?: boolean;
    printWatermark?: string;
    
    // User Behavior Analysis
    // monitorSelection?: boolean;
    // detectRapidScrolling?: boolean;
    /* detectBulkCopy?: {
        enabled: boolean;
        maxSelectionPercent?: number;
        absoluteMaxChars?: number;
    }; */
    
    // Existing protection options
    //disableContextMenu?: boolean;
    // disableKeyboardShortcuts?: boolean;
    //disableDragAndDrop?: boolean;
}

export class ContentProtection extends Module {
    static readonly moduleName: ModuleName = "content_protection";
    // private comms?: Comms;
    
    // Enhanced scroll tracking
    /*
    private scrollHistory: ScrollMetrics[] = [];
    private readonly SCROLL_HISTORY_SIZE = 10;
    private lastScrollPosition = 0;
    private lastScrollTime = 0;
    */

    // Enhanced selection tracking
    // private selectionStartTime = 0;
    // private lastSelectionPosition = 0;
    // private lastSelectionTime = 0;  // Added missing property
    // private selectionPatterns: number[] = [];
    
    
    // Legacy tracking (kept for backward compatibility)
    // private scrollCount = 0;
    // private selectionCount = 0;
    // private readonly SCROLL_THRESHOLD = 5; // Max scrolls per second
    // private readonly SELECTION_THRESHOLD = 10; // Max selections per second
    
    private static readonly DEFAULT_OPTIONS: ProtectionOptions = {
        // Print Protection
        disablePrinting: false,
        printWatermark: "Confidential - Do not distribute",
        
        // Other features
        // disableContextMenu: true,
        // disableKeyboardShortcuts: true,
        // disableDragAndDrop: true,
        /* detectBulkCopy: {
            enabled: true,
            maxSelectionPercent: 0.7,
            absoluteMaxChars: 50000
        } */
    };
    
    private options: ProtectionOptions;
    private styleElement: HTMLStyleElement | null = null;
    // private lastSelectionLength = 0;
    // lastSelectionTime is already declared in the class

    constructor(options: Partial<ProtectionOptions> = {}) {
        super();
        this.options = { ...ContentProtection.DEFAULT_OPTIONS, ...options };
    }

    private setupPrintProtection(wnd: Window) {
        if (!this.options.disablePrinting) return;

        const style = wnd.document.createElement("style");
        style.textContent = `
            @media print {
                body * {
                    display: none !important;
                }
                body::after {
                    content: "${this.options.printWatermark}";
                    font-size: 24px;
                    display: block;
                    text-align: center;
                    margin-top: 50vh;
                    transform: translateY(-50%);
                }
            }
        `;
        wnd.document.head.appendChild(style);

        // Prevent print dialog from opening
        wnd.addEventListener("beforeprint", (e) => {
            e.preventDefault();
            return false;
        });
    }

    /*
    private preventContextMenu = (e: MouseEvent) => {
        if (this.options.disableContextMenu !== false) {
            e.preventDefault();
            return false;
        }
        return true;
    };
    */

    /*
    private preventKeyCombinations = (e: KeyboardEvent) => {
        if (this.options.disableKeyboardShortcuts !== false) {
            const isMac = /Mac|iPod|iPhone|iPad/.test(navigator.platform);
            const ctrlKey = isMac ? e.metaKey : e.ctrlKey;
            
            // Block common developer tools shortcuts
            if (
                e.key === "F12" ||
                (ctrlKey && e.shiftKey && (e.key === "I" || e.key === "J" || e.key === "C")) ||
                (ctrlKey && e.key === "u")
            ) {
                e.preventDefault();
                return false;
            }
        }
        return true;
    };
    */

    /*
    private preventDragAndDrop = (e: DragEvent) => {
        if (this.options.disableDragAndDrop !== false) {
            e.preventDefault();
            return false;
        }
        return true;
    };
    */

    /*
    private preventBulkCopy = (e: ClipboardEvent) => {
        if (!this.options.detectBulkCopy?.enabled) return true;

        const selection = window.getSelection();
        if (!selection) return true;
        
        const selectedText = selection.toString();
        const selectedLength = selectedText.length;
        const docLength = document.body.innerText.length;

        // Skip if selection is too small to be considered bulk
        if (selectedLength < 2000) { // Minimum threshold
            return true;
        }

        const now = Date.now();
        const timeSinceLastSelection = now - this.lastSelectionTime;
        
        // Check for rapid selection (like Cmd+A)
        const isRapidSelection = 
            timeSinceLastSelection < 100 && 
            selectedLength > this.lastSelectionLength * 5;
            
        const maxPercent = this.options.detectBulkCopy.maxSelectionPercent || 0.7;
        const maxChars = this.options.detectBulkCopy.absoluteMaxChars || 50000;
        
        let maxAllowedSelection = Math.min(
            docLength * maxPercent,
            maxChars
        );

        // If selection exceeds our thresholds, prevent it
        if (selectedLength > maxAllowedSelection || isRapidSelection) {
            e.preventDefault();
            return false;
        }
        
        this.lastSelectionLength = selectedLength;
        this.lastSelectionTime = now;
        return true;
    };
    */

    /*
    private setupUserBehaviorMonitoring(wnd: Window) {
        if (this.options.monitorSelection) {
            wnd.document.addEventListener("selectionchange", this.handleSelection);
        }
        
        if (this.options.detectRapidScrolling) {
            wnd.addEventListener("scroll", this.handleScroll, { passive: true });
        }
    }
    */

    /*
    private handleSelection = () => {
        if (!this.options.monitorSelection) return;
        
        const selection = window.getSelection();
        if (!selection) return;
        
        // Legacy selection counting (for backward compatibility)
        const now = Date.now();
        if (now - this.lastSelectionTime > 1000) {
            this.selectionCount = 0;
            this.lastSelectionTime = now;
        }
        this.selectionCount++;
        
        if (selection.type === "Range") {
            if (this.selectionStartTime === 0) {
                this.selectionStartTime = Date.now();
            }
            
            // Check for suspicious patterns
            if (this.analyzeSelectionPattern(selection) || this.selectionCount > this.SELECTION_THRESHOLD) {
                this.comms?.send("suspicious_activity", {
                    type: "suspicious_selection",
                    count: this.selectionCount,
                    selection: selection.toString().substring(0, 100) // First 100 chars for analysis
                });
            }
        } else {
            // Reset selection tracking when selection is cleared
            this.selectionStartTime = 0;
            this.selectionPatterns = [];
            this.lastSelectionPosition = 0;
        }
    };
    */

    /*
    private analyzeScrollPattern(): boolean {
        if (this.scrollHistory.length < 3) return false;
        
        // Calculate velocity variance
        const velocities = this.scrollHistory.map(m => m.velocity);
        const meanVelocity = velocities.reduce((a, b) => a + b, 0) / velocities.length;
        const variance = velocities.reduce((a, b) => a + Math.pow(b - meanVelocity, 2), 0) / velocities.length;
        
        // Detect unnaturally consistent scrolling (low variance)
        const isTooConsistent = variance < 0.1;
        
        // Check for instant direction changes (unrealistic for humans)
        let directionChanges = 0;
        for (let i = 1; i < this.scrollHistory.length; i++) {
            if (this.scrollHistory[i].direction !== this.scrollHistory[i-1].direction) {
                directionChanges++;
            }
        }
        const hasUnnaturalDirectionChanges = directionChanges > this.scrollHistory.length / 2;
        
        return isTooConsistent || hasUnnaturalDirectionChanges;
    }
    */

    /*
    private analyzeSelectionPattern(selection: Selection): boolean {
        if (!selection.rangeCount) return false;
        
        const range = selection.getRangeAt(0);
        const text = range.toString();
        const now = Date.now();
        
        // Calculate selection speed (characters/ms)
        const duration = now - this.selectionStartTime;
        const speed = text.length / Math.max(1, duration);
        
        // Check for unnaturally fast selection
        if (speed > 100) return true; // 100 chars/ms is superhuman
        
        // Analyze selection pattern (human selections have more variance)
        const currentPosition = range.startOffset;
        const distance = Math.abs(currentPosition - this.lastSelectionPosition);
        this.selectionPatterns.push(distance);
        
        if (this.selectionPatterns.length > 5) {
            this.selectionPatterns.shift();
            const variance = this.calculateVariance(this.selectionPatterns);
            if (variance < 5) { // Very consistent patterns suggest automation
                return true;
            }
        }
        
        this.lastSelectionPosition = currentPosition;
        return false;
    }
    
    private calculateVariance(numbers: number[]): number {
        if (numbers.length === 0) return 0;
        const mean = numbers.reduce((a, b) => a + b, 0) / numbers.length;
        return numbers.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / numbers.length;
    }
    */
    
    /*
    private handleScroll = () => {
        if (!this.options.detectRapidScrolling) return;
        
        const now = Date.now();
        const position = window.scrollY;
        const delta = position - this.lastScrollPosition;
        const velocity = Math.abs(delta) / (now - (this.scrollHistory[0]?.timestamp || now));
        
        // Add to scroll history
        this.scrollHistory.push({
            velocity,
            direction: delta >= 0 ? "down" : "up",
            timestamp: now,
            position
        });
        
        // Maintain fixed history size
        if (this.scrollHistory.length > this.SCROLL_HISTORY_SIZE) {
            this.scrollHistory.shift();
        }
        
        // Legacy scroll counting (for backward compatibility)
        if (now - this.lastScrollTime > 1000) {
            this.scrollCount = 0;
            this.lastScrollTime = now;
        }
        this.scrollCount++;
        
        // Check for suspicious patterns
        if (this.analyzeScrollPattern() || this.scrollCount > this.SCROLL_THRESHOLD) {
            this.comms?.send("suspicious_activity", {
                type: "suspicious_scrolling",
                velocity,
                pattern: this.scrollHistory.map(s => s.velocity),
                count: this.scrollCount
            });
        }
        
        this.lastScrollPosition = position;
    };
    */

    mount(wnd: ReadiumWindow, _comms: Comms): boolean {
        // this.comms = _comms;
        // Setup print protection
        this.setupPrintProtection(wnd);

        // Setup event listeners
        // wnd.document.addEventListener("contextmenu", this.preventContextMenu);
        // wnd.document.addEventListener("keydown", this.preventKeyCombinations);
        // wnd.document.addEventListener("dragstart", this.preventDragAndDrop);
        // wnd.document.addEventListener("drop", this.preventDragAndDrop);
        // wnd.document.addEventListener("copy", this.preventBulkCopy, true);
        // wnd.document.addEventListener("cut", this.preventBulkCopy, true);
        
        // Setup user behavior monitoring
        // this.setupUserBehaviorMonitoring(wnd);
        
        // Add CSS to prevent image dragging and enable text selection
        this.styleElement = wnd.document.createElement("style");
        this.styleElement.setAttribute("data-content-protection", "true");
        this.styleElement.textContent = `
            img {
                -webkit-user-drag: none;
                -khtml-user-drag: none;
                -moz-user-drag: none;
                -o-user-drag: none;
                user-drag: none;
            }
            
            /* Allow text selection */
            * {
                user-select: text !important;
                -webkit-user-select: text !important;
                -moz-user-select: text !important;
                -ms-user-select: text !important;
            }
        `;
        wnd.document.head.appendChild(this.styleElement);

        return true;
    }

    unmount(wnd: ReadiumWindow, _comms: Comms): boolean {
        // this.comms = undefined;
        // Remove standard protection listeners
        // wnd.document.removeEventListener("contextmenu", this.preventContextMenu);
        // wnd.document.removeEventListener("keydown", this.preventKeyCombinations);
        // wnd.document.removeEventListener("dragstart", this.preventDragAndDrop);
        // wnd.document.removeEventListener("drop", this.preventDragAndDrop);
        // wnd.document.removeEventListener("copy", this.preventBulkCopy, true);
        // wnd.document.removeEventListener("cut", this.preventBulkCopy, true);
        
        // Remove user behavior monitoring listeners
        // if (this.options.monitorSelection) {
            // wnd.document.removeEventListener("selectionchange", this.handleSelection);
        // }

        /*
        if (this.options.detectRapidScrolling) {
            wnd.removeEventListener("scroll", this.handleScroll);
        }
        */

        // Remove the style element
        if (this.styleElement?.parentNode) {
            this.styleElement.parentNode.removeChild(this.styleElement);
            this.styleElement = null;
            return true;
        }
        return false;
    }
}

export default ContentProtection;