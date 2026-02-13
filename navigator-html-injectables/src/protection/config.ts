import { BulkCopyProtectionOptions } from "./BulkCopyProtector";
import { PatternAnalyzerOptions } from "./PatternAnalyzer";
import { SelectionAnalyzerOptions } from "./SelectionAnalyzer";

export const SCROLL_PROTECTION_CONFIG: PatternAnalyzerOptions = {
    maxVelocity: 200,         // Extremely fast scrolling (pixels/ms)
    minVariance: 0.00001,     // Near-perfect consistency
    historySize: 100,         // Large history window
    minDirectionChanges: 0.1, // Only trigger on near-perfect patterns
    maxConsistentScrolls: 20  // Need many consistent scrolls
};

export const SELECTION_ANALYZER_CONFIG: SelectionAnalyzerOptions = {
    maxSelectionsPerSecond: 10,
    minVariance: 5,
    historySize: 20
};

export const BULK_COPY_CONFIG: BulkCopyProtectionOptions = {
    enabled: true,
    maxSelectionPercent: 0.7,
    minThreshold: 100,
    absoluteMaxChars: 50000,
    historySize: 20
}