"use client"

import { ResponsiveLine } from "@nivo/line"
import { TrendingUp, TrendingDown, Clock, CheckCircle2, Target, Flame } from "lucide-react"
import { Card, CardContent, CardHeader, CardDescription } from "@/components/ui/card"
import type { SparklineKpis } from "@/lib/api/dashboard"
import { useNivoTheme } from "@/lib/nivo-theme"

// ─── Mini Sparkline (axis-free, per spec) ─────────────────────────────────────

function Sparkline({ data, color }: { data: number[]; color: string }) {
    const { theme } = useNivoTheme()
    const chartData = [
        {
            id: "trend",
            data: data.map((y, i) => ({ x: i, y })),
        },
    ]
    return (
        <div className="h-10 w-full">
            <ResponsiveLine
                data={chartData}
                theme={theme}
                enableGridX={false}
                enableGridY={false}
                axisBottom={null}
                axisLeft={null}
                enablePoints={false}
                colors={[color]}
                lineWidth={2}
                curve="monotoneX"
                enableArea={true}
                areaOpacity={0.12}
                isInteractive={false}
                animate={false}
                margin={{ top: 4, right: 4, bottom: 4, left: 4 }}
            />
        </div>
    )
}

// ─── Single KPI Card ──────────────────────────────────────────────────────────

interface KpiCardProps {
    label: string
    value: string
    trend: number[]
    delta?: number | null
    color: string
    icon: React.ReactNode
    health: "good" | "warn" | "bad" | "neutral"
}

const healthColor: Record<KpiCardProps["health"], string> = {
    good: "text-emerald-500",
    warn: "text-amber-500",
    bad: "text-red-500",
    neutral: "text-muted-foreground",
}

const healthDot: Record<KpiCardProps["health"], string> = {
    good: "bg-emerald-500",
    warn: "bg-amber-500",
    bad: "bg-red-500",
    neutral: "bg-muted-foreground",
}

function KpiCard({ label, value, trend, delta, color, icon, health }: KpiCardProps) {
    const isUp = delta !== null && delta !== undefined && delta >= 0
    const TrendIcon = isUp ? TrendingUp : TrendingDown

    return (
        <Card className="border-border/60 bg-card shadow-xs overflow-hidden">
            <CardHeader className="p-4 pb-0">
                <div className="flex items-center justify-between">
                    <CardDescription className="text-[10px] uppercase font-semibold tracking-wider text-muted-foreground">
                        {label}
                    </CardDescription>
                    <div className="flex items-center gap-1.5">
                        {/* Progressive Disclosure health dot — visible immediately */}
                        <span
                            className={`h-2 w-2 rounded-full ${healthDot[health]}`}
                            title={health === "good" ? "Saudável" : health === "warn" ? "Atenção" : health === "bad" ? "Crítico" : ""}
                        />
                        <div className="rounded-md bg-muted p-1 text-muted-foreground">{icon}</div>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="p-4 pt-2">
                <div className="flex items-end justify-between gap-2">
                    <span className="text-2xl font-bold tracking-tight">{value}</span>
                    {delta !== null && delta !== undefined && (
                        <span className={`flex items-center gap-0.5 text-xs font-medium ${healthColor[health]}`}>
                            <TrendIcon className="h-3 w-3" />
                            {Math.abs(delta)}%
                        </span>
                    )}
                </div>
                {/* Axis-free sparkline per spec */}
                <Sparkline data={trend} color={color} />
            </CardContent>
        </Card>
    )
}

// ─── Exported Component ───────────────────────────────────────────────────────

interface SparklineKpisProps {
    data: SparklineKpis
}

export function SparklineKpiCards({ data }: SparklineKpisProps) {
    const ratePercent = Math.round(data.sessionCompletionRate * 100)
    const rateHealth: KpiCardProps["health"] =
        ratePercent >= 70 ? "good" : ratePercent >= 40 ? "warn" : "bad"

    const streakHealth: KpiCardProps["health"] =
        data.currentStreak >= 5 ? "good" : data.currentStreak >= 2 ? "warn" : "bad"

    const hoursHealth: KpiCardProps["health"] =
        data.totalHoursThisWeek >= 10 ? "good" : data.totalHoursThisWeek >= 5 ? "warn" : "bad"

    // Approximate week-over-week change: last 3 days vs first 3 days
    const last3 = data.totalHoursTrend.slice(4).reduce((a, b) => a + b, 0)
    const first3 = data.totalHoursTrend.slice(0, 3).reduce((a, b) => a + b, 0)
    const hoursDelta =
        first3 > 0 ? Math.round(((last3 - first3) / first3) * 100) : null

    return (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <KpiCard
                label="Horas de Estudo"
                value={`${data.totalHoursThisWeek}h`}
                trend={data.totalHoursTrend}
                delta={hoursDelta}
                color="#6366f1"
                icon={<Clock className="h-3.5 w-3.5" />}
                health={hoursHealth}
            />
            <KpiCard
                label="Taxa de Conclusão"
                value={`${ratePercent}%`}
                trend={data.completionRateTrend.map((v) => v * 100)}
                delta={null}
                color="#10b981"
                icon={<Target className="h-3.5 w-3.5" />}
                health={rateHealth}
            />
            <KpiCard
                label="Sessões Realizadas"
                value={String(data.sessionsCompletedThisWeek)}
                trend={data.sessionsCompletedTrend}
                delta={null}
                color="#f59e0b"
                icon={<CheckCircle2 className="h-3.5 w-3.5" />}
                health={data.sessionsCompletedThisWeek > 0 ? "good" : "bad"}
            />
            <KpiCard
                label="Sequência Atual"
                value={`${data.currentStreak}d`}
                trend={data.streakTrend}
                delta={null}
                color="#ef4444"
                icon={<Flame className="h-3.5 w-3.5" />}
                health={streakHealth}
            />
        </div>
    )
}
