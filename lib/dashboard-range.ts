/**
 * Shared time-range vocabulary for the dashboard.
 *
 * Deliberately NOT inside the "use client" filter component. A Client Component may be
 * rendered from the server, but its plain exports cannot be *called* there — doing so
 * fails at runtime with "Attempted to call parseRange() from the server", which neither
 * `tsc` nor `next build` catches. Constants and pure helpers that both sides need live
 * in a neutral module like this one.
 */

export const RANGE_OPTIONS = [
    { value: "14", label: "14 dias" },
    { value: "28", label: "28 dias" },
    { value: "56", label: "56 dias" },
    { value: "90", label: "90 dias" },
] as const

export const DEFAULT_RANGE = "56"

/** Reads the range from searchParams, clamped to a known option. */
export function parseRange(value: string | string[] | undefined): string {
    const raw = Array.isArray(value) ? value[0] : value
    return RANGE_OPTIONS.some((o) => o.value === raw) ? (raw as string) : DEFAULT_RANGE
}
