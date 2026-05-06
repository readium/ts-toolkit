import { sML } from "../helpers/sML.ts";
import { WorkerConsole } from "./utils/WorkerConsole.ts";
import { log, table, clear } from "./utils/console.ts";
import { isBrave } from "./utils/platform.ts";
import { match } from "./utils/match.ts";

export interface DevToolsDetectorOptions {
    /** Callback when Developer Tools are detected as open */
    onDetected?: () => void;
    /** Callback when Developer Tools are detected as closed */
    onClosed?: () => void;
    /** Detection interval in milliseconds (default: 1000) */
    interval?: number;
    /** Enable debugger-based detection (fallback, impacts UX) */
    enableDebuggerDetection?: boolean;
}

export class DevToolsDetector {
    private options: Required<DevToolsDetectorOptions>;
    private isOpen = false;
    private intervalId?: number;
    private checkCount = 0;
    private maxChecks = 10;
    private maxPrintTime = 0;
    private largeObjectArray: Record<string, string>[] | null = null;
    private workerConsole?: WorkerConsole;

    constructor(options: DevToolsDetectorOptions = {}) {
        this.options = {
            onDetected: options.onDetected || (() => {}),
            onClosed: options.onClosed || (() => {}),
            interval: options.interval || 1000,
            enableDebuggerDetection: options.enableDebuggerDetection || false
        };

        // Initialize Web Worker for console operations (skip Firefox for now as it will fail)
        if (!sML.UA.Firefox) {
            try {
                const blob = new Blob([WorkerConsole.workerScript], { type: 'application/javascript' });
                const blobUrl = URL.createObjectURL(blob);
                const worker = new Worker(blobUrl);
                this.workerConsole = new WorkerConsole(worker, blobUrl);
            } catch (error) {
                // Fallback to regular console if Worker creation fails
                console.warn('Failed to create Web Worker for DevTools detection:', error);
            }
        }

        this.startDetection();
    }

    /**
     * Create large object array for performance testing
     */
    private createLargeObjectArray(): Record<string, string>[] {
        const largeObject: Record<string, string> = {};
        for (let i = 0; i < 500; i++) {
            largeObject[`${i}`] = `${i}`;
        }

        const largeObjectArray: Record<string, string>[] = [];
        for (let i = 0; i < 50; i++) {
            largeObjectArray.push(largeObject);
        }

        return largeObjectArray;
    }

    /**
     * Get cached large object array
     */
    private getLargeObjectArray(): Record<string, string>[] {
        if (this.largeObjectArray === null) {
            this.largeObjectArray = this.createLargeObjectArray();
        }
        return this.largeObjectArray;
    }

    /**
     * Performance-based detection using console.table timing
     */
    private async calcTablePrintTime(): Promise<number> {
        const largeObjectArray = this.getLargeObjectArray();

        if (this.workerConsole) {
            try {
                const result = await this.workerConsole.table(largeObjectArray);
                return result.time;
            } catch (e) {
                // Fallback to regular console
                const start = performance.now();
                table(largeObjectArray);
                return performance.now() - start;
            }
        } else {
            // Fallback to cached console methods
            const start = performance.now();
            table(largeObjectArray);
            return performance.now() - start;
        }
    }

    /**
     * Performance-based detection using console.log timing
     */
    private async calcLogPrintTime(): Promise<number> {
        const largeObjectArray = this.getLargeObjectArray();

        if (this.workerConsole) {
            const result = await this.workerConsole.log(largeObjectArray);
            return result.time;
        } else {
            // Fallback to cached console methods
            const start = performance.now();
            log(largeObjectArray);
            return performance.now() - start;
        }
    }

    /**
     * Check if performance-based detection is enabled for current browser
     */
    private isPerformanceDetectionEnabled(): boolean {
        return match({
            includes: [
                () => !!sML.UA.Chrome,
                () => !!sML.UA.Chromium,
                () => !!sML.UA.Safari,
                () => !!sML.UA.Firefox
            ],
            excludes: []
        });
    }

    /**
     * Check if debugger detection is enabled for current browser
     */
    private isDebuggerDetectionEnabled(): boolean {
        // Only enable debugger detection if explicitly enabled in options
        // Note: We can't check for Brave here since isBrave() is async
        // and this method needs to be synchronous
        return this.options.enableDebuggerDetection;
    }

    /**
     * Performance-based detection using large object timing differences
     */
    private async checkPerformanceBased(): Promise<boolean> {
        if (!this.isPerformanceDetectionEnabled()) {
            return false;
        }

        const tablePrintTime = await this.calcTablePrintTime();
        const logPrintTime = Math.max(await this.calcLogPrintTime(), await this.calcLogPrintTime());
        this.maxPrintTime = Math.max(this.maxPrintTime, logPrintTime);

        if (this.workerConsole) {
            await this.workerConsole.clear();
        } else {
            clear();
        }

        if (tablePrintTime === 0) return false;
        if (this.maxPrintTime === 0) {
            if (await isBrave()) {
                return true;
            }
            return false;
        }

        return tablePrintTime > this.maxPrintTime * 10;
    }

    /**
     * Debugger-based detection (fallback method)
     * WARNING: This method impacts user experience
     */
    private async checkDebuggerBased(): Promise<boolean> {
        if (!this.isDebuggerDetectionEnabled()) {
            return false;
        }

        // Skip debugger detection in Brave (has anti-fingerprinting measures)
        if (await isBrave()) {
            return false;
        }

        const startTime = performance.now();

        try {
            (() => {}).constructor('debugger')();
        } catch {
            debugger;
        }

        return performance.now() - startTime > 100;
    }

    /**
     * Main detection method combining multiple approaches
     * Prioritizes performance-based detection
     */
    private async detectDevTools(): Promise<boolean> {
        // Primary method: Performance-based detection (from original library)
        const performanceResult = await this.checkPerformanceBased();

        if (performanceResult) {
            return true;
        }

        // Fallback method: Debugger-based (only if enabled)
        if (this.options.enableDebuggerDetection && this.checkCount >= this.maxChecks) {
            const debuggerResult = await this.checkDebuggerBased();
            return debuggerResult;
        }

        return false;
    }

    /**
     * Start continuous detection monitoring
     */
    private startDetection() {
        this.intervalId = window.setInterval(async () => {
            this.checkCount++;
            const currentlyOpen = await this.detectDevTools();

            if (currentlyOpen !== this.isOpen) {
                this.isOpen = currentlyOpen;

                if (currentlyOpen) {
                    this.options.onDetected();
                } else {
                    this.options.onClosed();
                }
            }

            // Reset check count periodically to avoid excessive debugger usage
            if (this.checkCount > this.maxChecks * 2) {
                this.checkCount = 0;
            }
        }, this.options.interval);

        // Cleanup on page unload
        window.addEventListener('beforeunload', () => this.destroy());
    }

    /**
     * Get current DevTools state
     */
    public isDevToolsOpen(): boolean {
        return this.isOpen;
    }

    /**
     * Force an immediate check
     */
    public async checkNow(): Promise<boolean> {
        const wasOpen = this.isOpen;
        this.isOpen = await this.detectDevTools();

        if (this.isOpen !== wasOpen) {
            if (this.isOpen) {
                this.options.onDetected();
            } else {
                this.options.onClosed();
            }
        }

        return this.isOpen;
    }

    /**
     * Stop detection and cleanup resources
     */
    public destroy() {
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = undefined;
        }

        // Cleanup Web Worker
        if (this.workerConsole) {
            this.workerConsole.destroy();
            this.workerConsole = undefined;
        }

        this.isOpen = false;
        this.checkCount = 0;
    }
}
