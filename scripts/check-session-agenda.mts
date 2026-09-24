// Ad-hoc check for lib/session-agenda.ts and daysBetween (the frontend has no test runner):
//   node --experimental-strip-types scripts/check-session-agenda.mts
import assert from "node:assert/strict"
import type { Exam, Schedule, StudySession } from "../lib/api/schedules.ts"
import {
    agendaReducer,
    agendaView,
    applySessionStatus,
    buildAgenda,
    initialAgendaState,
    sessionActions,
} from "../lib/session-agenda.ts"
import { daysBetween, localToday } from "../lib/time.ts"

const TODAY = "2026-09-24"
const WINDOW = { today: TODAY, horizonEnd: "2026-10-01" }

let seq = 0
function session(over: Partial<StudySession> = {}): StudySession {
    seq++
    return {
        id: `s${seq}`,
        scheduleDayId: "d",
        topicId: "t",
        topic: { id: "t", name: `Tópico ${seq}`, weight: "essential" },
        sessionType: "new_content",
        durationMinutes: 50,
        status: "pending",
        plannedStartTime: null,
        ...over,
    }
}
function schedule(days: Record<string, StudySession[]>, over: Partial<Schedule> = {}): Schedule {
    return {
        id: `sch${++seq}`,
        userId: "u",
        startDate: TODAY,
        endDate: TODAY,
        totalDays: 1,
        status: "active",
        staleAt: null,
        exam: { id: "e", subject: { id: "sub", name: "Cálculo", priorityWeight: 1 } },
        topicAllocations: [],
        days: Object.entries(days).map(([studyDate, studySessions], i) => ({
            id: `day${i}`,
            scheduleId: "sch",
            studyDate,
            dayNumber: i + 1,
            availableMinutes: 360,
            isAvailable: true,
            studySessions,
        })),
        ...over,
    }
}
const exam = (id: string, exam_date: string, subject_name = "Física"): Exam => ({ id, exam_date, subject_name })

// time: daysBetween and the São Paulo "today" across UTC midnight
assert.equal(daysBetween("2026-09-24", "2026-09-24"), 0)
assert.equal(daysBetween("2026-09-24", "2026-10-02"), 8, "across a month boundary")
assert.equal(daysBetween("2026-09-24", "2026-09-20"), -4)
assert.equal(localToday(new Date("2026-09-25T02:30:00.000Z")), "2026-09-24", "23:30 in São Paulo is still the 24th")

// empty input
{
    const a = buildAgenda([], [], WINDOW)
    assert.deepEqual(a, { overdue: [], today: [], upcoming: [], later: [], todayProgress: { done: 0, total: 0 }, staleCount: 0 })
}

// today: ordered by planned start, unknown start last; all statuses shown; progress counts completed of all
{
    const late = session({ plannedStartTime: "19:00" })
    const unknown = session({ plannedStartTime: null })
    const early = session({ plannedStartTime: "08:00", status: "completed" })
    const skipped = session({ plannedStartTime: "10:00", status: "skipped" })
    const a = buildAgenda([schedule({ [TODAY]: [late, unknown, early, skipped] })], [], WINDOW)
    assert.deepEqual(a.today.map((i) => i.kind === "session" && i.session.id), [early.id, skipped.id, late.id, unknown.id])
    assert.deepEqual(a.todayProgress, { done: 1, total: 4 })
    assert.equal(a.today[0].kind === "session" && a.today[0].subjectName, "Cálculo")
}

// studyDate as a full ISO string keeps its calendar date
{
    const s = session()
    const a = buildAgenda([schedule({ "2026-09-24T00:00:00.000Z": [s] })], [], WINDOW)
    assert.equal(a.today.length, 1)
    assert.equal(a.today[0].kind === "session" && a.today[0].date, TODAY)
}

// overdue: pending only, oldest first
{
    const older = session()
    const newer = session()
    const done = session({ status: "completed" })
    const a = buildAgenda([schedule({ "2026-09-23": [newer, done], "2026-09-21": [older] })], [], WINDOW)
    assert.deepEqual(a.overdue.map((i) => i.session.id), [older.id, newer.id])
}

// upcoming: pending within the window, grouped by day in order; outside the window or finished are dropped
{
    const d2 = session()
    const d1 = session()
    const doneEarly = session({ status: "completed" })
    const tooFar = session()
    const a = buildAgenda(
        [schedule({ "2026-09-27": [d2], "2026-09-25": [d1, doneEarly], "2026-10-02": [tooFar] })],
        [],
        WINDOW,
    )
    assert.deepEqual(a.upcoming.map((d) => d.date), ["2026-09-25", "2026-09-27"])
    assert.deepEqual(a.upcoming[0].items.map((i) => i.kind === "session" && i.session.id), [d1.id])
}

// only active, non-stale schedules; stale ones are counted
{
    const a = buildAgenda(
        [
            schedule({ [TODAY]: [session()] }, { status: "cancelled" }),
            schedule({ [TODAY]: [session()] }, { status: "completed" }),
            schedule({ [TODAY]: [session()] }, { staleAt: "2026-09-20T12:00:00.000Z" }),
        ],
        [],
        WINDOW,
    )
    assert.equal(a.today.length, 0)
    assert.equal(a.staleCount, 1)
}

// exams: past dropped, today first in Hoje, window interleaved before sessions, then at most 5 later ones
{
    const s = session({ plannedStartTime: "07:00" })
    const exams = [
        exam("past", "2026-09-20"),
        exam("today", TODAY),
        exam("in-window", "2026-09-26T00:00:00.000Z"),
        ...["2026-10-05", "2026-10-03", "2026-10-09", "2026-10-07", "2026-10-11", "2026-10-13"].map((d) => exam(d, d)),
    ]
    const a = buildAgenda([schedule({ [TODAY]: [s], "2026-09-26": [session()] })], exams, WINDOW)
    assert.equal(a.today[0].kind, "exam", "exam first on its day")
    assert.equal(a.today[1].kind, "session")
    const sep26 = a.upcoming.find((d) => d.date === "2026-09-26")!
    assert.deepEqual(sep26.items.map((i) => i.kind), ["exam", "session"])
    assert.deepEqual(a.later.map((e) => e.date), ["2026-10-03", "2026-10-05", "2026-10-07", "2026-10-09", "2026-10-11"])
    assert.equal(a.later[0].subjectName, "Física")
}

// applySessionStatus: changes only the target and never mutates its input
{
    const target = session()
    const other = session()
    const input = [schedule({ [TODAY]: [target, other] })]
    const snapshot = structuredClone(input)
    const out = applySessionStatus(input, target.id, "completed")
    assert.deepEqual(input, snapshot, "input untouched")
    const sessions = out[0].days[0].studySessions
    assert.equal(sessions[0].status, "completed")
    assert.equal(sessions[1].status, "pending")
}

// sessionActions: buttons only for a pending session, and never while impersonating (writes are blocked)
{
    assert.deepEqual(sessionActions(session(), false), ["skipped", "completed"])
    assert.deepEqual(sessionActions(session({ status: "completed" }), false), [])
    assert.deepEqual(sessionActions(session(), true), [], "read-only while an admin impersonates")
}

// agendaReducer: a failed status change rolls the one session back, keeps its error through the recovery reload
{
    const s = session()
    const loadedState = agendaReducer(initialAgendaState, { type: "loaded", schedules: [schedule({ [TODAY]: [s] })], exams: [] })
    const optimistic = agendaReducer(loadedState, { type: "statusStart", sessionId: s.id, status: "completed" })
    assert.equal(optimistic.busy, true)
    assert.equal(optimistic.schedules[0].days[0].studySessions[0].status, "completed")

    const failed = agendaReducer(optimistic, { type: "statusFailed", sessionId: s.id, message: "Sessão já finalizada" })
    assert.equal(failed.error, "Sessão já finalizada")
    assert.equal(failed.busy, false)
    assert.equal(failed.loading, true, "a recovery reload starts")
    assert.equal(failed.schedules[0].days[0].studySessions[0].status, "pending", "rolled back")

    const recovered = agendaReducer(failed, { type: "loaded", schedules: loadedState.schedules, exams: [] })
    assert.equal(recovered.error, "Sessão já finalizada", "the recovery reload must not swallow the error")
    assert.equal(recovered.loading, false)

    const manual = agendaReducer(recovered, { type: "reload" })
    assert.equal(manual.error, null, "only a user-initiated reload clears it")
}

// agendaView: a failed first load is an error, never "nothing ahead"
{
    const empty = buildAgenda([], [], WINDOW)
    assert.equal(agendaView(initialAgendaState, empty), "loading")
    const failedFirst = agendaReducer(initialAgendaState, { type: "loadFailed", message: "API fora do ar" })
    assert.equal(agendaView(failedFirst, empty), "failed")
    const loadedEmpty = agendaReducer(initialAgendaState, { type: "loaded", schedules: [], exams: [] })
    assert.equal(agendaView(loadedEmpty, empty), "empty")
    const failedLater = agendaReducer(loadedEmpty, { type: "loadFailed", message: "x" })
    assert.equal(agendaView(failedLater, empty), "empty", "after one good load, keep showing what we have")
    const withData = buildAgenda([schedule({ [TODAY]: [session()] })], [], WINDOW)
    assert.equal(agendaView(loadedEmpty, withData), "agenda")
}

console.log("session-agenda: all checks passed")
