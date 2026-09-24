import type { RoutineBlock, RoutineCategory } from "./api/availability"
import type { ScheduleDay, StudySession } from "./api/schedules"

export type TimelineItem =
  | {
      kind: "routine"
      id: string
      title: string
      category: RoutineCategory
      startTime: string
      endTime: string
      startMins: number
    }
  | {
      kind: "session"
      id: string
      session: StudySession
      startTime: string
      endTime: string
      startMins: number
    }

interface Interval {
  start: number
  end: number
}

export function timeToMins(t: string): number {
  if (!t) return 0
  const parts = t.split(":")
  return Number(parts[0]) * 60 + Number(parts[1] || 0)
}

export function minsToTime(m: number): string {
  const h = Math.floor(m / 60)
  const min = m % 60
  return `${h.toString().padStart(2, "0")}:${min.toString().padStart(2, "0")}`
}

/** An END of 00:00 (or 24:00) means the end of the day. */
function endToMins(t: string): number {
  const mins = timeToMins(t)
  return mins === 0 ? 1440 : mins
}

/**
 * The part of each routine block that lands on `dayOfWeek`. A block whose end is not after its
 * start is overnight: it covers the rest of its own day and the start of the NEXT weekday, so
 * the previous weekday's overnight blocks also show up here (Saturday night spills onto Sunday).
 */
export function routineIntervalsForDay(
  dayOfWeek: number,
  blocks: RoutineBlock[]
): { block: RoutineBlock; start: number; end: number }[] {
  const previous = (dayOfWeek + 6) % 7
  const out: { block: RoutineBlock; start: number; end: number }[] = []

  for (const b of blocks) {
    const start = timeToMins(b.startTime)
    const end = endToMins(b.endTime)
    const overnight = end <= start

    if (b.dayOfWeek === dayOfWeek) {
      out.push({ block: b, start, end: overnight ? 1440 : end })
    }
    if (overnight && b.dayOfWeek === previous && end > 0) {
      out.push({ block: b, start: 0, end })
    }
  }
  return out
}

function complement(occupied: Interval[]): Interval[] {
  const sorted = [...occupied].sort((a, b) => a.start - b.start)
  const gaps: Interval[] = []
  let pointer = 0
  for (const o of sorted) {
    if (o.start > pointer) gaps.push({ start: pointer, end: o.start })
    pointer = Math.max(pointer, o.end)
  }
  if (pointer < 1440) gaps.push({ start: pointer, end: 1440 })
  return gaps
}

/**
 * The day's routine plus its study sessions, in time order.
 *
 * Sessions show the start the backend stored (`plannedStartTime`), so what is displayed is what
 * was planned. Only legacy sessions without a stored start (created before it existed) are
 * still packed into the free gaps here, after the routine and after the timed sessions.
 */
export function buildUnifiedTimeline(
  day: Pick<ScheduleDay, "studyDate" | "studySessions">,
  routineBlocks: RoutineBlock[]
): TimelineItem[] {
  const dateObj = new Date(`${day.studyDate.split("T")[0]}T00:00:00.000Z`)
  const dayOfWeek = dateObj.getUTCDay()

  const routine = routineIntervalsForDay(dayOfWeek, routineBlocks)

  const items: TimelineItem[] = routine.map(({ block, start, end }) => ({
    kind: "routine",
    id: `${block.id ?? `${block.title}-${block.dayOfWeek}-${block.startTime}`}-${start}`,
    title: block.title,
    category: block.category,
    startTime: minsToTime(start),
    endTime: minsToTime(end),
    startMins: start,
  }))

  const sessions = day.studySessions ?? []
  const timed = sessions.filter((s) => s.plannedStartTime)
  const legacy = sessions.filter((s) => !s.plannedStartTime)

  for (const session of timed) {
    const start = timeToMins(session.plannedStartTime as string)
    items.push({
      kind: "session",
      id: session.id,
      session,
      startTime: minsToTime(start),
      endTime: minsToTime(start + session.durationMinutes),
      startMins: start,
    })
  }

  if (legacy.length > 0) {
    const occupied: Interval[] = [
      ...routine.map(({ start, end }) => ({ start, end })),
      ...timed.map((s) => ({
        start: timeToMins(s.plannedStartTime as string),
        end: timeToMins(s.plannedStartTime as string) + s.durationMinutes,
      })),
    ]
    const gaps = complement(occupied)

    let gapIndex = 0
    let pointer = gaps[0] ? gaps[0].start : 480

    for (const session of legacy) {
      while (gapIndex < gaps.length && pointer + session.durationMinutes > gaps[gapIndex].end) {
        gapIndex++
        if (gaps[gapIndex]) pointer = gaps[gapIndex].start
      }

      const start = pointer
      const end = pointer + session.durationMinutes
      items.push({
        kind: "session",
        id: session.id,
        session,
        startTime: minsToTime(start),
        // Never past midnight: clamp so a crowded legacy day cannot render "25:10".
        endTime: minsToTime(Math.min(1440, end)),
        startMins: start,
      })
      pointer = end
    }
  }

  return items.sort((a, b) => a.startMins - b.startMins)
}
