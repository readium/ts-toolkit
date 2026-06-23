/**
 * Parses a W3C Media Fragments NPT (Normal Play Time) temporal value and
 * returns the corresponding time in seconds.
 *
 * Accepts the start of a range expression (e.g. "10,20" → 10).
 * Handles the optional "npt:" prefix and all three clock formats:
 *   - Seconds:       "1647.202"  or  "npt:1647.202"
 *   - MM:SS:         "27:27.2"   or  "npt:27:27.2"
 *   - HH:MM:SS:      "0:27:27.2" or  "npt:0:27:27.202"
 *
 * Returns `undefined` for any value that cannot be parsed.
 *
 * https://www.w3.org/TR/media-frags/#naming-time
 */
export function parseNptTime(raw: string): number | undefined {
    const start = raw.split(",")[0].trim();
    const normalizedStart = start.toLowerCase();
    const s = normalizedStart.startsWith("npt:") ? start.slice(4) : start;
    const parts = s.split(":");

    if (parts.length === 1) {
        const sec = parseFloat(parts[0]);
        return isNaN(sec) ? undefined : sec;
    }

    if (parts.length === 2) {
        const min = parseInt(parts[0], 10);
        const sec = parseFloat(parts[1]);
        if (isNaN(min) || isNaN(sec)) return undefined;
        return min * 60 + sec;
    }

    if (parts.length === 3) {
        const hr = parseInt(parts[0], 10);
        const min = parseInt(parts[1], 10);
        const sec = parseFloat(parts[2]);
        if (isNaN(hr) || isNaN(min) || isNaN(sec)) return undefined;
        return hr * 3600 + min * 60 + sec;
    }

    return undefined;
}

/**
 * Returns true when the NPT time value represents the start of a resource
 * (t=0, t=0.0, t=npt:0, t=npt:0:0:0, etc.).
 */
export function isNptStartOfResource(raw: string): boolean {
    const t = parseNptTime(raw);
    return t !== undefined && t === 0;
}
