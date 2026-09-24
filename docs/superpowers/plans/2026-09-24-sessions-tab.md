# Sessões Tab Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A dedicated `/sessions` sidebar tab ("Sessões") that shows, in one chronological agenda, the study sessions and exams the student has to deal with now — without going through Calendário Automático or Provas.

**Architecture:** Frontend-only. A client page fetches the two lists the BFF already serves (`GET /api/schedules`, `GET /api/exams`), a pure function `buildAgenda()` turns them into groups (Atrasadas / Hoje / Próximos 7 dias / Mais adiante), and rows offer Concluir / Pular through the existing `PATCH /api/schedules/sessions/[sessionId]`. No backend change, no new route handler.

**Tech Stack:** Next.js 16 App Router, React 19, Tailwind 4, shadcn/ui (`components/ui/*`), lucide-react. The frontend has no test runner: pure logic is checked with a `node --experimental-strip-types` script, the same way `scripts/check-dashboard-layout.mts` does it.

**Spec:** The design approved in chat on 2026-09-24, restated in "Design" below.

## Design (from the chat, with three refinements found while planning)

- New route `app/(dashboard)/sessions/page.tsx`, sidebar item **Sessões** directly after Dashboard.
- One agenda, top to bottom:
  1. **Atrasadas** — pending sessions on days before today (hidden when empty).
  2. **Hoje** — today's exams first, then all of today's sessions (pending, completed, skipped) ordered by `plannedStartTime`, unknown times last. Header shows "N de M concluídas".
  3. **Próximos 7 dias** — pending sessions and exams from tomorrow to today+7, grouped by day.
  4. **Mais adiante** — the next 5 exams after that window, with a days-left countdown. *(Refinement: exams usually sit beyond 7 days, so without this group the page would rarely show one.)*
- Session row: time, topic, subject, type badge, duration, **Concluir** / **Pular** (only while `pending`). Exam row: subject, date, "em N dias", links to `/exams`.
- Only `active` schedules count. Stale schedules (`staleAt` set) are left out and counted in a notice pointing to Calendário Automático. *(Refinement: said out loud so the student isn't left wondering where sessions went.)*
- Status changes are optimistic; on error the row rolls back and the error shows in an alert.
- Impersonation (`?userId=`) is passed to every fetch, as `exam-list.tsx` does.
- *(Refinement: the chat design mentioned an e2e spec. `fetin/tests` is HTTP-only with no browser, and the list and PATCH endpoints this page uses are already covered by `95-bff.test.mjs` "schedules: generate, list, read, toggle a day, update a session, cancel". The page is verified in a real browser instead, in Task 4.)*

Out of scope: editing exams, generating/regenerating plans, a calendar grid, backend changes.

## Global Constraints

- Work on branch `feat/sessions-tab` in `fetin-frontend`, created from `main`. **Commit locally only. Never push to `main`; do not push at all unless the user asks.**
- Only `lib/time.ts` may map a `Date` to a calendar day or hour (America/Sao_Paulo). Never use `new Date().toISOString().slice(0,10)` or `getDate()` for "today".
- Date-only values (`studyDate`, `exam_date`) are calendar dates: compare their `YYYY-MM-DD` part as strings, never convert them to a zone.
- UI copy is Portuguese (pt-BR), matching the existing pages.
- `components/dashboard/sparkline-kpis.tsx` may carry uncommitted user work: never `git add -A` / `git add .`; stage files by name.
- Commit messages end with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- Read `node_modules/next/dist/docs/` for anything App Router–specific before relying on memory (per `fetin-frontend/AGENTS.md`).

## Review Focus

1. **Session around midnight in São Paulo while the browser is in UTC** — "Hoje" must be the São Paulo day. Pinned by the `localToday` boundary assertion in Task 1.
2. **`studyDate` arriving as `"2026-09-24T00:00:00.000Z"`** — must land on the 24th, not shift a day. Pinned by the ISO-date fixture in Task 1.
3. **Clicking Concluir twice / on an already finalised session** — backend answers 400 "Sessão já finalizada". Buttons disable while a request is in flight, and a failure rolls back and reloads. Pinned by `applySessionStatus` immutability test (Task 1) and the manual double-click check (Task 4).
4. **Student with no active plan and no exams** — page must show an empty state with links to Provas and Calendário Automático, not a blank card. Pinned by the empty-agenda test (Task 1) and the manual check (Task 4).
5. **Plan made stale by an exam date change** — sessions disappear; the notice must say why. Pinned by the stale-schedule test (Task 1).

---

## File Structure

| File | Responsibility |
|---|---|
| `lib/time.ts` (modify) | add `daysBetween(from, to)` for the exam countdown |
| `lib/session-agenda.ts` (create) | pure: `buildAgenda()` and `applySessionStatus()`; type-only imports so it runs under plain node |
| `scripts/check-session-agenda.mts` (create) | assertions for the two files above |
| `components/sessions/agenda-rows.tsx` (create) | presentational `SessionRow`, `ExamRow` |
| `components/sessions/session-agenda.tsx` (create) | client container: fetch, group, optimistic actions, states |
| `app/(dashboard)/sessions/page.tsx` (create) | page header + `<SessionAgenda />` |
| `components/layout/nav-link.tsx` (modify) | `sessions` icon |
| `app/(dashboard)/layout.tsx` (modify) | sidebar item |

---

### Task 1: Agenda logic (`buildAgenda`, `applySessionStatus`, `daysBetween`)

**Files:**
- Modify: `lib/time.ts` (append after `addDays`)
- Create: `lib/session-agenda.ts`
- Test: `scripts/check-session-agenda.mts`

**Interfaces:**
- Consumes: types `Schedule`, `Exam`, `StudySession`, `StudySessionStatus` from `lib/api/schedules.ts` (type-only).
- Produces:
  - `daysBetween(from: string, to: string): number` in `lib/time.ts`
  - `buildAgenda(schedules: Schedule[], exams: Exam[], window: AgendaWindow): Agenda`
  - `applySessionStatus(schedules: Schedule[], sessionId: string, status: StudySessionStatus): Schedule[]`
  - types `AgendaWindow { today: string; horizonEnd: string }`, `AgendaSession`, `AgendaExam`, `AgendaItem`, `AgendaDay`, `Agenda`

- [ ] **Step 1: Create the branch**

```bash
cd fetin-frontend
git checkout main && git checkout -b feat/sessions-tab
```

- [ ] **Step 2: Write the failing check script** — `scripts/check-session-agenda.mts`

```ts
// Ad-hoc check for lib/session-agenda.ts and daysBetween (the frontend has no test runner):
//   node --experimental-strip-types scripts/check-session-agenda.mts
import assert from "node:assert/strict"
import type { Exam, Schedule, StudySession } from "../lib/api/schedules.ts"
import { applySessionStatus, buildAgenda } from "../lib/session-agenda.ts"
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

console.log("session-agenda: all checks passed")
```

- [ ] **Step 3: Run it to confirm it fails**

Run: `node --experimental-strip-types scripts/check-session-agenda.mts`
Expected: FAIL with `ERR_MODULE_NOT_FOUND` for `lib/session-agenda.ts` (and `daysBetween` missing).

- [ ] **Step 4: Add `daysBetween` to `lib/time.ts`** (right after `addDays`)

```ts
/** Whole calendar days from `from` to `to` (date-only values); negative when `to` is earlier. */
export function daysBetween(from: string, to: string): number {
    const start = Date.parse(`${dateOnlyString(from)}T00:00:00.000Z`)
    const end = Date.parse(`${dateOnlyString(to)}T00:00:00.000Z`)
    return Math.round((end - start) / MS_PER_DAY)
}
```

- [ ] **Step 5: Create `lib/session-agenda.ts`**

```ts
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
```

Note: `Schedule.exam` is typed as `Exam`, which declares both `subject?` and `subject_name?`, so both lookups type-check. `GET /schedules` fills `exam.subject`; `GET /exams` fills `subject_name`.

- [ ] **Step 6: Run the checks**

Run: `node --experimental-strip-types scripts/check-session-agenda.mts`
Expected: `session-agenda: all checks passed`

Also run: `npx tsc --noEmit -p .`
Expected: no new errors in `lib/session-agenda.ts`, `lib/time.ts` or the script. (If `tsc` complains that the script's `.ts` import extensions need `allowImportingTsExtensions`, check how `scripts/check-dashboard-layout.mts` is treated — it has the same imports — and match it; do not change `tsconfig.json`.)

- [ ] **Step 7: Commit**

```bash
git add lib/time.ts lib/session-agenda.ts scripts/check-session-agenda.mts
git commit -m "feat(sessions): agenda grouping for the Sessões tab

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Agenda rows (presentational)

**Files:**
- Create: `components/sessions/agenda-rows.tsx`

**Interfaces:**
- Consumes: `AgendaSession`, `AgendaExam` (Task 1); `daysBetween` (Task 1); `formatDateShort`, `formatMinutes`, `pluralize` from `lib/format.ts`.
- Produces:
  - `SessionRow({ item, busy, onStatus }: { item: AgendaSession; busy: boolean; onStatus: (id: string, status: "completed" | "skipped") => void; showDate?: boolean })`
  - `ExamRow({ item, today, userId }: { item: AgendaExam; today: string; userId: string | null })`

- [ ] **Step 1: Create `components/sessions/agenda-rows.tsx`**

```tsx
import Link from "next/link"
import { Check, GraduationCap, SkipForward } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import type { StudySessionType } from "@/lib/api/schedules"
import { formatDateShort, formatMinutes, pluralize } from "@/lib/format"
import type { AgendaExam, AgendaSession } from "@/lib/session-agenda"
import { daysBetween } from "@/lib/time"
import { cn } from "@/lib/utils"

const SESSION_TYPE_LABEL: Record<StudySessionType, string> = {
    new_content: "Conteúdo novo",
    spaced_review: "Revisão",
    pre_exam_review: "Pré-prova",
}

export function SessionRow({
    item,
    busy,
    onStatus,
    showDate = false,
}: {
    item: AgendaSession
    busy: boolean
    onStatus: (sessionId: string, status: "completed" | "skipped") => void
    showDate?: boolean
}) {
    const { session } = item
    const finished = session.status !== "pending"

    return (
        <li
            className={cn(
                "flex flex-col gap-2 rounded-lg border px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between",
                finished && "opacity-60",
            )}
        >
            <div className="flex min-w-0 items-start gap-3">
                <span className="w-12 shrink-0 pt-0.5 text-xs font-medium tabular-nums text-muted-foreground">
                    {showDate ? formatDateShort(item.date) : (session.plannedStartTime ?? "—")}
                </span>
                <div className="min-w-0">
                    <p className={cn("truncate text-sm font-medium", session.status === "completed" && "line-through")}>
                        {session.topic?.name ?? "Tópico"}
                    </p>
                    <p className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                        {item.subjectName && <span>{item.subjectName}</span>}
                        <Badge variant="outline">{SESSION_TYPE_LABEL[session.sessionType]}</Badge>
                        <span>{formatMinutes(session.durationMinutes)}</span>
                        {session.status === "skipped" && <span>· pulada</span>}
                    </p>
                </div>
            </div>

            {!finished && (
                <div className="flex shrink-0 gap-1.5 self-end sm:self-auto">
                    <Button size="sm" variant="ghost" disabled={busy} onClick={() => onStatus(session.id, "skipped")}>
                        <SkipForward /> Pular
                    </Button>
                    <Button size="sm" disabled={busy} onClick={() => onStatus(session.id, "completed")}>
                        <Check /> Concluir
                    </Button>
                </div>
            )}
        </li>
    )
}

export function ExamRow({ item, today, userId }: { item: AgendaExam; today: string; userId: string | null }) {
    const days = daysBetween(today, item.date)
    const countdown = days === 0 ? "hoje" : days === 1 ? "amanhã" : `em ${pluralize(days, "dia", "dias")}`
    const href = userId ? `/exams?userId=${userId}` : "/exams"

    return (
        <li>
            <Link
                href={href}
                className="flex items-center justify-between gap-3 rounded-lg border border-dashed px-3 py-2.5 transition-colors hover:bg-muted"
            >
                <span className="flex min-w-0 items-center gap-3">
                    <GraduationCap className="size-4 shrink-0 text-brand" />
                    <span className="truncate text-sm font-medium">Prova · {item.subjectName}</span>
                </span>
                <span className="shrink-0 text-xs text-muted-foreground">
                    {formatDateShort(item.date)} · {countdown}
                </span>
            </Link>
        </li>
    )
}
```

- [ ] **Step 2: Type-check and lint**

Run: `npx tsc --noEmit -p . && npx eslint components/sessions/agenda-rows.tsx`
Expected: no errors for this file.

- [ ] **Step 3: Commit**

```bash
git add components/sessions/agenda-rows.tsx
git commit -m "feat(sessions): session and exam rows

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Agenda container, page, and sidebar item

**Files:**
- Create: `components/sessions/session-agenda.tsx`
- Create: `app/(dashboard)/sessions/page.tsx`
- Modify: `components/layout/nav-link.tsx` (the `ICONS` map and its lucide import)
- Modify: `app/(dashboard)/layout.tsx` (nav list)

**Interfaces:**
- Consumes: `buildAgenda`, `applySessionStatus`, `AgendaItem` (Task 1); `SessionRow`, `ExamRow` (Task 2); `fetchUserSchedules`, `fetchExamsList`, `updateSessionStatus` from `lib/api/schedules.ts`; `localToday`, `addDays` from `lib/time.ts`.
- Produces: `SessionAgenda()` (no props); route `/sessions`; `NavIcon` value `"sessions"`.

- [ ] **Step 1: Create `components/sessions/session-agenda.tsx`**

```tsx
"use client"

import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { useCallback, useEffect, useMemo, useState } from "react"
import { AlertCircle, CalendarCheck2, RefreshCw } from "lucide-react"

import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button, buttonVariants } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { EmptyState } from "@/components/ui/empty-state"
import { Skeleton } from "@/components/ui/skeleton"
import {
    fetchExamsList,
    fetchUserSchedules,
    updateSessionStatus,
    type Exam,
    type Schedule,
} from "@/lib/api/schedules"
import { formatDateShort, pluralize } from "@/lib/format"
import { applySessionStatus, buildAgenda, type AgendaItem } from "@/lib/session-agenda"
import { addDays, localToday } from "@/lib/time"

import { ExamRow, SessionRow } from "./agenda-rows"

const HORIZON_DAYS = 7

export function SessionAgenda() {
    const userId = useSearchParams().get("userId")
    const [schedules, setSchedules] = useState<Schedule[]>([])
    const [exams, setExams] = useState<Exam[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [busyId, setBusyId] = useState<string | null>(null)

    const load = useCallback(async () => {
        setLoading(true)
        setError(null)
        try {
            const [s, e] = await Promise.all([fetchUserSchedules(userId), fetchExamsList(userId)])
            setSchedules(s)
            setExams(e)
        } catch (err) {
            setError(err instanceof Error ? err.message : "Falha ao carregar a agenda.")
        } finally {
            setLoading(false)
        }
    }, [userId])

    useEffect(() => {
        void load()
    }, [load])

    const today = localToday()
    const agenda = useMemo(
        () => buildAgenda(schedules, exams, { today, horizonEnd: addDays(today, HORIZON_DAYS) }),
        [schedules, exams, today],
    )

    async function handleStatus(sessionId: string, status: "completed" | "skipped") {
        const previous = schedules
        setBusyId(sessionId)
        setError(null)
        setSchedules(applySessionStatus(previous, sessionId, status))
        try {
            await updateSessionStatus(sessionId, status, userId)
        } catch (err) {
            setSchedules(previous)
            setError(err instanceof Error ? err.message : "Falha ao atualizar a sessão.")
            void load() // the server may already hold a different status (400 "já finalizada")
        } finally {
            setBusyId(null)
        }
    }

    const renderItem = (item: AgendaItem, showDate = false) =>
        item.kind === "exam" ? (
            <ExamRow key={`exam-${item.id}`} item={item} today={today} userId={userId} />
        ) : (
            <SessionRow
                key={item.session.id}
                item={item}
                showDate={showDate}
                busy={busyId !== null}
                onStatus={handleStatus}
            />
        )

    if (loading && schedules.length === 0 && exams.length === 0) {
        return (
            <div className="space-y-3">
                <Skeleton className="h-24 w-full" />
                <Skeleton className="h-40 w-full" />
            </div>
        )
    }

    const nothing =
        agenda.overdue.length === 0 &&
        agenda.today.length === 0 &&
        agenda.upcoming.length === 0 &&
        agenda.later.length === 0

    const withUser = (path: string) => (userId ? `${path}?userId=${userId}` : path)

    return (
        <div className="space-y-4">
            {error && (
                <Alert variant="destructive">
                    <AlertCircle />
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
            )}

            {agenda.staleCount > 0 && (
                <Alert>
                    <AlertCircle />
                    <AlertDescription>
                        {pluralize(agenda.staleCount, "plano está desatualizado", "planos estão desatualizados")} porque a
                        prova mudou. Gere de novo em{" "}
                        <Link className="underline" href={withUser("/auto-schedule")}>
                            Calendário Automático
                        </Link>
                        .
                    </AlertDescription>
                </Alert>
            )}

            <div className="flex justify-end">
                <Button size="sm" variant="ghost" onClick={() => void load()} disabled={loading}>
                    <RefreshCw className={loading ? "animate-spin" : undefined} /> Atualizar
                </Button>
            </div>

            {nothing ? (
                <Card>
                    <EmptyState
                        icon={<CalendarCheck2 />}
                        message="Nenhuma sessão ou prova pela frente. Cadastre uma prova e gere um plano de estudos."
                        action={
                            <div className="flex gap-2">
                                <Link className={buttonVariants({ size: "sm", variant: "outline" })} href={withUser("/exams")}>
                                    Provas
                                </Link>
                                <Link className={buttonVariants({ size: "sm" })} href={withUser("/auto-schedule")}>
                                    Calendário Automático
                                </Link>
                            </div>
                        }
                    />
                </Card>
            ) : (
                <>
                    {agenda.overdue.length > 0 && (
                        <Card>
                            <CardHeader className="p-4 pb-2">
                                <CardTitle className="text-sm font-bold text-destructive">Atrasadas</CardTitle>
                                <CardDescription className="text-xs">
                                    {pluralize(agenda.overdue.length, "sessão pendente", "sessões pendentes")} de dias anteriores
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="p-4 pt-0">
                                <ul className="space-y-2">{agenda.overdue.map((i) => renderItem(i, true))}</ul>
                            </CardContent>
                        </Card>
                    )}

                    <Card>
                        <CardHeader className="p-4 pb-2">
                            <CardTitle className="text-sm font-bold">Hoje · {formatDateShort(today)}</CardTitle>
                            <CardDescription className="text-xs">
                                {agenda.todayProgress.total > 0
                                    ? `${agenda.todayProgress.done} de ${agenda.todayProgress.total} concluídas`
                                    : "Nenhuma sessão planejada para hoje"}
                            </CardDescription>
                        </CardHeader>
                        {agenda.today.length > 0 && (
                            <CardContent className="p-4 pt-0">
                                <ul className="space-y-2">{agenda.today.map((i) => renderItem(i))}</ul>
                            </CardContent>
                        )}
                    </Card>

                    {agenda.upcoming.length > 0 && (
                        <Card>
                            <CardHeader className="p-4 pb-2">
                                <CardTitle className="text-sm font-bold">Próximos {HORIZON_DAYS} dias</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4 p-4 pt-0">
                                {agenda.upcoming.map((day) => (
                                    <section key={day.date} className="space-y-2">
                                        <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                            {formatDateShort(day.date)}
                                        </h3>
                                        <ul className="space-y-2">{day.items.map((i) => renderItem(i))}</ul>
                                    </section>
                                ))}
                            </CardContent>
                        </Card>
                    )}

                    {agenda.later.length > 0 && (
                        <Card>
                            <CardHeader className="p-4 pb-2">
                                <CardTitle className="text-sm font-bold">Próximas provas</CardTitle>
                            </CardHeader>
                            <CardContent className="p-4 pt-0">
                                <ul className="space-y-2">{agenda.later.map((i) => renderItem(i))}</ul>
                            </CardContent>
                        </Card>
                    )}
                </>
            )}
        </div>
    )
}
```

Links styled as buttons use `buttonVariants` on a plain `<Link>`: `Button` wraps `@base-ui/react/button`, which expects to render a native `<button>`.

- [ ] **Step 2: Create `app/(dashboard)/sessions/page.tsx`**

```tsx
import { Suspense } from "react"

import { Skeleton } from "@/components/ui/skeleton"
import { SessionAgenda } from "@/components/sessions/session-agenda"

export default function SessionsPage() {
    return (
        <section className="space-y-6">
            <div className="flex flex-col gap-1.5 border-b border-border/40 pb-4">
                <h1 className="page-title">Sessões</h1>
                <p className="text-xs text-muted-foreground">
                    O que estudar agora e quais provas vêm pela frente, num só lugar.
                </p>
            </div>
            {/* useSearchParams (impersonation) needs a Suspense boundary in a server page */}
            <Suspense fallback={<Skeleton className="h-40 w-full" />}>
                <SessionAgenda />
            </Suspense>
        </section>
    )
}
```

- [ ] **Step 3: Add the icon** in `components/layout/nav-link.tsx`

Add `ListChecks,` to the lucide-react import (alphabetical, between `LayoutDashboard` and `ShieldCheck`), and to `ICONS`:

```ts
    dashboard: LayoutDashboard,
    sessions: ListChecks,
    profile: User,
```

- [ ] **Step 4: Add the sidebar item** in `app/(dashboard)/layout.tsx`, right after Dashboard:

```tsx
                        <li><NavLink href="/dashboard" icon="dashboard">Dashboard</NavLink></li>
                        <li><NavLink href="/sessions" icon="sessions">Sessões</NavLink></li>
```

- [ ] **Step 5: Type-check, lint, build**

Run: `npx tsc --noEmit -p . && npm run lint && npm run build`
Expected: all succeed; the build output lists `/sessions`. Re-run `node --experimental-strip-types scripts/check-session-agenda.mts` — still passes.

- [ ] **Step 6: Commit**

```bash
git add components/sessions/session-agenda.tsx "app/(dashboard)/sessions/page.tsx" components/layout/nav-link.tsx "app/(dashboard)/layout.tsx"
git commit -m "feat(sessions): Sessões tab with today's agenda and upcoming exams

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Verify in the running app

**Files:** none (fix-ups, if any, go in the file they concern and get their own commit).

- [ ] **Step 1: Boot the stack** following memory `fetin-e2e-test-suite` / `fetin/tests/README.md`: postgres on 5433 (`-p fetin-backend` override), backend `npm run build && npm run start:prod` on 3100, frontend `npx next dev -p 3101`. Check `docker ps -a` first; don't kill processes you didn't start.

- [ ] **Step 2: Log in as `alice@fetin.com` / `User12345!`**, open `http://localhost:3101/sessions` and check:
  - "Sessões" appears after Dashboard in the sidebar and is highlighted.
  - Hoje shows today's sessions in time order, with "N de M concluídas".
  - Concluir: the row strikes through, the counter goes up, and after a reload it is still completed. Double-click Concluir quickly: no error (buttons disabled while in flight).
  - Pular: the row dims with "· pulada".
  - Exams show a countdown; clicking one opens `/exams`.
  - Dark mode (theme toggle) and a ~375px-wide window: no horizontal scroll, buttons wrap under the text.

- [ ] **Step 3: Empty and impersonation paths**
  - Register a fresh user: the empty state appears with the Provas and Calendário Automático buttons.
  - As `admin@fetin.com` / `Admin12345!`, open `/sessions?userId=<alice's id>`: the yellow banner shows and Alice's agenda loads.

- [ ] **Step 4: Regression**: run the e2e suite (`cd fetin/tests && npm test` with `API_BASE`/`BFF_BASE` set as in its README). Expected: same baseline as before this branch (206 pass / 0 fail, per memory; the known "impersonation must also cover notes" seed gap may fail on a fresh seed).

- [ ] **Step 5: Stop.** Branch `feat/sessions-tab` stays local. Report the commits; do not push.
