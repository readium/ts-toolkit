import { PatternAnalyzerOptions } from "./PatternAnalyzer";

export const SCROLL_PROTECTION_CONFIG: PatternAnalyzerOptions = {
    maxVelocity: 200,         // Extremely fast scrolling (pixels/ms)
    minVariance: 0.00001,     // Near-perfect consistency
    historySize: 100,         // Large history window
    minDirectionChanges: 0.1, // Only trigger on near-perfect patterns
    maxConsistentScrolls: 20  // Need many consistent scrolls
};
