import { BulkCopyProtectionOptions } from "./BulkCopyProtector";
import { PatternAnalyzerOptions } from "./PatternAnalyzer";
import { SelectionAnalyzerOptions } from "./SelectionAnalyzer";

export const DEFAULT_PATTERN_ANALYZER_CONFIG: PatternAnalyzerOptions = {
    maxVelocity: 200,         // Reasonable default for human-like scrolling (pixels/ms)
    minVariance: 0.01,        // Default variance threshold
    historySize: 20,          // Balanced history size for performance
    minDirectionChanges: 0.2, // Reasonable default for detecting patterns
    maxConsistentScrolls: 15  // Balanced threshold for flagging
};

export const SCROLL_PROTECTION_CONFIG: PatternAnalyzerOptions = {
    maxVelocity: 200,         // Extremely fast scrolling (pixels/ms)
    minVariance: 0.00001,     // Near-perfect consistency
    historySize: 100,         // Large history window
    minDirectionChanges: 0.1, // Only trigger on near-perfect patterns
    maxConsistentScrolls: 20  // Need many consistent scrolls
};

export const SELECTION_ANALYZER_CONFIG: SelectionAnalyzerOptions = {
    maxSelectionsPerSecond: 500,
    minVariance: 50,
    historySize: 20
};

export const BULK_COPY_CONFIG: BulkCopyProtectionOptions = {
    enabled: true,
    maxSelectionPercent: 0.1,
    minThreshold: 100,
    absoluteMaxChars: 5000,
    historySize: 20
}