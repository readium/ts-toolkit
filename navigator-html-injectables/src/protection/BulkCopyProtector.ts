import { ReadiumWindow } from "../helpers/dom";

interface CopyAttempt {
    timestamp: number;
    length: number;
    wasBlocked: boolean;
}

export interface BulkCopyProtectionOptions {
    enabled: boolean;
    maxSelectionPercent: number;
    absoluteMaxChars: number;
    minThreshold: number;
    historySize: number;
}

export class BulkCopyProtector {
    private options: BulkCopyProtectionOptions;
    private copyHistory: CopyAttempt[] = [];
    private lastSelectionLength = 0;
    private lastSelectionTime = 0;

    constructor(
        private readonly window: ReadiumWindow,
        options: BulkCopyProtectionOptions
    ) {
        this.options = options;
    }

    private cleanupOldHistory(now: number): void {
        // Keep history for the last 10 seconds
        const historyWindow = 10000; // 10 seconds
        this.copyHistory = this.copyHistory.filter(
            attempt => now - attempt.timestamp < historyWindow
        );
        
        // Trim to max history size
        if (this.copyHistory.length > this.options.historySize) {
            this.copyHistory = this.copyHistory.slice(-this.options.historySize);
        }
    }

    private isSuspiciousPattern(now: number): boolean {
        if (this.copyHistory.length < 3) return false;
        
        // Check for rapid successive copy attempts
        const recentAttempts = this.copyHistory.filter(
            attempt => now - attempt.timestamp < 2000 // Last 2 seconds
        );
        
        if (recentAttempts.length >= 3) {
            // If multiple rapid copy attempts, it's suspicious
            return true;
        }
        
        // Check for increasing selection sizes (bulk copy pattern)
        const increasingSelections = this.copyHistory
            .slice()
            .sort((a, b) => a.timestamp - b.timestamp)
            .every((attempt, i, arr) => {
                if (i === 0) return true;
                return attempt.length > arr[i - 1].length * 1.5; // Each selection is significantly larger
            });
            
        return increasingSelections;
    }

    public shouldAllowCopy(event: ClipboardEvent): boolean {
        if (!this.options.enabled) return true;

        const selection = this.window.getSelection();
        if (!selection) return true;
        
        const selectedText = selection.toString();
        const selectedLength = selectedText.length;
        const docLength = this.window.document.body.innerText.length;
        const now = Date.now();

        // Clean up old history entries
        this.cleanupOldHistory(now);

        // Always allow small selections
        if (selectedLength < this.options.minThreshold) {
            this.copyHistory.push({
                timestamp: now,
                length: selectedLength,
                wasBlocked: false
            });
            return true;
        }

        const timeSinceLastSelection = now - this.lastSelectionTime;
        
        // Check for rapid successive selections
        const isRapidSelection = 
            timeSinceLastSelection < 100 && 
            selectedLength > this.lastSelectionLength * 1.5;
            
        const maxAllowedSelection = Math.min(
            docLength * this.options.maxSelectionPercent,
            this.options.absoluteMaxChars
        );

        // Check if this matches a suspicious pattern
        const isSuspicious = this.isSuspiciousPattern(now);
        
        const shouldBlock = selectedLength > maxAllowedSelection || 
                          isRapidSelection || 
                          isSuspicious;

        // Record this attempt in history
        this.copyHistory.push({
            timestamp: now,
            length: selectedLength,
            wasBlocked: shouldBlock
        });

        if (shouldBlock) {
            event?.preventDefault();
            return false;
        }
        
        this.lastSelectionLength = selectedLength;
        this.lastSelectionTime = now;
        return true;
    }

    public destroy(): void {
        this.lastSelectionLength = 0;
        this.lastSelectionTime = 0;
        this.copyHistory = [];
        this.options.enabled = false;
    }
}
