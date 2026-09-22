/**
 * Locale-aware formatting.
 *
 * Dates and numbers were being built with hardcoded `pt-BR` strings, which breaks for any
 * other locale and hardcodes an assumption the browser can answer better. Everything here
 * goes through `Intl.*`.
 *
 * Formatters are memoised at module level: constructing an `Intl.*` formatter is expensive
 * and these are called once per row in tables that can run to hundreds of rows.
 */

const DEFAULT_LOCALE = "pt-BR"

const cache = new Map<string, Intl.DateTimeFormat | Intl.NumberFormat>()

function dateFormatter(locale: string, options: Intl.DateTimeFormatOptions) {
    const key = `d:${locale}:${JSON.stringify(options)}`
    let formatter = cache.get(key) as Intl.DateTimeFormat | undefined
    if (!formatter) {
        formatter = new Intl.DateTimeFormat(locale, options)
        cache.set(key, formatter)
    }
    return formatter
}

function numberFormatter(locale: string, options: Intl.NumberFormatOptions) {
    const key = `n:${locale}:${JSON.stringify(options)}`
    let formatter = cache.get(key) as Intl.NumberFormat | undefined
    if (!formatter) {
        formatter = new Intl.NumberFormat(locale, options)
        cache.set(key, formatter)
    }
    return formatter
}

/** "14:32" */
export function formatTime(value: Date | string, locale = DEFAULT_LOCALE): string {
    const date = typeof value === "string" ? new Date(value) : value
    return dateFormatter(locale, { hour: "2-digit", minute: "2-digit" }).format(date)
}

/** "27/08/2026" */
export function formatDate(value: Date | string, locale = DEFAULT_LOCALE): string {
    const date = typeof value === "string" ? new Date(value) : value
    return dateFormatter(locale, { day: "2-digit", month: "2-digit", year: "numeric" }).format(date)
}

/** "Qui 27" — the short weekday + day-of-month used along chart axes. */
export function formatShortDay(value: Date | string, locale = DEFAULT_LOCALE): string {
    const date = typeof value === "string" ? new Date(value) : value
    return dateFormatter(locale, { weekday: "short", day: "numeric" }).format(date)
}

/**
 * Weekday labels in the viewer's locale, starting Sunday.
 *
 * Replaces the DAY_LABELS_PT array hardcoded in the backend's dashboard service — the
 * server should ship data, not display strings.
 */
export function weekdayLabels(locale = DEFAULT_LOCALE): string[] {
    const formatter = dateFormatter(locale, { weekday: "short" })
    // 2024-01-07 was a Sunday; add days to walk one full week.
    return Array.from({ length: 7 }, (_, index) =>
        formatter.format(new Date(Date.UTC(2024, 0, 7 + index))),
    )
}

/** "1.234,5" */
export function formatNumber(
    value: number,
    { locale = DEFAULT_LOCALE, maximumFractionDigits = 1 } = {},
): string {
    return numberFormatter(locale, { maximumFractionDigits }).format(value)
}

/** 0.87 -> "87%" */
export function formatPercent(
    value: number,
    { locale = DEFAULT_LOCALE, maximumFractionDigits = 0 } = {},
): string {
    return numberFormatter(locale, { style: "percent", maximumFractionDigits }).format(value)
}

/** 135 -> "2h 15min" */
export function formatMinutes(minutes: number, locale = DEFAULT_LOCALE): string {
    const hours = Math.floor(minutes / 60)
    const rest = Math.round(minutes % 60)
    if (hours === 0) return `${formatNumber(rest, { locale, maximumFractionDigits: 0 })}min`
    if (rest === 0) return `${formatNumber(hours, { locale, maximumFractionDigits: 0 })}h`
    return `${formatNumber(hours, { locale, maximumFractionDigits: 0 })}h ${formatNumber(rest, { locale, maximumFractionDigits: 0 })}min`
}
