/**
 * Platform detection utilities
 */

export async function isBrave(): Promise<boolean> {
    // Use native Brave API if available (most reliable)
    if (typeof navigator !== 'undefined' && (navigator as any).brave && (navigator as any).brave.isBrave) {
        try {
            return await Promise.race([
                (navigator as any).brave.isBrave(),
                new Promise(resolve => setTimeout(() => resolve(false), 1000))
            ]);
        } catch (e) {
            // API call failed, but we know Brave is available
            return true;
        }
    }

    // Fallback: only when native API doesn't exist at all
    // If we're not sure, return false to avoid false positives
    return false;
}
