/**
 * Match utilities for browser compatibility checking
 */

export interface MatchOptions {
    includes: (() => boolean)[];
    excludes: (() => boolean)[];
}

export function match(options: MatchOptions): boolean {
    // Check if any exclude condition is true
    if (options.excludes.some(condition => condition())) {
        return false;
    }
    
    // Check if any include condition is true
    return options.includes.some(condition => condition());
}
