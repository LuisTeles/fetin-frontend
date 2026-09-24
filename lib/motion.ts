/**
 * JS mirror of the durations in app/motion.css. Only for things CSS cannot do
 * (count-up numbers, measuring the sliding indicator) — everything else uses the CSS
 * utilities directly. Keep both files in sync.
 */
export const MOTION = {
    fast: 150,
    enter: 250,
    slow: 300,
    fill: 500,
    count: 600,
} as const

/** cubic-bezier(0.16, 1, 0.3, 1), evaluated as an easeOutExpo-like curve for rAF tweens. */
export function easeOut(t: number): number {
    return t >= 1 ? 1 : 1 - Math.pow(2, -10 * t)
}

export function prefersReducedMotion(): boolean {
    return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches
}
