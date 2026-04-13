import { DEFAULT_PATTERN_ANALYZER_CONFIG } from "./config.ts";

type Direction = "left" | "right" | "up" | "down";

export interface PatternAnalyzerOptions {
    maxVelocity: number;          // pixels/ms
    minVariance: number;          // 0-1
    historySize?: number;         // Number of scroll events to keep in history
    minDirectionChanges?: number; // Minimum ratio of direction changes to total events (0-1)
    maxConsistentScrolls?: number; // Maximum number of consistent scrolls before flagging
}

// TODO: Improve for scroll protection,
// currently disabled because of false positives
export class PatternAnalyzer {
    private options: PatternAnalyzerOptions;
    private history: Array<{
        timestamp: number;
        direction: Direction;
        velocity: number;
        distance: number;
    }> = [];

    private consistentScrollCount = 0;

    constructor(
        options: Partial<PatternAnalyzerOptions> = {}
    ) {
        // Merge provided options with default config
        this.options = { ...DEFAULT_PATTERN_ANALYZER_CONFIG, ...options };
    }

    analyze(direction: Direction, distance: number, timeDelta: number): boolean {
        if (timeDelta <= 0) return false;

        const velocity = Math.abs(distance) / timeDelta;
        const now = Date.now();

        // Add new event
        this.history.push({
            timestamp: now,
            direction,
            velocity,
            distance: Math.abs(distance)
        });

        // Clean up old events (keep last 2 seconds of data or historySize, whichever is smaller)
        this.history = this.history
            .filter(h => now - h.timestamp < 2000)
            .slice(-(this.options.historySize || 20));

        // Need at least 3 events to start detecting patterns
        if (this.history.length < 3) return false;

        // 1. Check for excessive speed (unrealistically fast scrolling)
        if (velocity > this.options.maxVelocity) {
            this.resetAfterDetection();
            return true;
        }

        // 2. Check for consistent scrolling patterns
        const velocities = this.history.map(h => h.velocity);
        const distances = this.history.map(h => h.distance);

        // Calculate mean and variance of velocities and distances
        const meanVelocity = velocities.reduce((a, b) => a + b, 0) / velocities.length;
        const meanDistance = distances.reduce((a, b) => a + b, 0) / distances.length;

        const velocityVariance = velocities.reduce((a, b) => a + Math.pow(b - meanVelocity, 2), 0) / velocities.length;
        const distanceVariance = distances.reduce((a, b) => a + Math.pow(b - meanDistance, 2), 0) / distances.length;

        // Check for suspiciously consistent scrolling (low variance in speed and distance)
        if (velocityVariance < this.options.minVariance &&
            distanceVariance < (meanDistance * 0.1)) { // Allow 10% variance in distance
            this.consistentScrollCount++;

            // Only trigger if we've seen consistent scrolling for a while
            if (this.consistentScrollCount >= (this.options.maxConsistentScrolls || 10)) {
                this.resetAfterDetection();
                return true;
            }
        } else {
            // Reset counter if pattern breaks
            this.consistentScrollCount = Math.max(0, this.consistentScrollCount - 1);
        }

        // 3. Check for rapid direction changes (unnatural back-and-forth scrolling)
        let directionChanges = 0;
        let lastDirection = this.history[0].direction;

        for (let i = 1; i < this.history.length; i++) {
            if (this.history[i].direction !== lastDirection) {
                directionChanges++;
                lastDirection = this.history[i].direction;
            }
        }

        const directionChangeRatio = directionChanges / this.history.length;
        if (directionChangeRatio > (this.options.minDirectionChanges || 0.3)) {
            this.resetAfterDetection();
            return true;
        }

        return false;
    }

    private resetAfterDetection(): void {
        // Keep some history to prevent immediate re-triggering
        this.history = this.history.slice(-3);
        this.consistentScrollCount = 0;
    }

    clear(): void {
        this.history = [];
        this.consistentScrollCount = 0;
    }
}
