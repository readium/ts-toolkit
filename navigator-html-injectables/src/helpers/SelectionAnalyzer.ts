interface SelectionEvent {
    timestamp: number;
    position: number;
    length: number;
}

export class SelectionAnalyzer {
    private events: SelectionEvent[] = [];
    private selectionStartTime = 0;
    private lastSelectionTime = 0;
    private selectionCount = 0;
    private lastSelectionPosition = 0;
    private selectionPatterns: number[] = [];
    private readonly SELECTION_THRESHOLD: number;

    constructor(
        private readonly options: {
            maxSelectionsPerSecond: number;
            minVariance: number;
            historySize: number;
            selectionThreshold?: number;
        } = {
            maxSelectionsPerSecond: 20,
            minVariance: 5,
            historySize: 10,
            selectionThreshold: 20
        }
    ) {
        this.SELECTION_THRESHOLD = this.options.selectionThreshold ?? 20;
    }

    public analyze(selection: Selection | null): boolean {
        if (!selection) {
            this.clear();
            return false;
        }

        if (selection.toString().length === 0) {
            this.clear();
            return false;
        }

        if (selection.type !== "Range" || !selection.rangeCount) {
            return false;
        }

        const now = Date.now();

        // Track selection frequency
        if (now - this.lastSelectionTime > 1000) {
            this.selectionCount = 0;
            this.lastSelectionTime = now;
        }
        this.selectionCount++;

        if (this.selectionStartTime === 0) {
            this.selectionStartTime = now;
        }

        // Analyze selection pattern
        const isSuspicious = this.analyzeSelectionPattern(selection, now) || 
                           this.selectionCount > this.SELECTION_THRESHOLD;

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

    private cleanup(now: number): void {
        // Keep events from the last second
        this.events = this.events.filter(e => now - e.timestamp <= 1000);
    }

    public clear(): void {
        this.events = [];
        this.selectionStartTime = 0;
        this.lastSelectionTime = 0;
        this.selectionCount = 0;
        this.lastSelectionPosition = 0;
        this.selectionPatterns = [];
    }
}