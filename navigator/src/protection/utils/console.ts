/**
 * Cache console methods to prevent third-party code from hooking them
 */

function cacheConsoleMethod<K extends keyof Console>(name: K): Console[K] {
    if (typeof window !== 'undefined' && console) {
        return console[name];
    }

    // Fallback for non-browser environments
    return (..._args: any[]) => {};
}

export const log = cacheConsoleMethod('log');
export const table = cacheConsoleMethod('table');
export const clear = cacheConsoleMethod('clear');
