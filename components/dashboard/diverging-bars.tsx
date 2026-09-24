"use client"

import { useRouter, useSearchParams } from "next/navigation"
import { ResponsiveBar } from "@nivo/bar"
import type { DivergingDatum } from "@/lib/api/dashboard"
import { ChartEmptyState } from "./chart-empty-state"
import { Button } from "@/components/ui/button"
import { useNivoTheme } from "@/lib/nivo-theme"
import { useReducedMotion } from "@/lib/use-reduced-motion"
import { SlidingIndicator } from "@/components/ui/sliding-indicator"
import { statusPalette } from "@/lib/chart-palette"

interface DivergingBarsProps {
    data: DivergingDatum[]
}

const PERIOD_OPTIONS: { label: string; value: string }[] = [
    { label: "7d", value: "7" },
    { label: "14d", value: "14" },
]

export function DivergingBars({ data }: DivergingBarsProps) {
    const reducedMotion = useReducedMotion()

    const router = useRouter()
    const searchParams = useSearchParams()
    const { theme, isDark } = useNivoTheme()

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

    // Today is not over, so its delta is not a failure: it gets its own neutral series and label.
    const chartData = filtered.map((d) => ({
        label: d.inProgress ? `${d.label} · hoje` : d.label,
        inProgress: d.inProgress ? 1 : 0,
        "Acima do Plano": !d.inProgress && d.delta > 0 ? d.delta : 0,
        "Abaixo do Plano": !d.inProgress && d.delta < 0 ? d.delta : 0,
        "Em andamento": d.inProgress ? d.delta : 0,
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
            <SlidingIndicator className="flex w-fit items-center gap-1" watch={period}>
                {PERIOD_OPTIONS.map((opt) => (
                    <Button
                        key={opt.value}
                        variant="ghost"
                        size="sm"
                        data-active={period === opt.value}
                        className={`relative z-10 h-6 px-2.5 text-xs num ${
                            period === opt.value ? "text-brand hover:bg-transparent" : "text-muted-foreground"
                        }`}
                        onClick={() => setPeriod(opt.value)}
                    >
                        {opt.label}
                    </Button>
                ))}
            </SlidingIndicator>

            <div className="h-72 w-full">
                <ResponsiveBar
                    data={chartData}
                    theme={theme}
                    keys={["Acima do Plano", "Abaixo do Plano", "Em andamento"]}
                    indexBy="label"
                    margin={{ top: 20, right: 20, bottom: 60, left: 56 }}
                    padding={0.3}
                    valueScale={{ type: "linear", min: -bound, max: bound }}
                    indexScale={{ type: "band", round: true }}
                    colors={({ id }) =>
                        id === "Acima do Plano"
                            ? statusPalette(isDark).good
                            : id === "Em andamento"
                              ? "var(--muted-foreground)"
                              : statusPalette(isDark).critical
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
                    animate={!reducedMotion}
                    tooltip={({ data: d }) => {
                        const item = d as unknown as typeof chartData[0]
                        const delta = item.delta
                        return (
                            <div className="rounded-md border bg-popover px-3 py-1.5 text-xs shadow-md space-y-0.5">
                                <p className="font-semibold text-popover-foreground">{item.label}</p>
                                {item.inProgress === 1 && (
                                    <p className="text-muted-foreground">Em andamento — o dia de hoje ainda não acabou.</p>
                                )}
                                <p className="text-muted-foreground">
                                    Diferença:{" "}
                                    <span
                                        className={
                                            delta >= 0
                                                ? "text-success font-bold"
                                                : "text-danger font-bold"
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
