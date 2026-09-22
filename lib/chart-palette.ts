/**
 * Status palette for charts and analytics figures.
 *
 * Dark mode is **selected, not flipped**. The same hexes do not work on both surfaces:
 * the light steps sit outside the dark lightness band, so each theme gets its own step
 * chosen against its own surface.
 *
 * Both sets are validated with the dataviz skill's `scripts/validate_palette.js`:
 *
 *   light (surface #fcfcfb) → ALL CHECKS PASS
 *     contrast WARN (2.47 / 2.09) — relief required, satisfied by the visible text
 *     labels that always accompany these colours.
 *
 *   dark  (surface #18181b) → ALL CHECKS PASS
 *     CVD warn ΔE 8.0 (protan) sits in the 6–8 floor band, legal only with secondary
 *     encoding — again the text labels.
 *
 * Re-run the validator before changing any value here:
 *   node <dataviz>/scripts/validate_palette.js "#059669,#c2870a,#dc2626" --mode dark --surface "#18181b"
 *
 * These are STATUS colours (good / warning / critical) and are reserved. Never reuse them
 * as "series 4" of a categorical palette, and never ship them without a label or icon.
 */

export interface StatusPalette {
    good: string
    warning: string
    critical: string
}

export const STATUS_LIGHT: StatusPalette = {
    good: "#10b981",
    warning: "#f59e0b",
    critical: "#ef4444",
}

export const STATUS_DARK: StatusPalette = {
    good: "#059669",
    warning: "#c2870a", // one step down from yellow-600: 0.681 was just over the 0.67 band
    critical: "#dc2626",
}

export function statusPalette(isDark: boolean): StatusPalette {
    return isDark ? STATUS_DARK : STATUS_LIGHT
}

/** Picks a status slot from a 0–1 score. Shared so thresholds never drift between widgets. */
export function statusForScore(score: number, isDark = false): string {
    const palette = statusPalette(isDark)
    if (score >= 0.8) return palette.good
    if (score >= 0.5) return palette.warning
    return palette.critical
}

/**
 * Categorical series colours, in FIXED order — assigned by series identity, never cycled
 * and never reassigned by rank. Filtering a series out must not repaint the survivors.
 *
 * Capped at four deliberately: the curve explorer shows at most four topics, which is also
 * the limit at which every series can still be direct-labelled. A fifth series would need
 * small multiples, not a fifth hue.
 *
 * Both sets validated with scripts/validate_palette.js against their own surface:
 *   light (#fcfcfb) → ALL CHECKS PASS
 *   dark  (#18181b) → ALL CHECKS PASS
 * The light steps FAIL the dark lightness band, which is why dark gets its own set.
 */
export const CATEGORICAL_LIGHT = ["#6366f1", "#10b981", "#f59e0b", "#ec4899"] as const
export const CATEGORICAL_DARK = ["#2563eb", "#059669", "#d97706", "#db2777"] as const

export function categoricalPalette(isDark: boolean): readonly string[] {
    return isDark ? CATEGORICAL_DARK : CATEGORICAL_LIGHT
}
