type Direction = "left" | "right" | "up" | "down";

export class PatternAnalyzer {
    private history: Array<{
        timestamp: number;
        direction: Direction;
        velocity: number;
    }> = [];
    
    constructor(
        private options: {
            maxVelocity: number;     // pixels/ms
            minVariance: number;     // 0-1
            historySize?: number;
        }
    ) {}

    analyze(direction: Direction, distance: number, timeDelta: number): boolean {
        if (timeDelta <= 0) return false;
        
        const velocity = Math.abs(distance) / timeDelta;
        const now = Date.now();
        
        // Add new event
        this.history.push({ timestamp: now, direction, velocity });
        
        // Clean up old events
        this.history = this.history
            .filter(h => now - h.timestamp < 2000)
            .slice(-(this.options.historySize || 10));

        if (this.history.length < 3) return false;

        // Check for excessive speed
        if (velocity > this.options.maxVelocity) {
            this.history = []; // Reset after detection
            return true;
        }

        // Check for unnatural consistency
        const velocities = this.history.map(h => h.velocity);
        const mean = velocities.reduce((a, b) => a + b, 0) / velocities.length;
        const variance = velocities.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / velocities.length;
        
        if (variance < this.options.minVariance) {
            this.history = []; // Reset after detection
            return true;
        }

        // Check for rapid direction changes
        let changes = 0;
        for (let i = 1; i < this.history.length; i++) {
            if (this.history[i].direction !== this.history[i-1].direction) {
                changes++;
            }
        }
        if (changes > this.history.length * 0.7) {
            this.history = []; // Reset after detection
            return true;
        }

        return false;
    }

    clear(): void {
        this.history = [];
    }
}