"use client"

import { useRouter, useSearchParams } from "next/navigation"
import { ResponsiveBar } from "@nivo/bar"
import type { DivergingDatum } from "@/lib/api/dashboard"
import { ChartEmptyState } from "./chart-empty-state"
import { Button } from "@/components/ui/button"
import { useNivoTheme } from "@/lib/nivo-theme"

interface DivergingBarsProps {
    data: DivergingDatum[]
}

const PERIOD_OPTIONS: { label: string; value: string }[] = [
    { label: "7d", value: "7" },
    { label: "14d", value: "14" },
]

export function DivergingBars({ data }: DivergingBarsProps) {
    const router = useRouter()
    const searchParams = useSearchParams()
    const { theme } = useNivoTheme()

    // URL-Driven State per spec
    const period = searchParams.get("period") ?? "14"

    function setPeriod(value: string) {
        const params = new URLSearchParams(searchParams.toString())
        params.set("period", value)
        router.replace(`?${params.toString()}`, { scroll: false })
    }

    const periodDays = parseInt(period, 10)
    const filtered = (data ?? []).slice(-periodDays)

    if (!filtered || filtered.length === 0) {
        return (
            <ChartEmptyState
                title="Sem histórico de hábitos"
                description="Complete sessões de estudo para ver a consistência diária."
            />
        )
    }

    const chartData = filtered.map((d) => ({
        label: d.label,
        "Acima do Plano": d.delta > 0 ? d.delta : 0,
        "Abaixo do Plano": d.delta < 0 ? d.delta : 0,
        completed: d.completed,
        planned: d.planned,
        delta: d.delta,
    }))

    const allDeltas = filtered.map((d) => d.delta)
    const maxDelta = Math.max(60, ...allDeltas)
    const minDelta = Math.min(-60, ...allDeltas)
    const bound = Math.max(Math.abs(maxDelta), Math.abs(minDelta)) + 20

    return (
        <div className="space-y-3">
            {/* URL-driven period filter */}
            <div className="flex items-center gap-1.5">
                {PERIOD_OPTIONS.map((opt) => (
                    <Button
                        key={opt.value}
                        variant={period === opt.value ? "default" : "outline"}
                        size="sm"
                        className="h-6 px-2 text-xs"
                        onClick={() => setPeriod(opt.value)}
                    >
                        {opt.label}
                    </Button>
                ))}
            </div>

            <div className="h-72 w-full">
                <ResponsiveBar
                    data={chartData}
                    theme={theme}
                    keys={["Acima do Plano", "Abaixo do Plano"]}
                    indexBy="label"
                    margin={{ top: 20, right: 20, bottom: 60, left: 56 }}
                    padding={0.3}
                    valueScale={{ type: "linear", min: -bound, max: bound }}
                    indexScale={{ type: "band", round: true }}
                    colors={({ id }) =>
                        id === "Acima do Plano" ? "#10b981" : "#ef4444"
                    }
                    borderRadius={3}
                    axisLeft={{
                        tickSize: 0,
                        tickPadding: 8,
                        format: (v) => `${v}m`,
                    }}
                    axisBottom={{
                        tickSize: 4,
                        tickPadding: 6,
                        tickRotation: -35,
                    }}
                    enableGridY={true}
                    gridYValues={[-Math.round(bound / 2), 0, Math.round(bound / 2)]}
                    enableLabel={false}
                    animate={true}
                    tooltip={({ data: d }) => {
                        const item = d as unknown as typeof chartData[0]
                        const delta = item.delta
                        return (
                            <div className="rounded-md border bg-popover px-3 py-1.5 text-xs shadow-md space-y-0.5">
                                <p className="font-semibold text-popover-foreground">{item.label}</p>
                                <p className="text-muted-foreground">
                                    Diferença:{" "}
                                    <span
                                        className={
                                            delta >= 0
                                                ? "text-emerald-500 font-bold"
                                                : "text-red-500 font-bold"
                                        }
                                    >
                                        {delta > 0 ? "+" : ""}
                                        {delta} min
                                    </span>
                                </p>
                                <p className="text-muted-foreground">
                                    Estudado: {item.completed}m / Planejado: {item.planned}m
                                </p>
                            </div>
                        )
                    }}
                />
            </div>
        </div>
    )
}
