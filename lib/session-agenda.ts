/**
 * The Sessões tab's agenda: active plans' sessions and upcoming exams, grouped for "what do I
 * do now". Pure and import-free at runtime (type imports only) so
 * scripts/check-session-agenda.mts can run it under plain node.
 *
 * "today" and "horizonEnd" come from the caller via lib/time.ts — this module never asks the
 * clock. Date-only values are compared as "YYYY-MM-DD" strings, never converted to a zone.
 */
import type { Exam, Schedule, StudySession, StudySessionStatus } from "./api/schedules"

export interface AgendaWindow {
    /** São Paulo calendar date, from localToday(). */
    today: string
    /** Last date of "Próximos dias", inclusive. */
    horizonEnd: string
}

export interface AgendaSession {
    kind: "session"
    session: StudySession
    date: string
    subjectName: string | null
}

export interface AgendaExam {
    kind: "exam"
    id: string
    date: string
    subjectName: string
}

export type AgendaItem = AgendaSession | AgendaExam

export interface AgendaDay {
    date: string
    items: AgendaItem[]
}

export interface Agenda {
    overdue: AgendaSession[]
    today: AgendaItem[]
    upcoming: AgendaDay[]
    later: AgendaExam[]
    todayProgress: { done: number; total: number }
    /** Active plans left out because their exam changed after generation (D7). */
    staleCount: number
}

const LATER_EXAMS_LIMIT = 5

/** The calendar-date part of a date-only value (same rule as dateOnlyString in lib/time.ts). */
function dateKey(value: string): string {
    return value.slice(0, 10)
}

/** Exams first on their day, then sessions by planned start; sessions without one go last. */
function byStart(a: AgendaItem, b: AgendaItem): number {
    if (a.kind !== b.kind) return a.kind === "exam" ? -1 : 1
    if (a.kind === "exam" || b.kind === "exam") return 0
    const sa = a.session.plannedStartTime ?? "99:99"
    const sb = b.session.plannedStartTime ?? "99:99"
    return sa.localeCompare(sb)
}

export function buildAgenda(schedules: Schedule[], exams: Exam[], window: AgendaWindow): Agenda {
    const { today, horizonEnd } = window
    const overdue: AgendaSession[] = []
    const todayItems: AgendaItem[] = []
    const byDay = new Map<string, AgendaItem[]>()
    const later: AgendaExam[] = []
    let staleCount = 0

    const addToDay = (date: string, item: AgendaItem) => {
        const list = byDay.get(date)
        if (list) list.push(item)
        else byDay.set(date, [item])
    }

    for (const schedule of schedules) {
        if (schedule.status !== "active") continue
        if (schedule.staleAt) {
            staleCount++
            continue
        }
        const subjectName = schedule.exam?.subject?.name ?? schedule.exam?.subject_name ?? null
        for (const day of schedule.days ?? []) {
            const date = dateKey(day.studyDate)
            for (const session of day.studySessions ?? []) {
                const item: AgendaSession = { kind: "session", session, date, subjectName }
                if (date === today) todayItems.push(item)
                else if (session.status !== "pending") continue
                else if (date < today) overdue.push(item)
                else if (date <= horizonEnd) addToDay(date, item)
            }
        }
    }

    for (const exam of exams) {
        const raw = exam.exam_date ?? exam.examDate
        if (!raw) continue
        const date = dateKey(raw)
        if (date < today) continue
        const item: AgendaExam = {
            kind: "exam",
            id: exam.id,
            date,
            subjectName: exam.subject_name ?? exam.subject?.name ?? "Prova",
        }
        if (date === today) todayItems.push(item)
        else if (date <= horizonEnd) addToDay(date, item)
        else later.push(item)
    }

    const todaySessions = todayItems.filter((i): i is AgendaSession => i.kind === "session")

    return {
        overdue: overdue.sort((a, b) => a.date.localeCompare(b.date) || byStart(a, b)),
        today: todayItems.sort(byStart),
        upcoming: [...byDay.entries()]
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([date, items]) => ({ date, items: items.sort(byStart) })),
        later: later.sort((a, b) => a.date.localeCompare(b.date)).slice(0, LATER_EXAMS_LIMIT),
        todayProgress: {
            done: todaySessions.filter((i) => i.session.status === "completed").length,
            total: todaySessions.length,
        },
        staleCount,
    }
}

/** A copy of `schedules` with one session's status replaced — for optimistic updates and rollback. */
export function applySessionStatus(
    schedules: Schedule[],
    sessionId: string,
    status: StudySessionStatus,
): Schedule[] {
    return schedules.map((schedule) => ({
        ...schedule,
        days: (schedule.days ?? []).map((day) => ({
            ...day,
            studySessions: (day.studySessions ?? []).map((session) =>
                session.id === sessionId ? { ...session, status } : session,
            ),
        })),
    }))
}
