/**
 * The frontend's ONE place for time zones (DATA_AUDIT F-09, decision D1). Mirrors
 * Fetin-backend/src/common/time.ts so both sides agree on what "today", "this hour" and "this
 * weekday" mean: America/Sao_Paulo, not the browser's zone and not UTC.
 *
 * Three kinds of value, never mixed:
 *  - INSTANTS (completed_at, task date, created_at): converted with the local helpers.
 *  - DATE-ONLY values ("YYYY-MM-DD": exam_date, study_date): calendar dates, never converted
 *    to a zone (that would shift a day); use the date-string helpers.
 *  - Calendar cursors: a JS Date used only for its year/month/day (the calendar view). Build
 *    day keys from those parts with `toYmd`, never with `toISOString()`.
 */

export const APP_TIMEZONE = "America/Sao_Paulo"

const MS_PER_DAY = 24 * 60 * 60 * 1000

const DATE_PARTS = new Intl.DateTimeFormat("en-CA", {
    timeZone: APP_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
})

const WALL_CLOCK_PARTS = new Intl.DateTimeFormat("en-CA", {
    timeZone: APP_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23", // 00-23, never "24"
})

function asDate(value: Date | string): Date {
    return value instanceof Date ? value : new Date(value)
}

/** "YYYY-MM-DD" of an instant on the São Paulo wall clock. */
export function localDateOf(instant: Date | string): string {
    return DATE_PARTS.format(asDate(instant))
}

/** Today's date on the student's calendar. */
export function localToday(now: Date = new Date()): string {
    return localDateOf(now)
}

function wallClock(instant: Date) {
    const parts: Record<string, number> = {}
    for (const part of WALL_CLOCK_PARTS.formatToParts(instant)) {
        if (part.type !== "literal") parts[part.type] = Number(part.value)
    }
    return parts as { year: number; month: number; day: number; hour: number; minute: number; second: number }
}

/** 0-23 hour of an instant on the São Paulo wall clock. */
export function localHourOf(instant: Date | string): number {
    return wallClock(asDate(instant)).hour
}

/** "HH:mm" of an instant on the São Paulo wall clock. */
export function localTimeOf(instant: Date | string): string {
    const { hour, minute } = wallClock(asDate(instant))
    return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`
}

function offsetAt(instant: Date): number {
    const w = wallClock(instant)
    return Date.UTC(w.year, w.month - 1, w.day, w.hour, w.minute, w.second) - Math.floor(instant.getTime() / 1000) * 1000
}

/** The instant at which the São Paulo wall clock reads `date` `hour:minute` (two passes: safe across offset changes). */
export function atLocal(date: string, hour = 0, minute = 0): Date {
    const [y, m, d] = date.split("-").map(Number)
    const guess = Date.UTC(y, m - 1, d, hour, minute)
    const first = guess - offsetAt(new Date(guess))
    return new Date(guess - offsetAt(new Date(first)))
}

/** 00:00 São Paulo of a calendar date ("YYYY-MM-DD"), or of the local day containing an instant. */
export function startOfLocalDay(value: Date | string): Date {
    return atLocal(typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : localDateOf(value))
}

/** A datetime-local input value ("YYYY-MM-DDTHH:mm") is a São Paulo wall-clock time → the instant. */
export function wallClockInputToInstant(value: string): Date {
    const [date, time = "00:00"] = value.split("T")
    const [hour, minute] = time.split(":").map(Number)
    return atLocal(date, hour, minute)
}

/** The instant → the value a datetime-local input expects, on the São Paulo wall clock. */
export function instantToWallClockInput(instant: Date | string): string {
    return `${localDateOf(instant)}T${localTimeOf(instant)}`
}

// ─── Date-only values ("YYYY-MM-DD") ──────────────────────────────────────────

/** The calendar date of a date-only string or of an ISO string whose date part is the calendar date. */
export function dateOnlyString(value: Date | string): string {
    return (typeof value === "string" ? value : value.toISOString()).slice(0, 10)
}

/** Pads a calendar date from parts; month is 0-based and may overflow (month 12 is January next year, day 0 is the last day before). */
export function toYmd(year: number, monthIndex: number, day: number): string {
    return new Date(Date.UTC(year, monthIndex, day)).toISOString().slice(0, 10)
}

export function addDays(value: string, days: number): string {
    return new Date(Date.parse(`${dateOnlyString(value)}T00:00:00.000Z`) + days * MS_PER_DAY).toISOString().slice(0, 10)
}

/** Whole calendar days from `from` to `to` (date-only values); negative when `to` is earlier. */
export function daysBetween(from: string, to: string): number {
    const start = Date.parse(`${dateOnlyString(from)}T00:00:00.000Z`)
    const end = Date.parse(`${dateOnlyString(to)}T00:00:00.000Z`)
    return Math.round((end - start) / MS_PER_DAY)
}

/** 0 = Sunday .. 6 = Saturday of a calendar date. */
export function weekdayOfDateString(value: string): number {
    return new Date(`${dateOnlyString(value)}T00:00:00.000Z`).getUTCDay()
}

/** A local Date (noon) whose year/month/day are `date`: a calendar cursor, not an instant. */
export function cursorFromYmd(date: string): Date {
    const [y, m, d] = date.split("-").map(Number)
    return new Date(y, m - 1, d, 12)
}

/** Calendar cursor positioned on today (São Paulo). */
export function todayCursor(): Date {
    return cursorFromYmd(localToday())
}

/** "YYYY-MM-DD" of a calendar cursor's year/month/day (never via toISOString). */
export function ymdOfCursor(cursor: Date): string {
    return toYmd(cursor.getFullYear(), cursor.getMonth(), cursor.getDate())
}
