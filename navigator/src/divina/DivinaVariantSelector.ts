import { Link } from "@readium/shared";
import { sML } from "@readium/navigator-html-injectables";

/**
 * User-selectable image quality for publications that provide alternate
 * resolutions of their pages (RWPM `alternate` links).
 */
export enum DivinaQuality {
    auto = "auto", // Match the display resolution
    low = "low", // Smallest available variant
    high = "high", // One step above the display resolution
    max = "max", // Largest available variant
}

// Display caps for mobile devices: beyond this, decode lag, memory pressure
// and canvas limits outweigh the quality gain (from xbreader)
export const MOBILE_MAX_HEIGHT = 2560;
export const MOBILE_MAX_WIDTH = 1800;

// Accounts for rounding and slight aspect-ratio variance between variants
const DIMENSION_TOLERANCE = 16;

/** The link itself and its (bitmap) alternates, if any */
export function gatherVariants(item: Link): Link[] {
    const variants = item.alternates?.items ? [...item.alternates.items] : [];
    variants.unshift(item);
    return variants.filter(l => !l.type || l.type.startsWith("image/"));
}

export interface VariantSelectionOptions {
    /** Display size of the page in device pixels (CSS box × devicePixelRatio) */
    targetWidth: number;
    targetHeight: number;
    /** The axis that constrains the display: height in paged mode, width in scrolled mode */
    axis: "width" | "height";
    quality: DivinaQuality;
}

/**
 * Selects the most appropriate variant of a page image for the current
 * display, based purely on the choices the manifest offers: the smallest
 * variant that covers the display resolution (in device pixels), biased by
 * the quality preference, and capped on mobile devices.
 */
export function selectVariant(item: Link, opts: VariantSelectionOptions): Link {
    const dim = (l: Link) => (opts.axis === "width" ? l.width : l.height) || 0;
    // Variants without dimensions can't be compared, leave them out
    const candidates = gatherVariants(item).filter(l => dim(l) > 0);
    if (candidates.length <= 1) return candidates[0] || item;

    const sorted = candidates.sort((a, b) => dim(a) - dim(b));
    const mobile = sML.OS.iOS || sML.OS.Android;
    const cap = mobile ? (opts.axis === "width" ? MOBILE_MAX_WIDTH : MOBILE_MAX_HEIGHT) : Infinity;
    /** The largest variant that doesn't exceed the mobile cap (or the smallest overall) */
    const capped = (pick: Link): Link => {
        if (dim(pick) <= cap) return pick;
        const fitting = sorted.filter(l => l === pick || dim(l) <= cap);
        return fitting.length > 1 ? fitting[fitting.length - 2] : sorted[0];
    };

    switch (opts.quality) {
        case DivinaQuality.low:
            return sorted[0];
        case DivinaQuality.max:
            return capped(sorted[sorted.length - 1]);
        default: {
            const target = Math.min(opts.axis === "width" ? opts.targetWidth : opts.targetHeight, cap);
            // Smallest variant that covers the display resolution
            let pick = sorted.find(l => dim(l) >= target - DIMENSION_TOLERANCE) || sorted[sorted.length - 1];
            if (opts.quality === DivinaQuality.high) {
                const next = sorted[sorted.indexOf(pick) + 1];
                if (next) pick = next;
            }
            return capped(pick);
        }
    }
}
