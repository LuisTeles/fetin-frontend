"use client"

import { CountUp } from "@/components/ui/count-up"
import { addDays, localToday, weekdayOfDateString } from "@/lib/time"
import { TrendingUp, TrendingDown, Clock, CheckCircle2, Target, Flame } from "lucide-react"
import { Card, CardContent, CardHeader, CardDescription } from "@/components/ui/card"
import type { SparklineKpis } from "@/lib/api/dashboard"

/**
 * Four KPI cards over the last 7 days (index 0 = 6 days ago, index 6 = today — the backend's
 * bucket order). Each card pairs the headline number with a plain-language verdict and a
 * day-by-day mini chart that carries real anchors: weekday letters, today highlighted,
 * values on hover. Marks are all brand-coloured; the status colour lives only in the badge,
 * where it always ships with a text label.
 */

type Health = "good" | "warn" | "bad"

const WEEKDAYS = ["D", "S", "T", "Q", "Q", "S", "S"]
const WEEKDAYS_LONG = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"]

/** Weekday for each of the 7 buckets, ending today. São Paulo calendar days, like the backend's buckets (D1). */
function lastSevenDays() {
    const today = localToday()
    return Array.from({ length: 7 }, (_, i) => {
        const d = weekdayOfDateString(addDays(today, i - 6))
        return { short: WEEKDAYS[d], long: WEEKDAYS_LONG[d], isToday: i === 6 }
    })
}

const healthBadge: Record<Health, { label: string; className: string }> = {
    good: { label: "Saudável", className: "bg-success/10 text-success" },
    warn: { label: "Atenção", className: "bg-warning/10 text-warning" },
    bad: { label: "Crítico", className: "bg-danger/10 text-danger" },
}

// ─── Mini charts ──────────────────────────────────────────────────────────────

interface DayDatum {
    day: ReturnType<typeof lastSevenDays>[number]
    value: number
    /** Tooltip text, e.g. "segunda: 1,5h" */
    tip: string
}

/** Tooltip shown on hover and keyboard focus of a day column. */
function Tip({ children }: { children: React.ReactNode }) {
    return (
        <span
            role="tooltip"
            className="pointer-events-none absolute -top-7 left-1/2 z-10 -translate-x-1/2 whitespace-nowrap rounded-md bg-foreground px-2 py-1 text-[11px] font-medium text-background opacity-0 shadow-sm transition-opacity group-hover/day:opacity-100 group-focus-visible/day:opacity-100"
        >
            {children}
        </span>
    )
}

function DayLabel({ day }: { day: DayDatum["day"] }) {
    return (
        <span
            className={`text-[10px] leading-none ${day.isToday ? "font-bold text-foreground" : "text-muted-foreground"}`}
        >
            {day.short}
        </span>
    )
}

/** Bars with optional value labels and a dashed average line. */
function BarsChart({
    data,
    showValues,
    average,
}: {
    data: DayDatum[]
    showValues?: boolean
    average?: number
}) {
    const max = Math.max(...data.map((d) => d.value), 1)
    return (
        <div>
            <div className="relative flex h-14 items-end gap-1.5">
                {average !== undefined && average > 0 && (
                    <div
                        aria-hidden="true"
                        className="pointer-events-none absolute inset-x-0 border-t border-dashed border-muted-foreground/50"
                        style={{ bottom: `${(average / max) * 100}%` }}
                    />
                )}
                {data.map((d, i) => (
                    <div
                        key={i}
                        tabIndex={0}
                        aria-label={d.tip}
                        className="group/day relative flex h-full flex-1 flex-col items-center justify-end outline-none"
                    >
                        {showValues && d.value > 0 && (
                            <span className="mb-0.5 text-[10px] font-medium leading-none tabular-nums text-muted-foreground">
                                {d.value}
                            </span>
                        )}
                        <div
                            className={`w-full rounded-t-[4px] ${d.day.isToday ? "bg-brand" : "bg-brand/35"} ${d.value === 0 ? "bg-muted" : ""}`}
                            style={{ height: d.value === 0 ? 2 : `${Math.max((d.value / max) * 100, 8)}%` }}
                        />
                        <Tip>{d.tip}</Tip>
                    </div>
                ))}
            </div>
            <div className="mt-1.5 flex gap-1.5">
                {data.map((d, i) => (
                    <div key={i} className="flex flex-1 justify-center">
                        <DayLabel day={d.day} />
                    </div>
                ))}
            </div>
        </div>
    )
}

/** One dot per day — filled when active. Consecutive `runFrom..6` dots are joined by a bar. */
function DotsChart({ data, runLength }: { data: DayDatum[]; runLength?: number }) {
    const runStart = runLength ? 7 - runLength : 7
    return (
        <div>
            <div className="relative flex h-14 items-center gap-1.5">
                {data.map((d, i) => {
                    const active = d.value > 0
                    const inRun = i >= runStart
                    return (
                        <div
                            key={i}
                            tabIndex={0}
                            aria-label={d.tip}
                            className="group/day relative flex h-full flex-1 items-center justify-center outline-none"
                        >
                            {inRun && (
                                <span
                                    aria-hidden="true"
                                    className={`absolute top-1/2 h-1 -translate-y-1/2 bg-brand/35 ${i === runStart ? "left-1/2 right-0" : i === 6 ? "left-0 right-1/2" : "inset-x-0"}`}
                                />
                            )}
                            <span
                                className={`relative h-3.5 w-3.5 rounded-full border-2 ${
                                    active
                                        ? "border-brand bg-brand"
                                        : "border-muted-foreground/40 bg-card"
                                } ${d.day.isToday ? "ring-2 ring-brand/30 ring-offset-1 ring-offset-card" : ""}`}
                            />
                            <Tip>{d.tip}</Tip>
                        </div>
                    )
                })}
            </div>
            <div className="mt-1.5 flex gap-1.5">
                {data.map((d, i) => (
                    <div key={i} className="flex flex-1 justify-center">
                        <DayLabel day={d.day} />
                    </div>
                ))}
            </div>
        </div>
    )
}

// ─── KPI card ─────────────────────────────────────────────────────────────────

interface KpiCardProps {
    label: string
    value: string
    /** One-sentence verdict under the number. */
    verdict: string
    health: Health
    icon: React.ReactNode
    delta?: number | null
    deltaHint?: string
    children: React.ReactNode
}

function KpiCard({ label, value, verdict, health, icon, delta, deltaHint, children }: KpiCardProps) {
    const badge = healthBadge[health]
    const hasDelta = delta !== null && delta !== undefined
    const TrendIcon = hasDelta && delta >= 0 ? TrendingUp : TrendingDown

    return (
        <Card className="overflow-visible">
            <CardHeader className="p-4 pb-0">
                <div className="flex items-center justify-between gap-2">
                    <CardDescription className="kpi-label">{label}</CardDescription>
                    <div className="rounded-md bg-muted p-1 text-muted-foreground">{icon}</div>
                </div>
            </CardHeader>
            <CardContent className="space-y-3 p-4 pt-2">
                <div>
                    <div className="flex items-baseline justify-between gap-2">
                        <CountUp className="num text-2xl font-semibold tracking-tight" value={value} />
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${badge.className}`}>
                            {badge.label}
                        </span>
                    </div>
                    <p className="mt-1 text-pretty text-xs text-muted-foreground">
                        {verdict}
                        {hasDelta && (
                            <span
                                className="ml-1.5 inline-flex items-center gap-0.5 font-medium text-foreground"
                                title={deltaHint}
                            >
                                <TrendIcon className="h-3 w-3" aria-hidden="true" />
                                {delta >= 0 ? "+" : "−"}
                                {Math.abs(delta)}% {deltaHint}
                            </span>
                        )}
                    </p>
                </div>
                {children}
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Últimos 7 dias</p>
            </CardContent>
        </Card>
    )
}

// ─── Exported component ───────────────────────────────────────────────────────

const HOURS_GOAL = 10

const fmtHours = (h: number) => `${String(h).replace(".", ",")}h`

export function SparklineKpiCards({ data }: { data: SparklineKpis }) {
    const days = lastSevenDays()

    const activeDays = data.completionRateTrend.filter((v) => v > 0).length
    const ratePercent = Math.round(data.sessionCompletionRate * 100)
    const rateHealth: Health = ratePercent >= 70 ? "good" : ratePercent >= 40 ? "warn" : "bad"

    const streak = data.currentStreak
    const streakHealth: Health = streak >= 5 ? "good" : streak >= 2 ? "warn" : "bad"
    const bestStreak = Math.max(...data.streakTrend, 0)

    const hoursHealth: Health =
        data.totalHoursThisWeek >= HOURS_GOAL ? "good" : data.totalHoursThisWeek >= 5 ? "warn" : "bad"

    const sessions = data.sessionsCompletedThisWeek

    // Last 3 days vs first 3 days (the middle day is left out so the windows don't overlap).
    const last3 = data.totalHoursTrend.slice(4).reduce((a, b) => a + b, 0)
    const first3 = data.totalHoursTrend.slice(0, 3).reduce((a, b) => a + b, 0)
    const hoursDelta = first3 > 0 ? Math.round(((last3 - first3) / first3) * 100) : null

    const hoursData: DayDatum[] = days.map((day, i) => ({
        day,
        value: data.totalHoursTrend[i],
        tip: `${day.long}: ${fmtHours(data.totalHoursTrend[i])}`,
    }))
    const sessionData: DayDatum[] = days.map((day, i) => ({
        day,
        value: data.sessionsCompletedTrend[i],
        tip: `${day.long}: ${data.sessionsCompletedTrend[i]} ${data.sessionsCompletedTrend[i] === 1 ? "sessão" : "sessões"}`,
    }))
    const activityData: DayDatum[] = days.map((day, i) => ({
        day,
        value: data.completionRateTrend[i],
        tip: `${day.long}: ${data.completionRateTrend[i] > 0 ? "estudou" : "sem sessão"}`,
    }))
    const streakData: DayDatum[] = days.map((day, i) => ({
        day,
        value: data.completionRateTrend[i],
        tip: `${day.long}: ${data.completionRateTrend[i] > 0 ? `sequência de ${data.streakTrend[i]}d` : "sem sessão"}`,
    }))

    return (
        <div className="stagger grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <KpiCard
                label="Horas de Estudo"
                value={fmtHours(data.totalHoursThisWeek)}
                verdict={
                    data.totalHoursThisWeek >= HOURS_GOAL
                        ? `Meta de ${HOURS_GOAL}h atingida.`
                        : `Faltam ${fmtHours(Math.round((HOURS_GOAL - data.totalHoursThisWeek) * 10) / 10)} para a meta de ${HOURS_GOAL}h.`
                }
                delta={hoursDelta}
                deltaHint="vs. início da semana"
                health={hoursHealth}
                icon={<Clock className="h-3.5 w-3.5" />}
            >
                <BarsChart data={hoursData} average={data.totalHoursThisWeek / 7} />
            </KpiCard>

            <KpiCard
                label="Dias Ativos"
                value={`${ratePercent}%`}
                verdict={`${activeDays} de 7 dias com ao menos uma sessão.`}
                health={rateHealth}
                icon={<Target className="h-3.5 w-3.5" />}
            >
                <DotsChart data={activityData} />
            </KpiCard>

            <KpiCard
                label="Sessões Realizadas"
                value={String(sessions)}
                verdict={
                    sessions === 0
                        ? "Nenhuma sessão concluída nesta semana."
                        : `Média de ${(sessions / 7).toFixed(1).replace(".", ",")} por dia.`
                }
                health={sessions >= 7 ? "good" : sessions > 0 ? "warn" : "bad"}
                icon={<CheckCircle2 className="h-3.5 w-3.5" />}
            >
                <BarsChart data={sessionData} showValues />
            </KpiCard>

            <KpiCard
                label="Sequência Atual"
                value={`${streak}d`}
                verdict={
                    streak === 0
                        ? "Sem sessão hoje — a sequência recomeça na próxima."
                        : streak >= bestStreak && streak > 1
                          ? "Melhor sequência da semana."
                          : `Dias seguidos estudando · melhor da semana: ${bestStreak}d.`
                }
                health={streakHealth}
                icon={<Flame className="h-3.5 w-3.5" />}
            >
                <DotsChart data={streakData} runLength={streak} />
            </KpiCard>
        </div>
    )
}
