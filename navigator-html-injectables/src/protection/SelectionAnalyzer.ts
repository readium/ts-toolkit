interface SelectionEvent {
    timestamp: number;
    position: number;
    length: number;
}

export interface SelectionAnalyzerOptions {
    maxSelectionsPerSecond: number;
    minVariance: number;
    historySize: number;
}

export class SelectionAnalyzer {
    private events: SelectionEvent[] = [];
    private selectionStartTime = 0;
    private lastSelectionTime = 0;
    private lastSelectionPosition = 0;
    private selectionPatterns: number[] = [];
    private lastSelectedText = "";

    constructor(
        private readonly options: {
            maxSelectionsPerSecond: number;
            minVariance: number;
            historySize: number;
        } = {
            maxSelectionsPerSecond: 50,
            minVariance: 2,
            historySize: 10
        }
    ) {}

    public analyze(selection: Selection | null): boolean {
        if (!selection) {
            this.clear();
            return false;
        }

        const selectedText = selection.toString();
        if (selectedText.length === 0) {
            this.clear();
            return false;
        }

        if (selection.type !== "Range" || !selection.rangeCount) {
            return false;
        }

        const now = Date.now();

        // Only analyze if selection is meaningful and completed (not ongoing)
        // Check if user has actually finished selecting (mouse up or selection timeout)
        const timeSinceLastSelection = now - this.lastSelectionTime;
        const isCompletedSelection = timeSinceLastSelection > 500; // Wait 500ms to assume selection is complete
        
        if (!isCompletedSelection || selectedText.length <= 3 || selectedText === this.lastSelectedText) {
            return false;
        }

        // Track selection frequency
        if (now - this.lastSelectionTime > 1000) {
            this.lastSelectionTime = now;
        }

        if (this.selectionStartTime === 0) {
            this.selectionStartTime = now;
        }

        // Store current selection for comparison
        this.lastSelectedText = selectedText;

        // Analyze selection pattern
        const isSuspicious = this.analyzeSelectionPattern(selection, now);

        // Clean up old events
        this.cleanup(now);

        return isSuspicious;
    }

    private analyzeSelectionPattern(selection: Selection, now: number): boolean {
        if (!selection.rangeCount) return false;
        
        const range = selection.getRangeAt(0);
        const text = range.toString();
        
        // Calculate selection speed (characters/ms)
        const duration = now - this.selectionStartTime;
        const speed = text.length / Math.max(1, duration);
        
        // Check for unnaturally fast selection
        if (speed > this.options.maxSelectionsPerSecond) return true;
        
        // Analyze selection pattern (human selections have more variance)
        const currentPosition = range.startOffset;
        const distance = Math.abs(currentPosition - this.lastSelectionPosition);
        this.selectionPatterns.push(distance);
        
        if (this.selectionPatterns.length > this.options.historySize) {
            this.selectionPatterns.shift();
            const variance = this.calculateVariance(this.selectionPatterns);
            if (variance < this.options.minVariance) { // Very consistent patterns suggest automation
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

    private cleanup(now: number): void {
        // Keep events from the last second
        this.events = this.events.filter(e => now - e.timestamp <= 1000);
    }

    public clear(): void {
        this.events = [];
        this.selectionStartTime = 0;
        this.lastSelectionTime = 0;
        this.lastSelectionPosition = 0;
        this.selectionPatterns = [];
        this.lastSelectedText = "";
    }
}